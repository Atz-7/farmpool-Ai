from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import User, Role

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(p: str) -> str: return pwd.hash(p)
def verify_password(p: str, h: str) -> bool: return pwd.verify(p, h)

def make_token(user: User) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.token_minutes)
    return jwt.encode({"sub": str(user.id), "role": user.role.value, "exp": exp},
                      settings.jwt_secret, algorithm=settings.jwt_algorithm)

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user = db.get(User, int(data["sub"]))
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid token")
    if not user: raise HTTPException(401, "User not found")
    return user

def require_role(*roles: Role):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, f"Requires role: {', '.join(r.value for r in roles)}")
        return user
    return dep
