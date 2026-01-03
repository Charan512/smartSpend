import io
import csv
import json
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from passlib.context import CryptContext
from . import models
from .nlp import detect_anomaly, predict_monthly_total
from .models import Goal, Category, Budget, User, Expense, ChatHistory, MonthlySummary  
from .schemas import GoalCreate, ExpenseQuick
from dateutil import parser as date_parser
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
import numpy as np
from collections import defaultdict
from pandas.errors import OutOfBoundsDatetime

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_CATEGORY_PERCENTAGES = {
    "Food": 0.4, "Shopping": 0.2, "Transport": 0.1,
    "Entertainment": 0.1, "Bills": 0.2, "Other": 0.1
}

# -----------------------------
# Password helpers
# -----------------------------
def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt. Bcrypt automatically handles truncation at 72 bytes."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash. Bcrypt handles truncation automatically."""
    return pwd_context.verify(plain_password, hashed_password)

# -----------------------------
# User CRUD
# -----------------------------
def create_user(db: Session, name: str, email: str, monthly_budget: float, password: str):
    hashed_password = get_password_hash(password)
    db_user = User(
        name=name, email=email, monthly_budget=monthly_budget, password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    return user

# -----------------------------
# Expenses
# -----------------------------
MAX_EXPENSE_AMOUNT = 100_000

def create_expense(db: Session, user_id: int, amount: float, category: str, description: str, date=None, merchant=None):
    if not (0 < amount <= MAX_EXPENSE_AMOUNT):
        raise ValueError(f"Invalid amount: {amount}.")

    category_name = (category or "Other").strip()
    cat_obj = get_category_by_name(db, category_name)
    if not cat_obj:
        cat_obj = create_category(db, name=category_name)

    exp = Expense(
        user_id=user_id,
        amount=amount,
        category=category_name,
        description=description[:255] if description else None,
        date=date or datetime.utcnow(),
        merchant=merchant[:100] if merchant else None
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return exp

def list_expenses(db: Session, user_id: int):
    return db.query(Expense).filter(Expense.user_id == user_id).all()

# -----------------------------
# Summaries
# -----------------------------
# Note: get_monthly_summary is defined later (line 512) with enhanced functionality

def get_total_expenses(db: Session, user_id: int, category_name: str, start_date: datetime, end_date: datetime):
    return db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.category == category_name,
        Expense.date >= start_date,
        Expense.date <= end_date
    ).scalar() or 0.0

def get_monthly_totals(db: Session, user_id: int):
    start = datetime.today().replace(day=1)
    totals = db.query(Expense.category, func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.date >= start
    ).group_by(Expense.category).all()
    return dict(totals)

def get_budget_limit(db: Session, user_id: int, category_name: str):
    budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category == category_name
    ).first()
    return budget.monthly_limit if budget else 0.0

def get_user_monthly_budget(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    return user.monthly_budget if user else 0.0

# -----------------------------
# Categories
# -----------------------------
def create_category(db: Session, name: str, keywords: str = ""):
    db_category = Category(name=name, keywords=keywords)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_categories(db: Session):
    return db.query(Category).all()

def get_category_by_name(db: Session, name: str):
    return db.query(Category).filter(Category.name == name).first()
    
# -----------------------------
# Chat
# -----------------------------
def save_chat_history(db: Session, user_id: int, message: str, response: str):
    chat = ChatHistory(
        user_id=user_id,
        message=message,
        response=response,
        timestamp=datetime.utcnow()
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat

def get_chat_history(db: Session, user_id: int, limit: int = 50):
    return db.query(ChatHistory)\
             .filter(ChatHistory.user_id == user_id)\
             .order_by(ChatHistory.timestamp.desc())\
             .limit(limit).all()

# -----------------------------
# Goals
# -----------------------------
def create_or_update_goal(db: Session, goal: GoalCreate):
    existing = db.query(Goal).filter(
        Goal.user_id == goal.user_id,
        Goal.category == goal.category,
        Goal.period == goal.period
    ).first()

    if existing:
        existing.target_amount = goal.target_amount
        db.commit()
        db.refresh(existing)
        return existing

    new_goal = Goal(
        user_id=goal.user_id,
        category=goal.category.strip(),
        target_amount=goal.target_amount,
        period=goal.period,
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

def get_goals(db: Session, user_id: int):
    return db.query(Goal).filter(Goal.user_id == user_id).all()

# -----------------------------
# Import / Export
# -----------------------------
def import_csv(db: Session, user_id: int, file_bytes: bytes, alert_callback=None):
    text = file_bytes.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(text))
    next(reader, None)

    imported = 0
    skipped = 0

    for row in reader:
        if len(row) < 3:
            skipped += 1
            continue
        date_str, desc, amount_str = row[0].strip(), row[1].strip(), row[2].strip()

        try:
            amount = float(amount_str.replace("$", "").replace(",", ""))
        except ValueError:
            skipped += 1
            continue

        try:
            dt = date_parser.parse(date_str, dayfirst=False, fuzzy=True)
        except Exception:
            dt = datetime.utcnow()

        from . import nlp
        cat = getattr(nlp, "ml_classify_category", lambda t: "Other")(desc) or nlp.classify_category(desc)

        create_expense(db, user_id, amount, cat, desc, dt)
        imported += 1

    return {"imported": imported, "skipped": skipped}

# -----------------------------
# Analytics and Forecasting
# -----------------------------
def forecast_expenses(db: Session, user_id: int, months_ahead: int = 3):
    rows = db.query(Expense.date, Expense.amount).filter(
        Expense.user_id == user_id
    ).all()
    if not rows:
        return {"history": [], "forecast": []}

    monthly = defaultdict(float)
    for dt, amt in rows:
        try:
            key = dt.strftime("%Y-%m")
            monthly[key] += amt
        except Exception:
            continue

    monthly_series = sorted(monthly.items(), key=lambda x: x[0])
    history = [{"date": k, "amount": v} for k, v in monthly_series]

    if not monthly_series:
        return {"history": history, "forecast": []}

    try:
        dates = pd.to_datetime([k for k, _ in monthly_series], format="%Y-%m", errors="coerce")
        values = [v for _, v in monthly_series]
        ts = pd.Series(values, index=dates).dropna()
        ts = ts.sort_index()
    except OutOfBoundsDatetime:
        return {"history": history, "forecast": [], "error": "Invalid date range"}

    forecast_data = []
    try:
        if len(ts) >= 6:
            model = ARIMA(ts, order=(1, 1, 1))
            model_fit = model.fit()
            pred = model_fit.forecast(steps=months_ahead)
            for i, val in enumerate(pred):
                future_date = (ts.index[-1] + pd.DateOffset(months=i+1)).strftime("%Y-%m")
                forecast_data.append({"date": future_date, "predicted": float(val)})
        elif len(ts) >= 2:
            X = np.arange(len(ts)).reshape(-1, 1)
            y = ts.values
            model = LinearRegression().fit(X, y)
            future_X = np.arange(len(ts), len(ts) + months_ahead).reshape(-1, 1)
            preds = model.predict(future_X)
            for i, val in enumerate(preds):
                future_date = (ts.index[-1] + pd.DateOffset(months=i+1)).strftime("%Y-%m")
                forecast_data.append({"date": future_date, "predicted": float(val)})
    except Exception as e:
        return {"history": history, "forecast": [], "error": str(e)}

    return {"history": history, "forecast": forecast_data}
    
# -----------------------------
# Quick Expense
# -----------------------------
def add_expense_quick(db: Session, expense: ExpenseQuick):
    return create_expense(
        db,
        user_id=expense.user_id,
        amount=expense.amount,
        category=expense.category,
        description=expense.description,
        date=datetime.utcnow(),
        merchant=expense.merchant
    )

# -----------------------------
# Default budgets
# -----------------------------
def create_default_budgets(db: Session, user_id: int, total_budget: float):
    for cat, pct in DEFAULT_CATEGORY_PERCENTAGES.items():
        limit = total_budget * pct
        budget = Budget(user_id=user_id, category=cat, monthly_limit=limit)
        db.add(budget)
    db.commit()

# -----------------------------
# Anomaly check
# -----------------------------
def check_expense_anomaly(db: Session, user_id: int, category: str, amount: float):
    if detect_anomaly(db, user_id, category, amount):
        return f"⚠️ This ₹{amount:.2f} expense in {category} is unusually high compared to your recent history!"
    return ""

# -----------------------------
# Budget Optimizer
# -----------------------------
def get_user_budgets(db: Session, user_id: int) -> dict:
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    return {b.category: b.monthly_limit for b in budgets}

def get_budget_recommendation(db: Session, user_id: int) -> str:
    budgets = get_user_budgets(db, user_id)
    totals = get_monthly_totals(db, user_id)

    if not budgets:
        return "No budgets set. Please set category goals first."

    advice = []
    overspending = {}
    underspending = {}

    for cat, limit in budgets.items():
        spent = totals.get(cat, 0.0)

        if spent > limit:
            overspending[cat] = spent - limit
        elif spent < limit * 0.5:
            underspending[cat] = limit - spent
    
    for cat, over in overspending.items():
        advice.append(f"• You're ₹{over:.2f} over in {cat} — consider reducing.")

    for cat, surplus in underspending.items():
        advice.append(f"• {cat} has about ₹{surplus:.2f} unused — consider reallocating.")

    if not advice:
        return "✅ All categories are on track. Keep it up!"

    return "💡 Budget Advice:\n" + "\n".join(advice)

def optimize_budgets(db: Session, user_id: int, max_reduction_pct: float = 0.3) -> dict:
    budgets = get_user_budgets(db, user_id)
    if not budgets:
        return {"error": "No budgets found for user."}
    totals = get_monthly_totals(db, user_id)
    overs = {}
    surplus = {}
    
    for cat, limit in budgets.items():
        spent = totals.get(cat, 0.0)
        if spent > limit:
            overs[cat] = round(spent - limit, 2)
        else:
            available = max(0.0, limit - spent)
            max_reducible = round(limit * max_reduction_pct, 2)
            available_to_reallocate = round(min(available, max_reducible), 2)
            if available_to_reallocate > 0:
                surplus[cat] = available_to_reallocate

    total_overspent = sum(overs.values())
    total_surplus = sum(surplus.values())
    
    if total_overspent == 0:
        return {
            "summary": "No overspending detected — your budgets are well balanced!",
            "original_budgets": budgets,
            "current_spending": totals
        }

    if total_surplus == 0:
        return {
            "summary": f"Overspending total ₹{total_overspent:.2f} but no available surplus to reallocate. Consider increasing your overall budget.",
            "original_budgets": budgets,
            "current_spending": totals,
            "overspending": overs
        }
    suggested = budgets.copy()
    redistribution_ratio = min(1.0, total_surplus / total_overspent)
    
    # Reduce budgets with surplus
    for cat, avail in surplus.items():
        reduction = round(avail * redistribution_ratio, 2)
        suggested[cat] = round(suggested[cat] - reduction, 2)
    
    # Increase budgets for overspent categories
    for cat, over_amt in overs.items():
        increase = round(over_amt * redistribution_ratio, 2)
        suggested[cat] = round(suggested[cat] + increase, 2)

    # Generate human-readable summary
    summary_parts = []
    summary_parts.append(f"💰 Budget Optimization Results:")
    summary_parts.append(f"Total overspent: ₹{total_overspent:.2f}")
    summary_parts.append(f"Total available for reallocation: ₹{total_surplus:.2f}")
    summary_parts.append("")
    summary_parts.append("Suggested changes:")
    
    for cat in set(list(overs.keys()) + list(surplus.keys())):
        original = budgets[cat]
        new = suggested[cat]
        if new != original:
            change = new - original
            if change > 0:
                summary_parts.append(f"• {cat}: +₹{change:.2f} (₹{original:.2f} → ₹{new:.2f})")
            else:
                summary_parts.append(f"• {cat}: ₹{change:.2f} (₹{original:.2f} → ₹{new:.2f})")

    return {
        "original_budgets": budgets,
        "current_spending": totals,
        "overspending": overs,
        "available_surplus": surplus,
        "suggested_budgets": suggested,
        "summary": "\n".join(summary_parts)
    }
def get_expense_trends(db: Session, user_id: int, period: str = "daily"):
    """
    Returns historical expenses per category for last 30 days (grouped by date).
    """
    start_date = datetime.utcnow() - timedelta(days=30)

    query = db.query(
        func.date(models.Expense.date).label("day"),
        models.Expense.category,
        func.sum(models.Expense.amount).label("total")
    ).filter(
        models.Expense.user_id == user_id,
        models.Expense.date >= start_date
    ).group_by(
        "day", models.Expense.category
    ).order_by("day").all()

    trends = {}
    for day, cat, amt in query:
        trends.setdefault(cat, []).append({"date": str(day), "amount": float(amt)})
    return trends

def create_or_update_monthly_summary(db: Session, user_id: int, year: int, month: int, category_data: dict):
    """Create or update monthly summary data"""
    existing = db.query(MonthlySummary).filter(
        MonthlySummary.user_id == user_id,
        MonthlySummary.year == year,
        MonthlySummary.month == month
    ).first()

    total_spent = sum(category_data.values())
    
    if existing:
        existing.total_spent = total_spent
        existing.category_data = json.dumps(category_data)
    else:
        monthly_summary = MonthlySummary(
            user_id=user_id,
            year=year,
            month=month,
            total_spent=total_spent,
            category_data=json.dumps(category_data)
        )
        db.add(monthly_summary)
    
    db.commit()

def get_monthly_summaries(db: Session, user_id: int, year: int = None):
    """Get all monthly summaries for a user, optionally filtered by year"""
    query = db.query(MonthlySummary).filter(MonthlySummary.user_id == user_id)
    
    if year:
        query = query.filter(MonthlySummary.year == year)
    
    return query.order_by(MonthlySummary.year.desc(), MonthlySummary.month.desc()).all()

def get_monthly_summary_by_date(db: Session, user_id: int, year: int, month: int):
    """Get specific monthly summary"""
    return db.query(MonthlySummary).filter(
        MonthlySummary.user_id == user_id,
        MonthlySummary.year == year,
        MonthlySummary.month == month
    ).first()

# Update the existing get_monthly_summary to also save the data
def get_monthly_summary(db: Session, user_id: int):
    now = datetime.now()
    start = datetime(now.year, now.month, 1)
    end = datetime(now.year, now.month + 1, 1) if now.month < 12 else datetime(now.year + 1, 1, 1)

    expenses = db.query(Expense.category, func.sum(Expense.amount))\
                 .filter(Expense.user_id == user_id, Expense.date >= start, Expense.date < end)\
                 .group_by(Expense.category).all()

    total = sum([amt for _, amt in expenses])
    categories_dict = {cat: amt for cat, amt in expenses}
    
    # Get user's monthly budget
    user_budget = get_user_monthly_budget(db, user_id)
    remaining_budget = user_budget - total
    budget_usage_percent = (total / user_budget * 100) if user_budget > 0 else 0
    
    # Save to monthly summaries
    create_or_update_monthly_summary(db, user_id, now.year, now.month, categories_dict)
    
    summary = {
        "total": total, 
        "categories": categories_dict,
        "monthly_budget": user_budget,
        "remaining_budget": remaining_budget,
        "budget_usage_percent": round(budget_usage_percent, 2),
        "is_over_budget": remaining_budget < 0,
        "year": now.year,
        "month": now.month
    }
    return summary