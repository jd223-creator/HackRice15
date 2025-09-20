from sqlalchemy import Column, Integer, String, DateTime
from app.models.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    hashed_password = Column(String)
    country = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)