from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import date, timedelta
import pandas as pd
import random
import os

# ─────────────────────────────────────────────────────────────────
#  App Setup
# ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Diabetic Retinopathy Diet Recommendation API",
    description=(
        "Rule-based meal plan generator for diabetic retinopathy patients. "
        "Filters the dataset by patient profile and randomly picks from matches. "
        "Exercise and foods-to-avoid are recommended automatically based on retinopathy stage."
    ),
    version="2.0.0"
)

# ─────────────────────────────────────────────────────────────────
#  Stage-based Recommendations (outputs, not inputs)
# ─────────────────────────────────────────────────────────────────

STAGE_RECOMMENDATIONS: dict[str, dict] = {
    "No retinopathy": {
        "recommended_exercises": ["Brisk Walking", "Cycling", "Yoga", "Swimming"],
        "foods_to_avoid": ["Sugary Foods", "Soft Drinks"],
        "exercise_note": (
            "You have no retinopathy. Maintain regular moderate exercise to "
            "manage blood sugar and prevent progression."
        ),
        "diet_note": (
            "Keep blood sugar stable by limiting sugary foods and soft drinks. "
            "Focus on whole grains, vegetables, and lean proteins."
        ),
    },
    "Mild Retinopathy": {
        "recommended_exercises": ["Brisk Walking", "Yoga", "Stretching"],
        "foods_to_avoid": ["Sugary Foods", "Refined Flour", "Soft Drinks"],
        "exercise_note": (
            "Mild retinopathy detected. Low-to-moderate intensity exercises are safe. "
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
            "Moderate retinopathy: stick to low-impact activities. "
            "Avoid high-intensity or contact sports that may raise intraocular pressure."
        ),
        "diet_note": (
            "Strictly avoid processed and refined foods. Emphasise leafy greens "
            "(lutein/zeaxanthin), berries, and foods rich in vitamins C and E."
        ),
    },
    "Severe Retinopathy": {
        "recommended_exercises": ["Stretching", "Yoga"],
        "foods_to_avoid": [
            "Sugary Foods", "Refined Flour", "Processed Foods",
            "Soft Drinks", "Deep Fried Items", "Excess Salt"
        ],
        "exercise_note": (
            "Severe retinopathy: only gentle, supervised exercise. "
            "Avoid any activity that involves Valsalva manoeuvres, heavy lifting, "
            "or head-down positions."
        ),
        "diet_note": (
            "Very strict diet control required. Avoid all fried, salty, and "
            "processed foods. Prioritise anti-inflammatory and antioxidant nutrition."
        ),
    },
    "Proliferative Retinopathy": {
        "recommended_exercises": ["Stretching"],
        "foods_to_avoid": [
            "Sugary Foods", "Refined Flour", "Processed Foods",
            "Soft Drinks", "Deep Fried Items", "Excess Salt"
        ],
        "exercise_note": (
            "Proliferative retinopathy: exercise only under medical supervision. "
            "High-intensity, anaerobic, or jarring activities are contraindicated "
            "due to risk of vitreous haemorrhage."
        ),
        "diet_note": (
            "Strict medical nutrition therapy required. Eliminate all foods that "
            "cause glycaemic spikes or systemic inflammation."
        ),
    },
}

# ─────────────────────────────────────────────────────────────────
#  Load Dataset Once at Startup
# ─────────────────────────────────────────────────────────────────
DATASET_PATH = os.path.join(os.path.dirname(__file__), "diabetic_retinopathy_diet_plan_10000.csv")

try:
    df = pd.read_csv("diabetic_retinopathy_diet_plan_10000.csv")
    df.columns = df.columns.str.strip()

    STR_COLS = [
        "Diabetic Retinopathy Stage", "Diet Preference", "Meal type",
        "Preferred Exercise", "Avoid", "Age Group", "Region", "Day of Week"
    ]
    for col in STR_COLS:
        if col in df.columns:
            df[col + "_norm"] = df[col].astype(str).str.strip().str.lower()

    print(f"✅ Dataset loaded: {len(df)} rows, {len(df.columns)} columns")

except FileNotFoundError:
    raise RuntimeError(
        f"❌ Dataset not found at {DATASET_PATH}. "
        "Place the CSV in the same folder as main.py"
    )


# ─────────────────────────────────────────────────────────────────
#  Request Schema  (exercise & avoid REMOVED — now auto-recommended)
# ─────────────────────────────────────────────────────────────────

class MealPlanRequest(BaseModel):
    # ── Required ──────────────────────────────────────────────────
    retinopathy_stage: Literal[
        "No retinopathy",
        "Mild Retinopathy",
        "Moderate Retinopathy",
        "Severe Retinopathy",
        "Proliferative Retinopathy"
    ] = Field(..., example="Moderate Retinopathy")

    diet_preference: Literal[
        "Vegetarian",
        "Vegan",
        "Non Vegetarian"
    ] = Field(..., example="Vegetarian")

    meal_types: List[Literal["Breakfast", "Lunch", "Dinner", "Snacks"]] = Field(
        default=["Breakfast", "Lunch", "Dinner", "Snacks"],
        description="Which meals to include in the plan",
        example=["Breakfast", "Lunch", "Dinner"]
    )

    plan_type: Literal["today", "tomorrow", "week"] = Field(
        default="today",
        description="Generate plan for today, tomorrow, or the full week"
    )

    # ── Optional demographic filters ──────────────────────────────
    age_group: Optional[Literal[
        "18-25", "26-35", "36-45", "46-60", "60+"
    ]] = Field(None, example="36-45")

    region: Optional[Literal[
        "North", "South", "East", "West", "Central"
    ]] = Field(None, example="South")

    bmi: Optional[float] = Field(
        None, ge=10.0, le=60.0,
        description="BMI value — matched within ±3 range.",
        example=24.5
    )

    # NOTE: preferred_exercise and avoid are intentionally NOT accepted as inputs.
    # They are derived from retinopathy_stage and returned in the response.


# ─────────────────────────────────────────────────────────────────
#  Response Schema
# ─────────────────────────────────────────────────────────────────

class ExerciseRecommendation(BaseModel):
    recommended_exercises: List[str]
    exercise_note: str


class DietRecommendation(BaseModel):
    foods_to_avoid: List[str]
    diet_note: str


class MealDetail(BaseModel):
    meal_type: str
    day_name: str
    date: str
    recommended_food: str
    carbohydrates_g: Optional[float]
    proteins_g: Optional[float]
    vitamins: Optional[float]
    minerals: Optional[float]
    calories_kcal: Optional[float]


class DayPlan(BaseModel):
    day_name: str
    date: str
    meals: List[MealDetail]
    total_calories_kcal: float
    total_carbohydrates_g: float
    total_proteins_g: float
    total_vitamins: float
    total_minerals: float


class MealPlanResponse(BaseModel):
    plan_type: str
    patient_profile: dict
    # ── Auto-generated recommendations ────────────────────────────
    exercise_recommendation: ExerciseRecommendation
    diet_recommendation: DietRecommendation
    # ── Meal plan ─────────────────────────────────────────────────
    days: List[DayPlan]
    skipped_meals: List[str] = []
    message: str


# ─────────────────────────────────────────────────────────────────
#  Core Filter Logic
# ─────────────────────────────────────────────────────────────────

def filter_rows(
    meal_type: str,
    day_name: str,
    req: MealPlanRequest,
    recommended_exercise: str,
    recommended_avoid: str,
) -> pd.DataFrame:
    """
    Filter dataset for one meal slot.

    Strict  → Stage, Diet Preference, Meal type, Day of Week
    Soft    → Exercise (from stage recommendation), Avoid (from stage recommendation),
              Age Group, Region, BMI ± 3
              (each soft filter only applied if result stays non-empty)
    """
    f = df.copy()

    # ── Strict ────────────────────────────────────────────────────
    f = f[f["Diabetic Retinopathy Stage_norm"] == req.retinopathy_stage.strip().lower()]
    f = f[f["Diet Preference_norm"]            == req.diet_preference.strip().lower()]
    f = f[f["Meal type_norm"]                  == meal_type.strip().lower()]
    f = f[f["Day of Week_norm"]                == day_name.strip().lower()]

    if f.empty:
        return f

    # ── Soft (fallback to pre-filter result if match goes empty) ──
    def soft(df_in, col, value):
        if value is None:
            return df_in
        tmp = df_in[df_in[col + "_norm"] == str(value).strip().lower()]
        return tmp if not tmp.empty else df_in

    # Use stage-derived recommendations for filtering
    f = soft(f, "Preferred Exercise", recommended_exercise)
    f = soft(f, "Avoid",              recommended_avoid)

    # User-supplied demographic filters
    f = soft(f, "Age Group", req.age_group)
    f = soft(f, "Region",    req.region)

    # BMI ± 3 soft range
    if req.bmi is not None and "BMI" in f.columns:
        bmi_f = f[(f["BMI"] >= req.bmi - 3) & (f["BMI"] <= req.bmi + 3)]
        if not bmi_f.empty:
            f = bmi_f

    return f


def safe_float(val) -> Optional[float]:
    try:
        return round(float(val), 1)
    except (ValueError, TypeError):
        return None


def build_meal(row: dict, meal_type: str, day_name: str, day_date: date) -> MealDetail:
    return MealDetail(
        meal_type=meal_type,
        day_name=day_name,
        date=str(day_date),
        recommended_food=str(row.get("Recommended Food", "N/A")),
        carbohydrates_g=safe_float(row.get("Carbohydrate(g)")),
        proteins_g=safe_float(row.get("Proteins(g)")),
        vitamins=safe_float(row.get("Vitamins")),
        minerals=safe_float(row.get("Minerals")),
        calories_kcal=safe_float(row.get("Calories(kcal)"))
    )


def build_day(
    day_name: str,
    day_date: date,
    req: MealPlanRequest,
    recommended_exercise: str,
    recommended_avoid: str,
):
    """Returns (DayPlan, list_of_skipped_labels)."""
    meals, skipped = [], []

    for meal_type in req.meal_types:
        filtered = filter_rows(
            meal_type, day_name, req,
            recommended_exercise, recommended_avoid
        )

        if filtered.empty:
            skipped.append(f"{day_name} – {meal_type}")
            continue

        row = filtered.sample(n=1).iloc[0].to_dict()
        meals.append(build_meal(row, meal_type, day_name, day_date))

    return DayPlan(
        day_name=day_name,
        date=str(day_date),
        meals=meals,
        total_calories_kcal   =round(sum(m.calories_kcal    or 0 for m in meals), 1),
        total_carbohydrates_g =round(sum(m.carbohydrates_g  or 0 for m in meals), 1),
        total_proteins_g      =round(sum(m.proteins_g       or 0 for m in meals), 1),
        total_vitamins        =round(sum(m.vitamins         or 0 for m in meals), 1),
        total_minerals        =round(sum(m.minerals         or 0 for m in meals), 1),
    ), skipped


# ─────────────────────────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Info"])
def root():
    return {"status": "running", "swagger_ui": "/docs"}


@app.get("/dataset/info", tags=["Info"],
         summary="All unique values per filter — useful for frontend dropdowns")
def dataset_info():
    return {
        "total_rows":          len(df),
        "retinopathy_stages":  sorted(df["Diabetic Retinopathy Stage"].dropna().unique().tolist()),
        "diet_preferences":    sorted(df["Diet Preference"].dropna().unique().tolist()),
        "meal_types":          sorted(df["Meal type"].dropna().unique().tolist()),
        "age_groups":          sorted(df["Age Group"].dropna().unique().tolist()),
        "regions":             sorted(df["Region"].dropna().unique().tolist()),
        "days_of_week":        sorted(df["Day of Week"].dropna().unique().tolist()),
        "bmi_range": {
            "min": float(df["BMI"].min()),
            "max": float(df["BMI"].max())
        },
        # Informational only — these are outputs, not inputs
        "stage_recommendations": {
            stage: {
                "recommended_exercises": info["recommended_exercises"],
                "foods_to_avoid":        info["foods_to_avoid"],
            }
            for stage, info in STAGE_RECOMMENDATIONS.items()
        }
    }


@app.get("/recommendations/{retinopathy_stage}", tags=["Recommendations"],
         summary="Get exercise and diet recommendations for a specific retinopathy stage")
def get_recommendations(retinopathy_stage: str):
    """
    Returns the exercise and food-avoidance recommendations for a given stage.
    Useful for displaying guidance to patients before generating a meal plan.
    """
    rec = STAGE_RECOMMENDATIONS.get(retinopathy_stage)
    if not rec:
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"Stage '{retinopathy_stage}' not found.",
                "valid_stages": list(STAGE_RECOMMENDATIONS.keys())
            }
        )
    return {
        "retinopathy_stage":     retinopathy_stage,
        "recommended_exercises": rec["recommended_exercises"],
        "exercise_note":         rec["exercise_note"],
        "foods_to_avoid":        rec["foods_to_avoid"],
        "diet_note":             rec["diet_note"],
    }


@app.post(
    "/meal-plan",
    response_model=MealPlanResponse,
    tags=["Meal Plan"],
    summary="Generate a meal plan — today / tomorrow / full week"
)
def generate_meal_plan(req: MealPlanRequest):

    today = date.today()

    # ── Derive exercise & avoid from stage ────────────────────────
    stage_rec = STAGE_RECOMMENDATIONS[req.retinopathy_stage]

    # Pick one representative exercise and one avoid item for dataset filtering
    # (the full lists are returned in the response)
    recommended_exercise = stage_rec["recommended_exercises"][0]
    recommended_avoid    = stage_rec["foods_to_avoid"][0]

    # ── Target days ───────────────────────────────────────────────
    if req.plan_type == "today":
        target_days = [(today.strftime("%A"), today)]

    elif req.plan_type == "tomorrow":
        tmrw = today + timedelta(days=1)
        target_days = [(tmrw.strftime("%A"), tmrw)]

    else:  # week
        target_days = [
            ((today + timedelta(days=i)).strftime("%A"), today + timedelta(days=i))
            for i in range(7)
        ]

    # ── Build each day ────────────────────────────────────────────
    day_plans, all_skipped = [], []

    for day_name, day_date in target_days:
        day_plan, skipped = build_day(
            day_name, day_date, req,
            recommended_exercise, recommended_avoid
        )
        day_plans.append(day_plan)
        all_skipped.extend(skipped)

    # ── Zero meals found at all → 404 ─────────────────────────────
    if all(len(d.meals) == 0 for d in day_plans):
        raise HTTPException(
            status_code=404,
            detail={
                "message": "No matching records found for this profile.",
                "suggestion": (
                    "Remove optional filters (age_group, region, bmi) and try again."
                ),
                "filters_applied": {
                    "retinopathy_stage":     req.retinopathy_stage,
                    "diet_preference":       req.diet_preference,
                    "meal_types":            req.meal_types,
                    "recommended_exercise":  recommended_exercise,
                    "recommended_avoid":     recommended_avoid,
                    "age_group":             req.age_group,
                    "region":                req.region,
                    "bmi":                   req.bmi,
                }
            }
        )

    message = (
        f"Meal plan generated. {len(all_skipped)} slot(s) skipped (no match): "
        + ", ".join(all_skipped)
        if all_skipped
        else "Meal plan generated successfully — all slots matched."
    )

    return MealPlanResponse(
        plan_type=req.plan_type,
        patient_profile={
            "retinopathy_stage": req.retinopathy_stage,
            "diet_preference":   req.diet_preference,
            "meal_types":        req.meal_types,
            "age_group":         req.age_group,
            "region":            req.region,
            "bmi":               req.bmi,
            "plan_type":         req.plan_type,
        },
        exercise_recommendation=ExerciseRecommendation(
            recommended_exercises=stage_rec["recommended_exercises"],
            exercise_note=stage_rec["exercise_note"],
        ),
        diet_recommendation=DietRecommendation(
            foods_to_avoid=stage_rec["foods_to_avoid"],
            diet_note=stage_rec["diet_note"],
        ),
        days=day_plans,
        skipped_meals=all_skipped,
        message=message
    )
