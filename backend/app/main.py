import json
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app import models, schemas, crud, database, nlp, ocr
from app.database import engine, SessionLocal
from app.websocket_manager import manager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio  
import os

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Expense Tracker API")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://smart-spend-j245.vercel.app"],  
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
    return {"message": "Smart Expense Tracker API is running"}

# --- Auth ---
@app.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = crud.create_user(db, user.name, user.email, user.monthly_budget, user.password)
    crud.create_default_budgets(db, new_user.id, user.monthly_budget)
    return {
        "user_id": new_user.id, 
        "email": new_user.email,
        "monthly_budget": new_user.monthly_budget
    }

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.authenticate_user(db, email=user.email, password=user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "user_id": db_user.id, 
        "email": db_user.email, 
        "monthly_budget": db_user.monthly_budget
    }

@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)
    
    db = None
    try:
        db = SessionLocal()
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
@app.post("/upload/receipt")
async def upload_receipt(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    try:
        text = ocr.extract_text_from_bytes(contents)
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload/csv")
async def upload_csv(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    return crud.import_csv(db, user_id, contents)

# --- Expenses & Goals ---
@app.post("/expense/quick", response_model=schemas.ExpenseOut)
def quick_expense(expense: schemas.ExpenseQuick, db: Session = Depends(get_db)):
    return crud.add_expense_quick(db, expense)

@app.post("/goals", response_model=schemas.GoalOut)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(get_db)):
    return crud.create_or_update_goal(db, goal)

@app.get("/goals/{user_id}", response_model=List[schemas.GoalOut])
def list_goals(user_id: int, db: Session = Depends(get_db)):
    return crud.get_goals(db, user_id)

@app.get("/monthly_summary/{user_id}")
def get_monthly_summary_route(user_id: int, db: Session = Depends(get_db)):
    try:
        return crud.get_monthly_summary(db, user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching monthly summary: {str(e)}")

@app.get("/forecast_expenses/{user_id}")
def forecast_expenses_route(user_id: int, months: int = 3, db: Session = Depends(get_db)):
    return crud.forecast_expenses(db, user_id, months)

@app.get("/budget/optimize/{user_id}")
def budget_optimize(user_id: int, db: Session = Depends(get_db)):
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

scheduler = AsyncIOScheduler()
scheduler.add_job(check_budgets_and_goals, 'interval', hours=1)

# --- SINGLE startup_event function ---
@app.on_event("startup")
async def startup_event():
    # Download spaCy model if not present
    try:
        from download_models import download_spacy_model
        download_spacy_model()
    except Exception as e:
        print(f"spaCy model download error: {e}")
    
    # Start scheduler
    scheduler.start()
    
    # Initialize categories
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

# --- Monthly History ---
@app.get("/monthly_history/{user_id}")
def get_monthly_history(user_id: int, year: int = None, db: Session = Depends(get_db)):
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
def get_monthly_data(user_id: int, year: int, month: int, db: Session = Depends(get_db)):
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

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()