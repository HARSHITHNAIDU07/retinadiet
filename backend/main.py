from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import motor.motor_asyncio
import bcrypt
import jwt
import os
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────────────────────────
#  App & Config
# ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RetinaDiet API",
    description="Diabetic Retinopathy Diet Assistant — Auth + Report Storage",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URI   = os.getenv("MONGO_URI", "mongodb://localhost:27017/retinadiet")
JWT_SECRET  = os.getenv("JWT_SECRET", "retinadiet_secret_2024")
JWT_ALGO    = "HS256"
JWT_EXPIRES = 7  # days

# ─────────────────────────────────────────────────────────────────
#  MongoDB (async via Motor)
# ─────────────────────────────────────────────────────────────────
client   = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db       = client["retinadiet"]
users    = db["users"]
reports  = db["reports"]

@app.on_event("startup")
async def create_indexes():
    await users.create_index("email", unique=True)
    await reports.create_index("user_id")
    await reports.create_index([("user_id", 1), ("generated_at", -1)])

# ─────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────
security = HTTPBearer()

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(12)).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(days=JWT_EXPIRES)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGO)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    return decode_token(creds.credentials)

def serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings for JSON serialisation."""
    if doc is None:
        return None
    doc = dict(doc)
    for key, val in doc.items():
        if isinstance(val, ObjectId):
            doc[key] = str(val)
        elif isinstance(val, datetime):
            doc[key] = val.isoformat()
        elif isinstance(val, dict):
            doc[key] = serialize(val)
        elif isinstance(val, list):
            doc[key] = [serialize(i) if isinstance(i, dict) else i for i in val]
    return doc

# ─────────────────────────────────────────────────────────────────
#  Schemas
# ─────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:     str        = Field(..., min_length=1, max_length=80)
    email:    EmailStr
    password: str        = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class UserOut(BaseModel):
    id:    str
    name:  str
    email: str

class AuthResponse(BaseModel):
    token: str
    user:  UserOut

# ── Report sub-schemas ────────────────────────────────────────────
class MealItem(BaseModel):
    type:     str
    food:     str
    calories: int
    carbs:    int
    protein:  int

class DayPlan(BaseModel):
    dayName:  str
    date:     str
    totalCal: int
    meals:    List[MealItem]

class PlanData(BaseModel):
    exercises: List[str]
    avoid:     List[str]
    days:      List[DayPlan]

class ProfileData(BaseModel):
    stage:    str
    diet:     str
    meals:    List[str]
    planType: str
    age:      Optional[str] = None
    region:   Optional[str] = None
    bmi:      Optional[str] = None
    language: Optional[str] = None

class SaveReportRequest(BaseModel):
    profile: ProfileData
    plan:    PlanData

class ReportSummary(BaseModel):
    id:           str
    stage:        str
    diet:         str
    planType:     str
    generated_at: str

# ─────────────────────────────────────────────────────────────────
#  Auth Routes
# ─────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=AuthResponse, tags=["Auth"],
          status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    if await users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "name":       body.name.strip(),
        "email":      body.email.lower(),
        "password":   hash_password(body.password),
        "created_at": datetime.utcnow(),
    }
    result  = await users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_token({"id": user_id, "name": body.name, "email": body.email.lower()})
    return AuthResponse(
        token=token,
        user=UserOut(id=user_id, name=body.name, email=body.email.lower())
    )


@app.post("/api/auth/login", response_model=AuthResponse, tags=["Auth"])
async def login(body: LoginRequest):
    user = await users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_token({"id": user_id, "name": user["name"], "email": user["email"]})
    return AuthResponse(
        token=token,
        user=UserOut(id=user_id, name=user["name"], email=user["email"])
    )


@app.get("/api/auth/me", response_model=UserOut, tags=["Auth"])
async def me(current_user: dict = Depends(get_current_user)):
    user = await users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"])


# ─────────────────────────────────────────────────────────────────
#  Report Routes
# ─────────────────────────────────────────────────────────────────

@app.post("/api/reports", tags=["Reports"], status_code=status.HTTP_201_CREATED)
async def save_report(body: SaveReportRequest, current_user: dict = Depends(get_current_user)):
    doc = {
        "user_id":      current_user["id"],
        "profile":      body.profile.dict(),
        "plan":         body.plan.dict(),
        "generated_at": datetime.utcnow(),
    }
    result = await reports.insert_one(doc)
    return {"message": "Report saved", "reportId": str(result.inserted_id)}


@app.get("/api/reports/latest", tags=["Reports"])
async def get_latest_report(current_user: dict = Depends(get_current_user)):
    report = await reports.find_one(
        {"user_id": current_user["id"]},
        sort=[("generated_at", -1)]
    )
    if not report:
        raise HTTPException(status_code=404, detail="No reports found")
    return {"report": serialize(report)}


@app.get("/api/reports", tags=["Reports"])
async def list_reports(current_user: dict = Depends(get_current_user)):
    cursor = reports.find(
        {"user_id": current_user["id"]},
        sort=[("generated_at", -1)],
        limit=10,
        projection={"profile.stage": 1, "profile.diet": 1, "profile.planType": 1, "generated_at": 1}
    )
    docs = await cursor.to_list(length=10)
    return {"reports": [serialize(d) for d in docs]}


@app.get("/api/reports/{report_id}", tags=["Reports"])
async def get_report(report_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID")

    report = await reports.find_one({"_id": oid, "user_id": current_user["id"]})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": serialize(report)}


# ─────────────────────────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────────────────────────
@app.get("/", tags=["Info"])
def root():
    return {"status": "running", "docs": "/docs"}
