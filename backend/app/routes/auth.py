from decouple import config
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
import bcrypt
import jwt

from app.models.database import get_db
from app.models.user import User

router = APIRouter()
security = HTTPBearer()

# Configuration
SECRET_KEY = config("SECRET_KEY", default="dev-do-not-use")
ALGORITHM = config("ALGORITHM", default="HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = config("ACCESS_TOKEN_EXPIRE_MINUTES", cast=int, default=60)

# Pydantic models for request/response
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str
    country: str = "US"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    country: str
    created_at: datetime

    class Config:
        from_attributes = True

# Utility functions
def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Extract user from JWT token"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

# Routes
@router.post("/register", response_model=Token)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    
    db_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
        country=user_data.country
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "name": db_user.name,
            "country": db_user.country
        }
    }

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    
    # Find user
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "country": user.country
        }
    }

@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_user_from_token)):
    """Get current user profile"""
    return current_user

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_user_from_token)):
    """Get current user info with transaction stats"""
    # You could add transaction statistics here
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "country": current_user.country,
        "member_since": current_user.created_at,
        "status": "active"
    }

# Demo endpoint for testing
@router.get("/demo-users")
async def create_demo_users(db: Session = Depends(get_db)):
    """Create demo users for testing (hackathon only!)"""
    
    demo_users = [
        {"email": "john@example.com", "name": "John Doe", "password": "password123", "country": "US"},
        {"email": "maria@example.com", "name": "Maria Garcia", "password": "password123", "country": "MX"},
        {"email": "james@example.com", "name": "James Smith", "password": "password123", "country": "PH"}
    ]
    
    created_users = []
    
    for user_data in demo_users:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing_user:
            hashed_password = hash_password(user_data["password"])
            
            db_user = User(
                email=user_data["email"],
                name=user_data["name"],
                hashed_password=hashed_password,
                country=user_data["country"]
            )
            
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
            created_users.append({
                "email": db_user.email,
                "name": db_user.name,
                "country": db_user.country
            })
    
    return {
        "message": f"Created {len(created_users)} demo users",
        "users": created_users,
        "note": "All demo users have password: 'password123'"
    }