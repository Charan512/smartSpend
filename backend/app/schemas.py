from pydantic import BaseModel, Field, EmailStr, constr
from datetime import datetime
from typing import Optional, List, Dict, Any

# -----------------------------
# User Schemas
# -----------------------------
class UserCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=50)
    email: EmailStr
    password: constr(min_length=6)
    monthly_budget: float = Field(0.0, ge=0)


class UserLogin(BaseModel):
    email: EmailStr
    password: constr(min_length=6)

class UserOut(BaseModel):
    id: int
    email: str
    monthly_budget: float

    class Config:
        from_attributes = True


# -----------------------------
# Expense Schemas
# -----------------------------
class ExpenseIn(BaseModel):
    user_id: int
    text: str = Field(..., min_length=1)


class ExpenseOut(BaseModel):
    id: int
    user_id: int
    amount: float
    category: str
    description: Optional[str] = None
    date: datetime
    merchant: Optional[str] = None

    class Config:
        from_attributes = True


class ExpenseQuick(BaseModel):
    user_id: int
    amount: float = Field(..., gt=0)
    category: str
    description: Optional[str] = None
    merchant: Optional[str] = None


# -----------------------------
# Goal Schemas
# -----------------------------
class GoalCreate(BaseModel):
    user_id: int
    category: str
    target_amount: float = Field(..., ge=0)
    period: constr(pattern="^(monthly|weekly)$")


class GoalOut(BaseModel):
    id: int
    user_id: int
    category: str
    target_amount: float
    period: str

    class Config:
        from_attributes = True


# -----------------------------
# Category Schemas
# -----------------------------
class CategoryBase(BaseModel):
    name: str
    keywords: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# -----------------------------
# ChatHistory Schemas
# -----------------------------
class ChatHistoryBase(BaseModel):
    user_id: int
    message: str
    response: str

class ChatHistoryOut(BaseModel):
    id: int
    user_id: int
    message: str
    response: str
    timestamp: datetime

    class Config:
        from_attributes = True


# -----------------------------
# Response Schemas for Frontend
# -----------------------------
class MonthlySummaryOut(BaseModel):
    total: float
    categories: Dict[str, float]
    monthly_budget: Optional[float] = 0
    remaining_budget: Optional[float] = 0
    is_over_budget: Optional[bool] = False
    budget_usage_percent: Optional[float] = 0

class ForecastOut(BaseModel):
    history: List[Dict[str, Any]]
    forecast: List[Dict[str, Any]]

class BudgetOptimizeOut(BaseModel):
    summary: str
    recommendations: Optional[Dict[str, Any]] = None

class ReceiptUploadOut(BaseModel):
    amount: float
    category: str
    merchant: Optional[str] = None
    date: Optional[datetime] = None

# -----------------------------
# WebSocket Schemas
# -----------------------------
class WebSocketHistoryMessage(BaseModel):
    type: str = "history"
    data: List[Dict[str, Any]]

class WebSocketUpdateMessage(BaseModel):
    type: str = "update"
    data: str
    is_expense: bool = False

class WebSocketErrorMessage(BaseModel):
    type: str = "error"
    data: str