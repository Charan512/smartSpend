import re
from datetime import datetime, timedelta
from dateutil import parser
from sqlalchemy.orm import Session
import numpy as np
import spacy
import joblib
import pandas as pd

from . import crud
from . import models

# ==============================
# Load NLP + ML models
# ==============================
try:
    nlp_spacy = spacy.load("en_core_web_sm")
    print("✅ spaCy model loaded: en_core_web_sm")
except OSError:
    nlp_spacy = None
    print("⚠️ spaCy model not found. Some NLP features will be weaker.")

try:
    category_model = joblib.load("models/category_model.pkl")
    print("✅ ML Category Classifier loaded.")
except Exception:
    category_model = None
    print("⚠️ ML category model not found. Using keyword fallback.")


# ==============================
# --- Main Chat Processor ---
# ==============================
# app/nlp.py

def process_chat_message(db: Session, user_id: int, text: str):
    """The main 'brain' for handling user chat messages."""
    text_lower = text.lower()

    parsed = parse_expense_from_text(text)
    
    if parsed:
        try:
            exp = crud.create_expense(
                db, user_id, parsed['amount'], parsed['category'], text, 
                date=parsed.get('date'), merchant=parsed.get('merchant')
            )
            response_msg = f"✅ Added expense: ₹{exp.amount:.2f} for {exp.category}."
            
            anomaly_msg = crud.check_expense_anomaly(db, user_id, exp.category, exp.amount)
            if anomaly_msg:
                response_msg += f"\n{anomaly_msg}"
            
            return response_msg, True 
        except Exception as e:
            return f"Error adding expense: {str(e)}", False

    # Add budget queries
    if any(kw in text_lower for kw in ["how much", "summary", "total spending", "budget", "remaining"]):
        summary = crud.get_monthly_summary(db, user_id)
        response_msg = f"📊 Monthly Budget Overview:\n"
        response_msg += f"• Total spent: ₹{summary['total']:.2f}\n"
        response_msg += f"• Monthly budget: ₹{summary['monthly_budget']:.2f}\n"
        response_msg += f"• Remaining: ₹{summary['remaining_budget']:.2f}\n"
        response_msg += f"• Usage: {summary['budget_usage_percent']}%"
        
        if summary['is_over_budget']:
            response_msg += f"\n🚨 You're over budget by ₹{abs(summary['remaining_budget']):.2f}!"
        elif summary['budget_usage_percent'] > 80:
            response_msg += f"\n⚠️ You've used {summary['budget_usage_percent']}% of your budget."
            
        return response_msg, False


def parse_expense_from_text(text: str):
    """Extracts amount, category, date, and merchant from a text string."""
    amount = extract_amount(text)
    if amount is None:
        return None
    
    category = classify_category(text)
    date = extract_date(text) or datetime.utcnow()
    merchant = extract_merchant(text)
    
    return {"amount": amount, "category": category, "date": date, "merchant": merchant}


# ==============================
# --- Helper Functions ---
# ==============================

def extract_amount(text: str):
    if not text: return None
    if nlp_spacy:
        doc = nlp_spacy(text)
        for ent in doc.ents:
            if ent.label_ == "MONEY":
                try:
                    return float(re.sub(r'[^\d.]', '', ent.text))
                except (ValueError, TypeError):
                    continue
    
    match = re.search(r"(\d[\d,]*\.?\d*)", text)
    if match:
        try:
            return float(match.group(1).replace(",", ""))
        except (ValueError, TypeError):
            return None
    return None

def extract_date(text: str):
    txt = text.lower().strip()
    today = datetime.utcnow()

    if "yesterday" in txt: return today - timedelta(days=1)
    if "today" in txt: return today
    if "last week" in txt: return today - timedelta(days=7)
    
    try:
        if nlp_spacy:
            doc = nlp_spacy(text)
            for ent in doc.ents:
                if ent.label_ == "DATE":
                    parsed = parser.parse(ent.text, fuzzy=True, default=today)
                    if 2000 <= parsed.year <= today.year + 1:
                        return parsed
        
        # Fallback for formats spaCy might miss
        match = re.search(r"(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)", txt)
        if match:
             parsed = parser.parse(match.group(1), fuzzy=True, default=today)
             if 2000 <= parsed.year <= today.year + 1:
                return parsed
    except Exception:
        pass
    return None

def extract_merchant(text: str):
    if not text: return None
    if nlp_spacy:
        doc = nlp_spacy(text)
        for ent in doc.ents:
            if ent.label_ in ["ORG", "PERSON"]: # PERSON can sometimes be a small shop owner
                return ent.text.strip()
    
    match = re.search(r"\b(at|from|in)\s+([A-Z][\w\s'-]+)", text)
    if match:
        return match.group(2).strip()
    return None

def classify_category(text: str):
    if not text: return "Other"
    if category_model:
        try:
            return category_model.predict([text])[0]
        except Exception:
            pass

    t = text.lower()
    if any(word in t for word in ["food", "lunch", "coffee", "restaurant", "grocer", "meal", "swiggy", "zomato"]): return "Food"
    if any(word in t for word in ["bus", "taxi", "uber", "transport", "metro", "train", "ola"]): return "Transport"
    if any(word in t for word in ["shopping", "clothes", "mall", "store", "amazon", "flipkart", "myntra"]): return "Shopping"
    if any(word in t for word in ["bill", "electricity", "water", "internet", "rent", "phone"]): return "Bills"
    if any(word in t for word in ["movie", "cinema", "game", "entertainment", "netflix"]): return "Entertainment"
    return "Other"

# --- Anomaly detection ---
def detect_anomaly(db: Session, user_id: int, category: str, amount: float):
    expenses = db.query(models.Expense.amount).filter(
        models.Expense.user_id == user_id,
        models.Expense.category == category
    ).all()
    amounts = [float(e[0]) for e in expenses]

    if len(amounts) < 5:
        return False

    arr = np.array(amounts)
    mean, std = np.mean(arr), np.std(arr)
    if std > 0 and abs((amount - mean) / std) > 3: # Z-score outlier
        return True

    q1, q3 = np.percentile(arr, [25, 75])
    iqr = q3 - q1
    upper_bound = q3 + 1.5 * iqr
    if amount > upper_bound: # IQR outlier
        return True
        
    return False

# --- Monthly spending prediction (using the existing crud function for consistency) ---
def predict_monthly_total(db: Session, user_id: int):
    # This function now correctly points to the robust forecasting in crud.py
    forecast_data = crud.forecast_expenses(db, user_id, months_ahead=1)
    if forecast_data and forecast_data['forecast']:
        return forecast_data['forecast'][0]['predicted']
    
    # Fallback logic if forecast fails
    now = datetime.utcnow()
    start_month = now.replace(day=1)
    total_so_far = crud.get_monthly_totals(db, user_id)
    total_so_far = sum(total_so_far.values())
    days_passed = (now - start_month).days + 1

    if now.month == 12:
        next_month = start_month.replace(year=now.year + 1, month=1, day=1)
    else:
        next_month = start_month.replace(month=now.month + 1, day=1)

    days_in_month = (next_month - start_month).days
    predicted = (total_so_far / max(1, days_passed)) * days_in_month if days_passed > 0 else 0
    return float(predicted)
