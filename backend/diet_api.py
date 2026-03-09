"""
RetinaDiet – ML-Powered Diet Recommendation API  (diet_api.py)
================================================================
Uses a K-Nearest-Neighbours model trained on the diabetic
retinopathy dataset to recommend personalised meals.

Run:
    uvicorn diet_api:app --reload --port 8000

Then call the auth backend (main.py) on port 5000 and configure
VITE_DIET_API=http://localhost:8000 in your frontend env.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import date, timedelta
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import LabelEncoder
import os, warnings

warnings.filterwarnings("ignore", category=UserWarning)

# ─────────────────────────────────────────────────────────────────
#  App Setup
# ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="RetinaDiet – ML Diet Recommendation API",
    description=(
        "KNN-based personalised meal planner for diabetic retinopathy patients. "
        "Trains on the provided CSV at startup; no separate training step needed."
    ),
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────
#  Stage-based Recommendations  (outputs, never inputs)
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
#  ML Model – trained at startup
# ─────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(os.path.dirname(__file__), "diabetic_retinopathy_diet_plan_10000.csv")

FEATURE_COLS = [
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
        return 1  # Normal as default
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
        return le.transform([value])[0]
    # fuzzy fallback – pick class whose lowercased name matches best
    v_low = value.strip().lower()
    for cls in classes:
        if v_low in cls.lower() or cls.lower() in v_low:
            return le.transform([cls])[0]
    return 0


def _train_model() -> None:
    global _le, _knn, _df_ex

    df = pd.read_csv(DATASET_PATH)
    df.columns = df.columns.str.strip()

    # Explode comma-separated food lists → one row per food
    df["food_list"] = df["Recommended Food"].str.split(", ")
    df_ex = df.explode("food_list").rename(columns={"food_list": "Food"})
    df_ex = df_ex.reset_index(drop=True)
    df_ex["BMI_cat"] = df_ex["BMI"].apply(_bmi_bucket)

    # Fit one LabelEncoder per categorical feature
    X = pd.DataFrame()
    for col in FEATURE_COLS:
        le = LabelEncoder()
        X[col] = le.fit_transform(df_ex[col].astype(str))
        _le[col] = le

    # KNN with Hamming distance (works well for categorical data)
    knn = NearestNeighbors(n_neighbors=100, metric="hamming", algorithm="ball_tree")
    knn.fit(X)

    _knn = knn
    _df_ex = df_ex[
        FEATURE_COLS
        + ["Food", "Calories(kcal)", "Carbohydrate(g)", "Proteins(g)", "Vitamins", "Minerals"]
    ].copy()

    print(
        f"✅  ML model trained on {len(df_ex):,} rows  "
        f"({df['Recommended Food'].str.count(',').add(1).sum():,} food entries, "
        f"{df_ex['Food'].nunique()} unique foods)"
    )


@app.on_event("startup")
def startup() -> None:
    _train_model()


# ─────────────────────────────────────────────────────────────────
#  Recommendation Core
# ─────────────────────────────────────────────────────────────────
def _recommend(
    stage: str,
    diet: str,
    meal_type: str,
    day: str,
    age_group: str | None,
    region: str | None,
    bmi: float | None,
) -> dict:
    """
    1. Query KNN to find 100 neighbours closest to the user's profile.
    2. Among those neighbours, keep only rows matching (stage, diet, meal_type).
    3. Rank foods by frequency → return top-3 foods + nutrition of the #1 pick.
    4. If no neighbours match, fall back to the full dataset filtered by
       (stage, diet, meal_type).
    """
    assert _knn is not None and _df_ex is not None

    ag = age_group or "36-45"
    rg = region or "North"

    query = np.array(
        [[
            _safe_encode(_le["Diabetic Retinopathy Stage"], stage),
            _safe_encode(_le["Diet Preference"], diet),
            _safe_encode(_le["Meal type"], meal_type),
            _safe_encode(_le["Age Group"], ag),
            _safe_encode(_le["Region"], rg),
            _bmi_bucket(bmi),
            _safe_encode(_le["Day of Week"], day),
        ]]
    )

    _, indices = _knn.kneighbors(query)
    neighbours = _df_ex.iloc[indices[0]]

    # Strict filter inside neighbours
    mask = (
        (neighbours["Diabetic Retinopathy Stage"] == stage)
        & (neighbours["Diet Preference"] == diet)
        & (neighbours["Meal type"] == meal_type)
    )
    filtered = neighbours[mask]

    # Fallback: full dataset
    if filtered.empty:
        filtered = _df_ex[
            (_df_ex["Diabetic Retinopathy Stage"] == stage)
            & (_df_ex["Diet Preference"] == diet)
            & (_df_ex["Meal type"] == meal_type)
        ]

    if filtered.empty:
        return {
            "foods": ["Healthy Home-cooked Meal"],
            "calories": 350,
            "carbs": 45,
            "proteins": 15,
            "vitamins": 8,
            "minerals": 8,
        }

    top_foods = filtered["Food"].value_counts().head(3).index.tolist()
    chosen_food = top_foods[0]
    row = filtered[filtered["Food"] == chosen_food].iloc[0]

    def _safe_int(v):
        try:
            return int(v)
        except Exception:
            return 0

    return {
        "foods": top_foods,
        "food": chosen_food,
        "calories": _safe_int(row.get("Calories(kcal)")),
        "carbs": _safe_int(row.get("Carbohydrate(g)")),
        "proteins": _safe_int(row.get("Proteins(g)")),
        "vitamins": _safe_int(row.get("Vitamins")),
        "minerals": _safe_int(row.get("Minerals")),
    }


# ─────────────────────────────────────────────────────────────────
#  Request / Response Schemas
# ─────────────────────────────────────────────────────────────────

class MealPlanRequest(BaseModel):
    retinopathy_stage: Literal[
        "No retinopathy",
        "Mild Retinopathy",
        "Moderate Retinopathy",
        "Severe Retinopathy",
        "Proliferative Retinopathy",
    ] = Field(..., example="Moderate Retinopathy")

    diet_preference: Literal["Vegetarian", "Vegan", "Non Vegetarian"] = Field(
        ..., example="Vegetarian"
    )

    meal_types: List[Literal["Breakfast", "Lunch", "Dinner", "Snacks"]] = Field(
        default=["Breakfast", "Lunch", "Dinner", "Snacks"],
        example=["Breakfast", "Lunch", "Dinner"],
    )

    plan_type: Literal["today", "tomorrow", "week"] = Field(default="today")

    age_group: Optional[Literal["18-25", "26-35", "36-45", "46-60", "60+"]] = Field(
        None, example="36-45"
    )
    region: Optional[Literal["North", "South", "East", "West", "Central"]] = Field(
        None, example="South"
    )
    bmi: Optional[float] = Field(None, ge=10.0, le=60.0, example=24.5)


# ─────────────────────────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Info"])
def root():
    return {"status": "running", "docs": "/docs"}


@app.get("/dataset/info", tags=["Info"])
def dataset_info():
    if _df_ex is None:
        raise HTTPException(status_code=503, detail="Model not yet loaded")
    df_orig = pd.read_csv(DATASET_PATH)
    return {
        "total_rows": len(df_orig),
        "unique_foods": int(_df_ex["Food"].nunique()),
        "retinopathy_stages": sorted(df_orig["Diabetic Retinopathy Stage"].dropna().unique().tolist()),
        "diet_preferences": sorted(df_orig["Diet Preference"].dropna().unique().tolist()),
        "meal_types": sorted(df_orig["Meal type"].dropna().unique().tolist()),
        "age_groups": sorted(df_orig["Age Group"].dropna().unique().tolist()),
        "regions": sorted(df_orig["Region"].dropna().unique().tolist()),
        "days_of_week": sorted(df_orig["Day of Week"].dropna().unique().tolist()),
        "bmi_range": {"min": float(df_orig["BMI"].min()), "max": float(df_orig["BMI"].max())},
        "stage_recommendations": {
            s: {"recommended_exercises": v["recommended_exercises"], "foods_to_avoid": v["foods_to_avoid"]}
            for s, v in STAGE_REC.items()
        },
    }


@app.post("/meal-plan", tags=["Meal Plan"])
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
    days_out = []

    for day_name, day_date in target_days:
        meals_out = []
        total_cal = total_carbs = total_prot = total_vit = total_min = 0

        for meal_type in req.meal_types:
            rec = _recommend(
                stage=req.retinopathy_stage,
                diet=req.diet_preference,
                meal_type=meal_type,
                day=day_name,
                age_group=req.age_group,
                region=req.region,
                bmi=req.bmi,
            )
            meals_out.append(
                {
                    "meal_type": meal_type,
                    "recommended_food": rec["food"],
                    "alternatives": rec["foods"][1:],   # next 2 options
                    "calories_kcal": rec["calories"],
                    "carbohydrates_g": rec["carbs"],
                    "proteins_g": rec["proteins"],
                    "vitamins": rec["vitamins"],
                    "minerals": rec["minerals"],
                }
            )
            total_cal   += rec["calories"]
            total_carbs += rec["carbs"]
            total_prot  += rec["proteins"]
            total_vit   += rec["vitamins"]
            total_min   += rec["minerals"]

        days_out.append(
            {
                "day_name": day_name,
                "date": str(day_date),
                "meals": meals_out,
                "total_calories_kcal": total_cal,
                "total_carbohydrates_g": total_carbs,
                "total_proteins_g": total_prot,
                "total_vitamins": total_vit,
                "total_minerals": total_min,
            }
        )

    return {
        "plan_type": req.plan_type,
        "patient_profile": {
            "retinopathy_stage": req.retinopathy_stage,
            "diet_preference": req.diet_preference,
            "meal_types": req.meal_types,
            "age_group": req.age_group,
            "region": req.region,
            "bmi": req.bmi,
        },
        "exercise_recommendation": {
            "recommended_exercises": stage_info["recommended_exercises"],
            "exercise_note": stage_info["exercise_note"],
        },
        "diet_recommendation": {
            "foods_to_avoid": stage_info["foods_to_avoid"],
            "diet_note": stage_info["diet_note"],
        },
        "days": days_out,
        "message": "Meal plan generated successfully by ML model.",
    }