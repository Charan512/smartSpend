import os
from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import database, crud, schemas

SECRET_KEY = os.environ.get("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Fix 5: Only allow the hardcoded dev fallback when ENVIRONMENT is *explicitly* "development".
# Any other value (staging, test, unset, production) must have JWT_SECRET configured.
# This prevents a misconfigured staging/test server from using the known dev secret.
_env = os.environ.get("ENVIRONMENT", "")
if not SECRET_KEY:
    if _env == "development":
        SECRET_KEY = "dev-secret-key-only-for-local-development"
        import warnings
        warnings.warn(
            "JWT_SECRET not set — using insecure dev fallback. "
            "Set JWT_SECRET in your .env file.",
            stacklevel=1,
        )
    else:
        raise RuntimeError(
            f"JWT_SECRET environment variable is REQUIRED (ENVIRONMENT='{_env}'). "
            "Set it in your .env file or environment."
        )

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> schemas.UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = crud.get_user_by_id(db, user_id=int(user_id))
    if user is None:
        raise credentials_exception
    return user
