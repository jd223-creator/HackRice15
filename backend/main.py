from decouple import config
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import engine, Base
from app.routes import auth, transactions, rates
from app.routes import ai


# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=config("APP_NAME", default="RemitEasy API"),
    version=config("APP_VERSION", default="1.0.0"),
    debug=config("DEBUG", cast=bool, default=False),
)

origins = config("CORS_ALLOW_ORIGINS", default="")
origins = origins.split(",") if origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(rates.router, prefix="/api/rates", tags=["rates"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

@app.get("/")
async def root():
    return {"message": "RemitEasy API - Low-fee remittance platform"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

