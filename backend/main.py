"""
RetinaDiet — Unified API  (main.py)
=====================================
Single FastAPI app on one port serving both:
  • /api/auth/*   — register, login, me
  • /api/reports/* — save / list / fetch reports
  • /api/diet/meal-plan — ML-powered KNN diet recommendations
  • /api/diet/dataset/info — dataset metadata

Run:
    uvicorn main:app --reload --port 5000
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime, timedelta, date
from bson import ObjectId
import motor.motor_asyncio
import bcrypt
import jwt
import os
import warnings
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import LabelEncoder
from dotenv import load_dotenv

load_dotenv()
warnings.filterwarnings("ignore", category=UserWarning)

# ─────────────────────────────────────────────────────────────────
#  App & Config
# ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RetinaDiet Unified API",
    description="Auth + Report Storage + ML Diet Recommendations — all on one port",
    version="2.0.0",
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
#  MongoDB
# ─────────────────────────────────────────────────────────────────
client  = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db      = client["retinadiet"]
users   = db["users"]
reports = db["reports"]

# ─────────────────────────────────────────────────────────────────
#  Stage-based recommendations  (outputs, never inputs)
# ─────────────────────────────────────────────────────────────────
STAGE_REC: dict[str, dict] = {
    "No retinopathy": {
        "recommended_exercises": ["Brisk Walking", "Cycling", "Yoga", "Swimming"],
        "foods_to_avoid": ["Sugary Foods", "Soft Drinks"],
        "exercise_note": (
            "No retinopathy detected. Maintain moderate exercise to manage "
            "blood sugar and prevent progression."
        ),
        "diet_note": (
            "Keep blood sugar stable. Limit sugary foods and soft drinks. "
            "Focus on whole grains, vegetables, and lean proteins."
        ),
    },
    "Mild Retinopathy": {
        "recommended_exercises": ["Brisk Walking", "Yoga", "Stretching"],
        "foods_to_avoid": ["Sugary Foods", "Refined Flour", "Soft Drinks"],
        "exercise_note": (
            "Low-to-moderate intensity exercises are safe. "
            "Avoid breath-holding or straining activities."
        ),
        "diet_note": (
            "Avoid refined carbs that spike blood sugar. Prioritise fibre-rich "
            "foods, omega-3 fats, and antioxidant-rich vegetables."
        ),
    },
    "Moderate Retinopathy": {
        "recommended_exercises": ["Yoga", "Stretching", "Brisk Walking"],
        "foods_to_avoid": ["Sugary Foods", "Refined Flour", "Processed Foods", "Soft Drinks"],
        "exercise_note": (
            "Stick to low-impact activities. Avoid high-intensity or contact "
            "sports that may raise intraocular pressure."
        ),
        "diet_note": (
            "Strictly avoid processed and refined foods. Emphasise leafy greens, "
            "berries, and foods rich in vitamins C and E."
        ),
    },
    "Severe Retinopathy": {
        "recommended_exercises": ["Stretching", "Yoga"],
        "foods_to_avoid": [
            "Sugary Foods", "Refined Flour", "Processed Foods",
            "Soft Drinks", "Deep Fried Items", "Excess Salt",
        ],
        "exercise_note": (
            "Only gentle, supervised exercise. Avoid Valsalva manoeuvres, "
            "heavy lifting, or head-down positions."
        ),
        "diet_note": (
            "Very strict diet control required. Avoid all fried, salty, and "
            "processed foods. Prioritise anti-inflammatory nutrition."
        ),
    },
    "Proliferative Retinopathy": {
        "recommended_exercises": ["Stretching"],
        "foods_to_avoid": [
            "Sugary Foods", "Refined Flour", "Processed Foods",
            "Soft Drinks", "Deep Fried Items", "Excess Salt",
        ],
        "exercise_note": (
            "Exercise only under medical supervision. High-intensity, anaerobic, "
            "or jarring activities are contraindicated due to haemorrhage risk."
        ),
        "diet_note": (
            "Strict medical nutrition therapy required. Eliminate all foods that "
            "cause glycaemic spikes or systemic inflammation."
        ),
    },
}

# ─────────────────────────────────────────────────────────────────
#  ML Model — trained at startup
# ─────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(os.path.dirname(__file__), "diabetic_retinopathy_diet_plan_10000.csv")

ML_FEATURES = [
    "Diabetic Retinopathy Stage",
    "Diet Preference",
    "Meal type",
    "Age Group",
    "Region",
    "BMI_cat",
    "Day of Week",
]

_le: dict[str, LabelEncoder] = {}
_knn: NearestNeighbors | None = None
_df_ex: pd.DataFrame | None = None


def _bmi_bucket(bmi: float | None) -> int:
    if bmi is None:
        return 1
    if bmi < 18.5:
        return 0
    if bmi < 25.0:
        return 1
    if bmi < 30.0:
        return 2
    return 3


def _safe_encode(le: LabelEncoder, value: str) -> int:
    classes = list(le.classes_)
    if value in classes:
        return int(le.transform([value])[0])
    v_low = value.strip().lower()
    for cls in classes:
        if v_low in cls.lower() or cls.lower() in v_low:
            return int(le.transform([cls])[0])
    return 0


# ── Diet safety word lists ────────────────────────────────────────
# Foods containing these words must never appear for the given diet.
_NONVEG_WORDS = {
    "mutton", "chicken", "fish", "egg", "prawn", "meat",
    "turkey", "lamb", "beef", "pork", "bacon", "tuna",
    "salmon", "sardine", "crab", "lobster", "shrimp",
}
_DAIRY_WORDS = {
    "milk", "paneer", "ghee", "butter", "curd", "yogurt",
    "yoghurt", "cheese", "cream", "lassi", "buttermilk",
    "kheer", "rabri", "raita", "mawa",
}


def _is_safe_for_diet(food: str, diet: str) -> bool:
    """Return False if the food contains any ingredient forbidden by the diet."""
    food_lower = food.lower()
    if diet in ("Vegetarian", "Vegan"):
        if any(w in food_lower for w in _NONVEG_WORDS):
            return False
    if diet == "Vegan":
        if any(w in food_lower for w in _DAIRY_WORDS):
            return False
    return True


def _train_model() -> None:
    global _le, _knn, _df_ex

    df = pd.read_csv(DATASET_PATH)
    df.columns = df.columns.str.strip()

    df["food_list"] = df["Recommended Food"].str.split(", ")
    df_ex = df.explode("food_list").rename(columns={"food_list": "Food"}).reset_index(drop=True)
    df_ex["BMI_cat"] = df_ex["BMI"].apply(_bmi_bucket)

    # Remove mislabelled rows where a forbidden food appears under the wrong diet
    before = len(df_ex)
    df_ex = df_ex[
        df_ex.apply(lambda r: _is_safe_for_diet(r["Food"], r["Diet Preference"]), axis=1)
    ].reset_index(drop=True)
    print(f"🧹  Cleaned {before - len(df_ex)} mislabelled rows from dataset")

    X = pd.DataFrame()
    for col in ML_FEATURES:
        le = LabelEncoder()
        X[col] = le.fit_transform(df_ex[col].astype(str))
        _le[col] = le

    knn = NearestNeighbors(n_neighbors=100, metric="hamming", algorithm="ball_tree")
    knn.fit(X)

    _knn = knn
    _df_ex = df_ex[
        ML_FEATURES
        + ["Food", "Calories(kcal)", "Carbohydrate(g)", "Proteins(g)", "Vitamins", "Minerals"]
    ].copy()

    print(
        f"✅  ML model trained — {len(df_ex):,} rows, "
        f"{df_ex['Food'].nunique()} unique foods"
    )


def _recommend(
    stage: str,
    diet: str,
    meal_type: str,
    day: str,
    age_group: str | None,
    region: str | None,
    bmi: float | None,
) -> dict:
    assert _knn is not None and _df_ex is not None

    ag = age_group or "36-45"
    rg = region    or "North"

    query = np.array([[
        _safe_encode(_le["Diabetic Retinopathy Stage"], stage),
        _safe_encode(_le["Diet Preference"],            diet),
        _safe_encode(_le["Meal type"],                  meal_type),
        _safe_encode(_le["Age Group"],                  ag),
        _safe_encode(_le["Region"],                     rg),
        _bmi_bucket(bmi),
        _safe_encode(_le["Day of Week"],                day),
    ]])

    _, indices = _knn.kneighbors(query)
    neighbours = _df_ex.iloc[indices[0]]

    mask = (
        (neighbours["Diabetic Retinopathy Stage"] == stage)
        & (neighbours["Diet Preference"]           == diet)
        & (neighbours["Meal type"]                 == meal_type)
    )
    filtered = neighbours[mask]

    if filtered.empty:
        filtered = _df_ex[
            (_df_ex["Diabetic Retinopathy Stage"] == stage)
            & (_df_ex["Diet Preference"]           == diet)
            & (_df_ex["Meal type"]                 == meal_type)
        ]

    # ── Hard safety net: strip any forbidden foods that slipped through ──
    filtered = filtered[
        filtered["Food"].apply(lambda f: _is_safe_for_diet(f, diet))
    ]

    if filtered.empty:
        return {
            "food": "Healthy Home-cooked Meal",
            "alternatives": [],
            "calories": 350, "carbs": 45, "proteins": 15,
            "vitamins": 8,   "minerals": 8,
        }

    top_foods = filtered["Food"].value_counts().head(3).index.tolist()
    row = filtered[filtered["Food"] == top_foods[0]].iloc[0]

    def _si(v):
        try: return int(v)
        except: return 0

    return {
        "food":         top_foods[0],
        "alternatives": top_foods[1:],
        "calories":     _si(row.get("Calories(kcal)")),
        "carbs":        _si(row.get("Carbohydrate(g)")),
        "proteins":     _si(row.get("Proteins(g)")),
        "vitamins":     _si(row.get("Vitamins")),
        "minerals":     _si(row.get("Minerals")),
    }


# ─────────────────────────────────────────────────────────────────
#  Startup — indexes + ML model
# ─────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await users.create_index("email", unique=True)
    await reports.create_index("user_id")
    await reports.create_index([("user_id", 1), ("generated_at", -1)])
    _train_model()

# ─────────────────────────────────────────────────────────────────
#  Auth helpers
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

async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return decode_token(creds.credentials)

def serialize(doc: dict) -> dict:
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
#  Auth Schemas
# ─────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name:     str      = Field(..., min_length=1, max_length=80)
    email:    EmailStr
    password: str      = Field(..., min_length=6)

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

# ─────────────────────────────────────────────────────────────────
#  Report Schemas
# ─────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────
#  Diet Schemas
# ─────────────────────────────────────────────────────────────────
class MealPlanRequest(BaseModel):
    retinopathy_stage: Literal[
        "No retinopathy", "Mild Retinopathy", "Moderate Retinopathy",
        "Severe Retinopathy", "Proliferative Retinopathy",
    ] = Field(..., example="Moderate Retinopathy")

    diet_preference: Literal["Vegetarian", "Vegan", "Non Vegetarian"] = Field(
        ..., example="Vegetarian"
    )

    meal_types: List[Literal["Breakfast", "Lunch", "Dinner", "Snacks"]] = Field(
        default=["Breakfast", "Lunch", "Dinner", "Snacks"],
    )

    plan_type: Literal["today", "tomorrow", "week"] = Field(default="today")

    age_group: Optional[Literal["18-25", "26-35", "36-45", "46-60", "60+"]] = None
    region:    Optional[Literal["North", "South", "East", "West", "Central"]] = None
    bmi:       Optional[float] = Field(None, ge=10.0, le=60.0)

# ─────────────────────────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────────────────────────
@app.get("/", tags=["Info"])
def root():
    return {"status": "running", "docs": "/docs"}

# ─────────────────────────────────────────────────────────────────
#  Auth Routes  — /api/auth/*
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
    token   = create_token({"id": user_id, "name": body.name, "email": body.email.lower()})
    return AuthResponse(
        token=token,
        user=UserOut(id=user_id, name=body.name, email=body.email.lower()),
    )


@app.post("/api/auth/login", response_model=AuthResponse, tags=["Auth"])
async def login(body: LoginRequest):
    user = await users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    token   = create_token({"id": user_id, "name": user["name"], "email": user["email"]})
    return AuthResponse(
        token=token,
        user=UserOut(id=user_id, name=user["name"], email=user["email"]),
    )


@app.get("/api/auth/me", response_model=UserOut, tags=["Auth"])
async def me(current_user: dict = Depends(get_current_user)):
    user = await users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(id=str(user["_id"]), name=user["name"], email=user["email"])

# ─────────────────────────────────────────────────────────────────
#  Report Routes  — /api/reports/*
# ─────────────────────────────────────────────────────────────────
@app.post("/api/reports", tags=["Reports"], status_code=status.HTTP_201_CREATED)
async def save_report(
    body: SaveReportRequest,
    current_user: dict = Depends(get_current_user),
):
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
        sort=[("generated_at", -1)],
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
        projection={
            "profile.stage": 1, "profile.diet": 1,
            "profile.planType": 1, "generated_at": 1,
        },
    )
    docs = await cursor.to_list(length=10)
    return {"reports": [serialize(d) for d in docs]}


@app.get("/api/reports/{report_id}", tags=["Reports"])
async def get_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(report_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    report = await reports.find_one({"_id": oid, "user_id": current_user["id"]})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": serialize(report)}

# ─────────────────────────────────────────────────────────────────
#  Diet Routes  — /api/diet/*
# ─────────────────────────────────────────────────────────────────
@app.get("/api/diet/info", tags=["Diet"])
def diet_info():
    if _df_ex is None:
        raise HTTPException(status_code=503, detail="ML model not yet loaded")
    df_orig = pd.read_csv(DATASET_PATH)
    return {
        "total_rows":         len(df_orig),
        "unique_foods":       int(_df_ex["Food"].nunique()),
        "retinopathy_stages": sorted(df_orig["Diabetic Retinopathy Stage"].dropna().unique().tolist()),
        "diet_preferences":   sorted(df_orig["Diet Preference"].dropna().unique().tolist()),
        "meal_types":         sorted(df_orig["Meal type"].dropna().unique().tolist()),
        "age_groups":         sorted(df_orig["Age Group"].dropna().unique().tolist()),
        "regions":            sorted(df_orig["Region"].dropna().unique().tolist()),
        "bmi_range": {
            "min": float(df_orig["BMI"].min()),
            "max": float(df_orig["BMI"].max()),
        },
        "stage_recommendations": {
            s: {
                "recommended_exercises": v["recommended_exercises"],
                "foods_to_avoid":        v["foods_to_avoid"],
            }
            for s, v in STAGE_REC.items()
        },
    }


@app.post("/api/diet/meal-plan", tags=["Diet"])
def generate_meal_plan(req: MealPlanRequest):
    if _knn is None:
        raise HTTPException(status_code=503, detail="ML model not yet ready")

    today = date.today()
    if req.plan_type == "today":
        target_days = [(today.strftime("%A"), today)]
    elif req.plan_type == "tomorrow":
        tmrw = today + timedelta(days=1)
        target_days = [(tmrw.strftime("%A"), tmrw)]
    else:
        target_days = [
            ((today + timedelta(days=i)).strftime("%A"), today + timedelta(days=i))
            for i in range(7)
        ]

    stage_info = STAGE_REC[req.retinopathy_stage]
    days_out   = []

    for day_name, day_date in target_days:
        meals_out   = []
        total_cal   = total_carbs = total_prot = total_vit = total_min = 0

        for meal_type in req.meal_types:
            rec = _recommend(
                stage     = req.retinopathy_stage,
                diet      = req.diet_preference,
                meal_type = meal_type,
                day       = day_name,
                age_group = req.age_group,
                region    = req.region,
                bmi       = req.bmi,
            )
            meals_out.append({
                "meal_type":        meal_type,
                "recommended_food": rec["food"],
                "alternatives":     rec["alternatives"],
                "calories_kcal":    rec["calories"],
                "carbohydrates_g":  rec["carbs"],
                "proteins_g":       rec["proteins"],
                "vitamins":         rec["vitamins"],
                "minerals":         rec["minerals"],
            })
            total_cal   += rec["calories"]
            total_carbs += rec["carbs"]
            total_prot  += rec["proteins"]
            total_vit   += rec["vitamins"]
            total_min   += rec["minerals"]

        days_out.append({
            "day_name":              day_name,
            "date":                  str(day_date),
            "meals":                 meals_out,
            "total_calories_kcal":   total_cal,
            "total_carbohydrates_g": total_carbs,
            "total_proteins_g":      total_prot,
            "total_vitamins":        total_vit,
            "total_minerals":        total_min,
        })

    return {
        "plan_type":       req.plan_type,
        "patient_profile": {
            "retinopathy_stage": req.retinopathy_stage,
            "diet_preference":   req.diet_preference,
            "meal_types":        req.meal_types,
            "age_group":         req.age_group,
            "region":            req.region,
            "bmi":               req.bmi,
        },
        "exercise_recommendation": {
            "recommended_exercises": stage_info["recommended_exercises"],
            "exercise_note":         stage_info["exercise_note"],
        },
        "diet_recommendation": {
            "foods_to_avoid": stage_info["foods_to_avoid"],
            "diet_note":      stage_info["diet_note"],
        },
        "days":    days_out,
        "message": "Meal plan generated successfully by ML model.",
    }