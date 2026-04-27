import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List
from datetime import datetime
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app import models, schemas, crud, database, nlp, ocr
from app.database import engine, SessionLocal
from app.websocket_manager import manager
from app.exceptions import (
    AppException, app_exception_handler, validation_exception_handler,
    sqlalchemy_exception_handler, generic_exception_handler, ResourceNotFoundError
)
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio  
import os
from app import auth
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

scheduler = AsyncIOScheduler()
should_run_scheduler = os.getenv("RUN_SCHEDULER", "true").lower() == "true"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown logic."""


    if should_run_scheduler:
        scheduler.add_job(check_budgets_and_goals, 'interval', hours=1)
        scheduler.start()
        print("✅ Scheduler started")
    else:
        print("ℹ️ Scheduler disabled (RUN_SCHEDULER=false)")

    db = SessionLocal()
    try:
        if not crud.get_categories(db):
            defaults = [
                ("Food", "food,restaurant,dinner,coffee"),
                ("Shopping", "shop,clothes,amazon,store"),
                ("Transport", "bus,train,taxi,uber"),
                ("Bills", "electricity,water,gas,internet"),
                ("Entertainment", "movie,netflix,game,concert"),
                ("Other", ""),
            ]
            for name, keywords in defaults:
                crud.create_category(db, name, keywords)
            print("✅ Default categories initialized")
    except Exception as e:
        print(f"Startup error: {e}")
    finally:
        db.close()

    yield  # App runs here

    # --- Shutdown ---
    if should_run_scheduler and scheduler.running:
        scheduler.shutdown()
        print("✅ Scheduler shut down")

app = FastAPI(title="Smart Expense Tracker API", lifespan=lifespan)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Register exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# --- CORS ---
env_origins = os.getenv("CORS_ORIGINS")
is_prod = os.getenv("ENVIRONMENT") == "production"

if env_origins:
    allowed_origins = [origin.strip() for origin in env_origins.split(",")]
elif not is_prod:
    # In development, we can be lax if no CORS_ORIGINS is set
    allowed_origins = ["*"]
else:
    # In production, we MUST have specific origins defined
    raise RuntimeError("CORS_ORIGINS environment variable is REQUIRED in production mode!")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)# --- DB dependency ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =============================================
# --- API Endpoints ---
# =============================================

@app.get("/")
def root():
    return {"message": "Smart Expense Tracker API is running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring and load balancers."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Smart Expense Tracker API"
    }

# --- Auth ---
@app.post("/register")
@limiter.limit("5/minute")  # Prevent spam registrations
def register(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Registration attempt for email: {user.email}")
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = crud.create_user(db, user.name, user.email, user.monthly_budget, user.password)
    crud.create_default_budgets(db, new_user.id, user.monthly_budget)
    logger.info(f"User registered successfully: {new_user.id}")
    
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    
    return {
        "user_id": new_user.id, 
        "email": new_user.email,
        "monthly_budget": new_user.monthly_budget,
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/login")
@limiter.limit("10/minute")  # Prevent brute force attacks
def login(request: Request, user: schemas.UserLogin, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for email: {user.email}")
    db_user = crud.authenticate_user(db, email=user.email, password=user.password)
    if not db_user:
        logger.warning(f"Failed login attempt for email: {user.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    logger.info(f"User logged in successfully: {db_user.id}")
    
    access_token = auth.create_access_token(data={"sub": str(db_user.id)})
    
    return {
        "user_id": db_user.id, 
        "email": db_user.email, 
        "monthly_budget": db_user.monthly_budget,
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int, token: str = None):
    # Validate token manually since Depends doesn't work perfectly with websockets
    db = None
    try:
        db = SessionLocal()
        if not token:
            await websocket.close(code=1008)
            return
            
        import jwt
        from app.auth import SECRET_KEY, ALGORITHM
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            token_user_id = payload.get("sub")
            if token_user_id is None or int(token_user_id) != user_id:
                await websocket.close(code=1008)
                return
        except jwt.PyJWTError:
            await websocket.close(code=1008)
            return
            
        await manager.connect(user_id, websocket)

        history = crud.get_chat_history(db, user_id, limit=5)
        history_data = []
        for h in history:
            # Simplified history format to avoid serialization issues
            history_data.append({
                "message": h.message,
                "response": h.response,
                "timestamp": h.timestamp.isoformat() if h.timestamp else None
            })
        await manager.send_personal_message(user_id, json.dumps({"type": "history", "data": history_data}))
    except Exception as e:
        await manager.send_personal_message(user_id, json.dumps({"type": "error", "data": f"History error: {str(e)}"}))
    finally:
        if db:
            db.close()
    
    try:
        while True:
            data = await websocket.receive_text() 
            db = None
            try:
                db = SessionLocal() 
                response_msg, is_expense = nlp.process_chat_message(db, user_id, data)
                crud.save_chat_history(db, user_id, data, response_msg)
                
                await manager.send_personal_message(user_id, json.dumps({
                    "type": "update", 
                    "data": response_msg, 
                    "is_expense": is_expense
                }))
                
            except Exception as e:
                await manager.send_personal_message(user_id, json.dumps({"type": "error", "data": str(e)}))
            finally:
                if db:
                    db.close()

    except WebSocketDisconnect:
        print(f"User {user_id} disconnected.")
        await manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket Error for {user_id}: {str(e)}")
        await manager.disconnect(user_id)

# --- Uploads ---
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@app.post("/upload/receipt")
async def upload_receipt(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    try:
        text = ocr.extract_text_from_bytes(contents)
        if not text or not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from receipt. Please ensure the image is clear.")
        
        parsed = nlp.parse_expense_from_text(text)
        if not parsed:
            raise HTTPException(status_code=400, detail="Could not extract expense details from receipt.")
        expense = crud.create_expense(db, user_id, parsed['amount'], parsed['category'], text, parsed.get('date'), parsed.get('merchant'))
        return {
            "amount": expense.amount,
            "category": expense.category,
            "merchant": expense.merchant,
            "date": expense.date.isoformat() if expense.date else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing receipt: {str(e)}")

@app.post("/upload/csv")
async def upload_csv(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size is {MAX_FILE_SIZE / 1024 / 1024}MB")
    
    # Validate file type
    if not file.filename or not (file.filename.endswith('.csv') or file.filename.endswith('.txt')):
        raise HTTPException(status_code=400, detail="Only CSV or TXT files are allowed")
    
    try:
        return crud.import_csv(db, user_id, contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing CSV: {str(e)}")

# --- Expenses & Goals ---
@app.get("/expenses/{user_id}", response_model=List[schemas.ExpenseOut])
def list_expenses(user_id: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    """Return all expenses for the authenticated user."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.list_expenses(db, user_id)

@app.post("/expense/quick", response_model=schemas.ExpenseOut)
def quick_expense(expense: schemas.ExpenseQuick, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != expense.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.add_expense_quick(db, expense)

@app.post("/goals", response_model=schemas.GoalOut)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != goal.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.create_or_update_goal(db, goal)

@app.get("/goals/{user_id}", response_model=List[schemas.GoalOut])
def list_goals(user_id: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_goals(db, user_id)

@app.get("/monthly_summary/{user_id}")
def get_monthly_summary_route(user_id: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        return crud.get_monthly_summary(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching monthly summary: {str(e)}")

@app.get("/forecast_expenses/{user_id}")
def forecast_expenses_route(user_id: int, months: int = 3, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.forecast_expenses(db, user_id, months)

@app.get("/budget/optimize/{user_id}")
def budget_optimize(user_id: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.optimize_budgets(db, user_id)

# --- Scheduler for alerts ---
async def check_budgets_and_goals():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        for user in users:
            try:
                summary = crud.get_monthly_summary(db, user.id)
                if summary and summary.get("is_over_budget"):
                    alert_msg = f"🚨 Budget Alert! You've exceeded your monthly budget by ₹{abs(summary.get('remaining_budget', 0)):.2f}"
                    print(f"User {user.id}: {alert_msg}")
                elif summary and summary.get("budget_usage_percent", 0) > 80:
                    alert_msg = f"⚠️ Budget Warning! You've used {summary.get('budget_usage_percent', 0)}% of your monthly budget"
                    print(f"User {user.id}: {alert_msg}")
            except Exception as e:
                print(f"Error checking budget for user {user.id}: {e}")
    except Exception as e:
        print(f"Scheduler error: {e}")
    finally:
        db.close()

# Scheduler and lifespan now handled in the lifespan context manager above

# --- Monthly History ---
@app.get("/monthly_history/{user_id}")
def get_monthly_history(user_id: int, year: int = None, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    """Get all monthly summaries for a user"""
    try:
        summaries = crud.get_monthly_summaries(db, user_id, year)
        
        result = []
        for summary in summaries:
            category_data = json.loads(summary.category_data) if summary.category_data else {}
            result.append({
                "year": summary.year,
                "month": summary.month,
                "total_spent": summary.total_spent,
                "categories": category_data,
                "month_name": datetime(summary.year, summary.month, 1).strftime('%B')
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching monthly history: {str(e)}")

@app.get("/monthly_data/{user_id}/{year}/{month}")
def get_monthly_data(user_id: int, year: int, month: int, db: Session = Depends(get_db), current_user: schemas.UserOut = Depends(auth.get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    """Get specific month data"""
    try:
        summary = crud.get_monthly_summary_by_date(db, user_id, year, month)
        
        if not summary:
            return {
                "year": year,
                "month": month,
                "total_spent": 0,
                "categories": {},
                "month_name": datetime(year, month, 1).strftime('%B')
            }
        
        category_data = json.loads(summary.category_data) if summary.category_data else {}
        return {
            "year": summary.year,
            "month": summary.month,
            "total_spent": summary.total_spent,
            "categories": category_data,
            "month_name": datetime(summary.year, summary.month, 1).strftime('%B')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching monthly data: {str(e)}")

# Shutdown is now handled in the lifespan context manager