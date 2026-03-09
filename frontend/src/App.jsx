import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────
const API = "https://retinadiet.vercel.app/api";

// ─────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────
const STAGE_RECOMMENDATIONS = {
  "Mild Retinopathy":          { exercises: ["Brisk Walking","Yoga","Stretching"],         avoid: ["Sugary Foods","Refined Flour","Soft Drinks"] },
  "Moderate Retinopathy":      { exercises: ["Yoga","Stretching","Brisk Walking"],         avoid: ["Sugary Foods","Refined Flour","Processed Foods","Soft Drinks"] },
  "No retinopathy":            { exercises: ["Brisk Walking","Cycling","Yoga","Swimming"], avoid: ["Sugary Foods","Soft Drinks"] },
  "Severe Retinopathy":        { exercises: ["Stretching","Yoga"],                         avoid: ["Sugary Foods","Refined Flour","Processed Foods","Soft Drinks","Deep Fried Items","Excess Salt"] },
  "Proliferative Retinopathy": { exercises: ["Stretching"],                                avoid: ["Sugary Foods","Refined Flour","Processed Foods","Soft Drinks","Deep Fried Items","Excess Salt"] },
};

const MEAL_PLANS = {
  "No retinopathy": {
    Vegetarian:       { Breakfast:["Oats Porridge","Ragi Dosa","Upma","Poha","Idli Sambar"],         Lunch:["Dal Rice","Rajma Rice","Palak Dal","Mixed Veg Curry"],          Dinner:["Khichdi","Vegetable Soup","Chapati with Sabzi"],    Snacks:["Fruits","Roasted Chana","Yogurt"] },
    Vegan:            { Breakfast:["Millet Porridge","Oats Idli","Vegetable Upma"],                  Lunch:["Lentil Soup","Brown Rice Bowl","Chickpea Curry"],               Dinner:["Tofu Stir Fry","Dal Khichdi","Vegetable Daliya"],   Snacks:["Mixed Nuts","Fruit Salad","Roasted Seeds"] },
    "Non Vegetarian": { Breakfast:["Egg Omelette","Chicken Sandwich","Boiled Eggs"],                 Lunch:["Chicken Rice","Fish Curry Rice","Egg Curry"],                   Dinner:["Grilled Fish","Chicken Stew","Mutton Soup"],         Snacks:["Boiled Eggs","Chicken Salad"] },
  },
  "Mild Retinopathy": {
    Vegetarian:       { Breakfast:["Masala Idli","Palak Paneer Paratha","Ragi Dosa","Oats Chilla"],  Lunch:["Methi Thepla","Palak Dal","Chole Rice","Mixed Veg Curry"],       Dinner:["Moong Dal Khichdi","Lauki Curry","Dhokla"],          Snacks:["Roasted Chana","Sprouts Salad","Buttermilk"] },
    Vegan:            { Breakfast:["Millet Porridge","Oats Idli","Spinach Upma"],                    Lunch:["Barley Risotto","Lentil Curry","Chickpea Salad"],                Dinner:["Tofu Stir Fry","Sweet Corn Salad","Dal Daliya"],     Snacks:["Mixed Nuts","Fruit Bowl","Roasted Seeds"] },
    "Non Vegetarian": { Breakfast:["Avocado Toast","Chicken Sandwich","Oats Chilla"],                Lunch:["Mutton Curry Rice","Fish Curry","Egg Paratha"],                  Dinner:["Grilled Chicken","Fish Korma","Palak Kofta"],         Snacks:["Boiled Eggs","Chicken Salad","Fish Tikka"] },
  },
  "Moderate Retinopathy": {
    Vegetarian:       { Breakfast:["Stuffed Paratha","Kadhi Pakora","Oats Porridge","Idli"],         Lunch:["Rajma Chawal","Palak Paneer","Dal Tadka","Bisi Bele Bath"],      Dinner:["Vegetable Khichdi","Lauki Sabzi","Chapati Dal"],     Snacks:["Yogurt","Roasted Chana","Fruit Salad"] },
    Vegan:            { Breakfast:["Millet Dosa","Vegetable Upma","Tofu Scramble"],                  Lunch:["Lentil Soup","Brown Rice Pulao","Veggie Bowl"],                  Dinner:["Tofu Curry","Vegetable Daliya","Dal Soup"],          Snacks:["Mixed Seeds","Roasted Chickpeas","Fruit"] },
    "Non Vegetarian": { Breakfast:["Egg Bhurji","Chicken Poha","Egg Sandwich"],                      Lunch:["Chicken Dal Rice","Fish Pulao","Mutton Soup"],                   Dinner:["Baked Fish","Chicken Soup","Egg Curry"],              Snacks:["Boiled Eggs","Chicken Tikka","Fish Salad"] },
  },
  "Severe Retinopathy": {
    Vegetarian:       { Breakfast:["Oats Porridge","Plain Idli","Ragi Porridge"],                    Lunch:["Steamed Dal Rice","Plain Khichdi","Vegetable Soup"],             Dinner:["Moong Dal","Lauki Soup","Chapati Sabzi"],            Snacks:["Cucumber Slices","Buttermilk","Sprouts"] },
    Vegan:            { Breakfast:["Millet Porridge","Vegetable Soup","Plain Upma"],                 Lunch:["Lentil Broth","Steamed Rice","Vegetable Stew"],                  Dinner:["Tofu Soup","Dal Khichdi","Steamed Veggies"],         Snacks:["Roasted Seeds","Fruit","Herbal Tea"] },
    "Non Vegetarian": { Breakfast:["Boiled Eggs","Egg White Omelette","Fish Soup"],                  Lunch:["Steamed Fish Rice","Chicken Broth","Egg Dal"],                   Dinner:["Grilled Fish","Chicken Clear Soup","Boiled Chicken"], Snacks:["Boiled Egg","Fish Tikka","Chicken Salad"] },
  },
  "Proliferative Retinopathy": {
    Vegetarian:       { Breakfast:["Plain Oats","Steamed Idli","Ragi Kanji"],                        Lunch:["Plain Dal Rice","Vegetable Khichdi","Light Soup"],               Dinner:["Moong Dal Soup","Soft Chapati","Lauki Sabzi"],       Snacks:["Warm Milk","Cucumber","Plain Buttermilk"] },
    Vegan:            { Breakfast:["Plain Millet Porridge","Vegetable Broth","Oats"],                Lunch:["Lentil Soup","Soft Rice","Steamed Vegetables"],                  Dinner:["Tofu Broth","Dal Soup","Soft Khichdi"],              Snacks:["Herbal Tea","Fruit Juice","Plain Nuts"] },
    "Non Vegetarian": { Breakfast:["Plain Boiled Eggs","Chicken Broth","Fish Soup"],                 Lunch:["Steamed Fish","Chicken Khichdi","Egg Rice"],                     Dinner:["Clear Chicken Soup","Boiled Fish","Egg Khichdi"],    Snacks:["Boiled Egg","Plain Chicken","Fish Broth"] },
  },
};

const T = {
  en: {
    welcome: "Hello! I am your Diabetic Retinopathy Diet Assistant. I will help create a personalized meal plan for you.",
    askLang: "Please choose your preferred language to continue.",
    askStage: "What is your diabetic retinopathy stage?",
    askDiet: "What is your diet preference?",
    askMeals: "Which meals would you like included in your plan? You may select multiple.",
    askPlan: "Would you like a plan for today, tomorrow, or the full week?",
    askAge: "What is your age group? This is optional.",
    askRegion: "Which region are you from? This is optional.",
    askBMI: "What is your BMI? This is optional.",
    generating: "Generating your personalized meal plan, please wait...",
    yourPlan: "Your personalized meal plan is ready!",
    exercises: "Recommended Exercises",
    avoid: "Foods to Avoid",
    tapOptions: "Tap an option or use the microphone",
    skip: "Skip",
    confirm: "Confirm Selection",
    restart: "Generate New Plan",
    stages: ["No retinopathy","Mild Retinopathy","Moderate Retinopathy","Severe Retinopathy","Proliferative Retinopathy"],
    diets: ["Vegetarian","Vegan","Non Vegetarian"],
    meals: ["Breakfast","Lunch","Dinner","Snacks"],
    plans: ["Today","Tomorrow","Full Week"],
    ages: ["18-25","26-35","36-45","46-60","60+"],
    regions: ["North","South","East","West","Central"],
    speakNow: "Listening...",
    notUnderstood: "Sorry, I did not catch that. Please tap an option or try again.",
    calories: "kcal",
    days: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
  te: {
    welcome: "నమస్కారం! నేను మీ డయాబెటిక్ రెటినోపతి డైట్ అసిస్టెంట్. మీకు వ్యక్తిగత భోజన ప్రణాళికను రూపొందించడానికి సహాయం చేస్తాను.",
    askLang: "కొనసాగించడానికి మీకు ఇష్టమైన భాషను ఎంచుకోండి.",
    askStage: "మీ డయాబెటిక్ రెటినోపతి దశ ఏమిటి?",
    askDiet: "మీ ఆహార ప్రాధాన్యత ఏమిటి?",
    askMeals: "మీ ప్రణాళికలో ఏ భోజనాలు కావాలి? మీరు అనేకం ఎంచుకోవచ్చు.",
    askPlan: "మీకు ఈరోజు, రేపు లేదా పూర్తి వారానికి ప్రణాళిక కావాలా?",
    askAge: "మీ వయస్సు గ్రూప్ ఏమిటి? ఇది ఐచ్ఛికం.",
    askRegion: "మీరు ఏ ప్రాంతం నుండి వచ్చారు? ఇది ఐచ్ఛికం.",
    askBMI: "మీ BMI ఎంత? ఇది ఐచ్ఛికం.",
    generating: "మీ వ్యక్తిగత భోజన ప్రణాళికను రూపొందిస్తున్నాను, దయచేసి వేచి ఉండండి...",
    yourPlan: "మీ వ్యక్తిగత భోజన ప్రణాళిక సిద్ధంగా ఉంది!",
    exercises: "సిఫార్సు చేసిన వ్యాయామాలు",
    avoid: "నివారించాల్సిన ఆహారాలు",
    tapOptions: "ఒక ఎంపికను నొక్కండి లేదా మైక్రోఫోన్ ఉపయోగించండి",
    skip: "దాటవేయు",
    confirm: "ఎంపికను నిర్ధారించు",
    restart: "కొత్త ప్రణాళిక రూపొందించు",
    stages: ["రెటినోపతి లేదు","తేలికపాటి రెటినోపతి","మితమైన రెటినోపతి","తీవ్రమైన రెటినోపతి","ప్రోలిఫెరేటివ్ రెటినోపతి"],
    diets: ["శాకాహారి","వీగన్","మాంసాహారి"],
    meals: ["అల్పాహారం","మధ్యాహ్న భోజనం","రాత్రి భోజనం","స్నాక్స్"],
    plans: ["ఈరోజు","రేపు","పూర్తి వారం"],
    ages: ["18-25","26-35","36-45","46-60","60+"],
    regions: ["ఉత్తరం","దక్షిణం","తూర్పు","పశ్చిమం","మధ్యభాగం"],
    speakNow: "వినుతున్నాను...",
    notUnderstood: "క్షమించండి, అర్థం కాలేదు. దయచేసి ఒక ఎంపికను నొక్కండి లేదా మళ్ళీ ప్రయత్నించండి.",
    calories: "కేలరీలు",
    days: ["ఆదివారం","సోమవారం","మంగళవారం","బుధవారం","గురువారం","శుక్రవారం","శనివారం"],
  },
};

const TELUGU_TO_EN = {
  "రెటినోపతి లేదు":"No retinopathy","తేలికపాటి రెటినోపతి":"Mild Retinopathy",
  "మితమైన రెటినోపతి":"Moderate Retinopathy","తీవ్రమైన రెటినోపతి":"Severe Retinopathy",
  "ప్రోలిఫెరేటివ్ రెటినోపతి":"Proliferative Retinopathy",
  "శాకాహారి":"Vegetarian","వీగన్":"Vegan","మాంసాహారి":"Non Vegetarian",
  "అల్పాహారం":"Breakfast","మధ్యాహ్న భోజనం":"Lunch","రాత్రి భోజనం":"Dinner","స్నాక్స్":"Snacks",
  "ఈరోజు":"today","రేపు":"tomorrow","పూర్తి వారం":"week",
  "ఉత్తరం":"North","దక్షిణం":"South","తూర్పు":"East","పశ్చిమం":"West","మధ్యభాగం":"Central",
};
const toEn = v => TELUGU_TO_EN[v] || v;

function generatePlan(profile) {
  const { stage, diet, meals, planType } = profile;
  const today = new Date();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  let targetDays = [];
  if (planType === "today") {
    targetDays = [{ name: dayNames[today.getDay()], date: new Date(today) }];
  } else if (planType === "tomorrow") {
    const t = new Date(today); t.setDate(t.getDate()+1);
    targetDays = [{ name: dayNames[t.getDay()], date: t }];
  } else {
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setDate(d.getDate()+i);
      targetDays.push({ name: dayNames[d.getDay()], date: d });
    }
  }
  const stageRec = STAGE_RECOMMENDATIONS[stage] || STAGE_RECOMMENDATIONS["Mild Retinopathy"];
  const foodMap  = MEAL_PLANS[stage]?.[diet] || MEAL_PLANS["Mild Retinopathy"]?.["Vegetarian"];
  const days = targetDays.map(({ name, date }) => {
    const dayMeals = (meals||[]).map(mealType => {
      const opts = foodMap?.[mealType] || ["Healthy Home-cooked Meal"];
      const food = opts[Math.floor(Math.random()*opts.length)];
      const cals = mealType==="Snacks"?Math.floor(Math.random()*80)+80:mealType==="Breakfast"?Math.floor(Math.random()*120)+280:Math.floor(Math.random()*150)+350;
      return { type: mealType, food, calories: cals, carbs: Math.floor(cals*0.5/4), protein: Math.floor(cals*0.2/4) };
    });
    return { dayName: name, date: date.toLocaleDateString("en-IN",{day:"numeric",month:"short"}), meals: dayMeals, totalCal: dayMeals.reduce((s,m)=>s+m.calories,0) };
  });
  return { days, exercises: stageRec.exercises, avoid: stageRec.avoid };
}

// ─────────────────────────────────────────────────────────────────
// AUTH API HELPERS
// ─────────────────────────────────────────────────────────────────
async function apiCall(path, method="GET", body=null, token=null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : null });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────

// ── Login / Register Screen ────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode]       = useState("login");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const data = await apiCall(path, "POST", body);
      localStorage.setItem("rd_token", data.token);
      localStorage.setItem("rd_user", JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={S.authRoot}>
      <div style={S.authLeft}>
        <div style={S.authLeftInner}>
          <div style={S.authBrand}>RetinaDiet</div>
          <div style={S.authTagline}>Personalized nutrition for diabetic retinopathy care</div>
          <div style={S.authFeatures}>
            {["Voice-guided meal planning","Bilingual — English and Telugu","Tailored to your retinopathy stage","Saved reports on every login"].map(f=>(
              <div key={f} style={S.authFeatureItem}>
                <div style={S.featureDot}/>{f}
              </div>
            ))}
          </div>
        </div>
        <div style={S.authDecor1}/><div style={S.authDecor2}/>
      </div>

      <div style={S.authRight}>
        <div style={S.authCard}>
          <div style={S.authCardTitle}>{mode==="login"?"Welcome back":"Create account"}</div>
          <div style={S.authCardSub}>{mode==="login"?"Sign in to view your meal plans":"Join to get your personalized diet"}</div>

          <div style={S.tabRow}>
            <button style={{...S.tab,...(mode==="login"?S.tabActive:{})}} onClick={()=>{setMode("login");setError("")}}>Sign In</button>
            <button style={{...S.tab,...(mode==="register"?S.tabActive:{})}} onClick={()=>{setMode("register");setError("")}}>Register</button>
          </div>

          {mode==="register" && (
            <div style={S.fieldWrap}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>
            </div>
          )}
          <div style={S.fieldWrap}>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>
          <div style={S.fieldWrap}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="••••••••" value={password} onChange={e=>setPass(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>

          {error && <div style={S.errorBox}>{error}</div>}

          <button style={{...S.primaryBtn,...(loading?S.btnLoading:{})}} onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : mode==="login" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Latest Report Viewer ───────────────────────────────────────
function ReportViewer({ report, onClose, lang }) {
  const tx = T[lang||"en"];
  const { profile, plan, generatedAt } = report;
  const dateStr = new Date(generatedAt).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});

  return (
    <div style={S.reportOverlay}>
      <div style={S.reportPanel}>
        <div style={S.reportHeader}>
          <div>
            <div style={S.reportTitle}>Latest Report</div>
            <div style={S.reportDate}>Generated on {dateStr}</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>Close</button>
        </div>

        <div style={S.reportMeta}>
          {[
            ["Stage", profile.stage],
            ["Diet", profile.diet],
            ["Plan", profile.planType],
            ...(profile.age ? [["Age",profile.age]] : []),
            ...(profile.region ? [["Region",profile.region]] : []),
          ].map(([k,v]) => (
            <div key={k} style={S.metaChip}><span style={S.metaKey}>{k}</span> {v}</div>
          ))}
        </div>

        <div style={S.recRow}>
          <div style={S.recBlock}>
            <div style={S.recBlockTitle}>{tx.exercises}</div>
            <div style={S.pillRow}>{plan.exercises.map(e=><span key={e} style={{...S.pill,...S.pillGreen}}>{e}</span>)}</div>
          </div>
          <div style={S.recBlock}>
            <div style={S.recBlockTitle}>{tx.avoid}</div>
            <div style={S.pillRow}>{plan.avoid.map(a=><span key={a} style={{...S.pill,...S.pillRed}}>{a}</span>)}</div>
          </div>
        </div>

        <div style={S.reportDays}>
          {plan.days.map((day,di)=>(
            <div key={di} style={S.rDayCard}>
              <div style={S.rDayHead}>
                <span style={S.rDayName}>{day.dayName}</span>
                <span style={S.rDayDate}>{day.date}</span>
                <span style={S.rDayCal}>{day.totalCal} kcal</span>
              </div>
              <div style={S.rMealGrid}>
                {day.meals.map((meal,mi)=>(
                  <div key={mi} style={S.rMealCard}>
                    <div style={S.rMealType}>{meal.type}</div>
                    <div style={S.rMealFood}>{meal.food}</div>
                    <div style={S.rMealMacros}>{meal.calories} kcal · {meal.carbs}g carbs · {meal.protein}g protein</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Voice Chatbot ──────────────────────────────────────────────
function Chatbot({ user, token, onLogout }) {
  const [lang, setLang]               = useState(null);
  const [step, setStep]               = useState("lang");
  const [profile, setProfile]         = useState({ meals: [] });
  const [messages, setMessages]       = useState([]);
  const [listening, setListening]     = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [result, setResult]           = useState(null);
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [latestReport, setLatestReport]   = useState(null);
  const [showReport, setShowReport]       = useState(false);
  const [savingReport, setSavingReport]   = useState(false);
  const [reportSaved, setReportSaved]     = useState(false);
  const chatRef = useRef(null);
  const synth   = useRef(window.speechSynthesis);

  const t = T[lang||"en"];

  useEffect(()=>{
    if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  },[messages]);

  // Load latest report on mount
  useEffect(()=>{
    if(!token) return;
    apiCall("/reports/latest","GET",null,token)
      .then(d => setLatestReport(d.report))
      .catch(()=>{});
  },[token]);

  const speak = useCallback((text, l)=>{
    if(!synth.current) return;
    synth.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = l==="te"?"te-IN":"en-IN";
    utt.rate = 0.9;
    setSpeaking(true);
    utt.onend = ()=>setSpeaking(false);
    synth.current.speak(utt);
  },[]);

  const addMsg = useCallback((text, from="bot")=>{
    setMessages(prev=>[...prev,{text,from,id:Date.now()+Math.random()}]);
  },[]);

  const didInit = useRef(false);
  useEffect(()=>{
    if (didInit.current) return;
    didInit.current = true;
    const w = T.en.welcome;
    const a = T.en.askLang;
    addMsg(w);
    addMsg(a);
    setTimeout(()=> speak(w + " " + a, "en"), 300);
  },[]);

  // Strip punctuation and normalize for fuzzy matching
  const normalize = (str) => str.toLowerCase().replace(/[.,!?।؟\-]/g, "").trim();

  // Try to fuzzy-match a spoken transcript against a list of option strings
  const fuzzyMatch = (transcript, options) => {
    const nt = normalize(transcript);
    // 1. Exact match after normalization
    const exact = options.find(o => normalize(o) === nt);
    if (exact) return exact;
    // 2. transcript contains the option or option contains transcript
    const contains = options.find(o => nt.includes(normalize(o)) || normalize(o).includes(nt));
    if (contains) return contains;
    // 3. Any word overlap (pick best match)
    const words = nt.split(/\s+/);
    let best = null, bestScore = 0;
    for (const o of options) {
      const oWords = normalize(o).split(/\s+/);
      const score = words.filter(w => oWords.includes(w)).length;
      if (score > bestScore) { bestScore = score; best = o; }
    }
    return bestScore > 0 ? best : null;
  };

  const startListening = useCallback(()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ alert("Voice recognition requires Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = lang==="te"?"te-IN":"en-IN";
    rec.interimResults = false;
    setListening(true);
    rec.start();
    rec.onresult = e=>{
      // Use the best alternative transcript available
      const allAlts = Array.from({length: e.results[0].length}, (_,i) => e.results[0][i].transcript.trim());
      const raw = allAlts[0];
      setListening(false);
      addMsg(raw, "user");

      const lower = normalize(raw);

      // ── Language selection ──────────────────────────────────
      if (step === "lang") {
        if (lower.includes("telugu") || lower.includes("తెలుగు") || lower.includes("telgu")) {
          handleOption("te", "lang");
        } else {
          handleOption("en", "lang");
        }
        return;
      }

      // ── Skip detection for optional steps ──────────────────
      const isSkip = lower.includes("skip") || lower.includes("దాటు") ||
                     lower.includes("next") || lower.includes("no") ||
                     lower.includes("none") || lower.includes("pass");

      if (["age","region","bmi"].includes(step) && isSkip) {
        handleOption("skip", step); return;
      }

      // ── Stage matching ──────────────────────────────────────
      if (step === "stage") {
        // Try all alternatives for best match
        let matched = null;
        for (const alt of allAlts) {
          matched = fuzzyMatch(alt, t.stages);
          if (matched) break;
        }
        if (matched) { handleOption(matched, "stage"); return; }
      }

      // ── Diet matching ───────────────────────────────────────
      if (step === "diet") {
        let matched = null;
        for (const alt of allAlts) {
          matched = fuzzyMatch(alt, t.diets);
          if (matched) break;
        }
        // Extra keywords
        if (!matched) {
          if (lower.includes("veg") && !lower.includes("non") && !lower.includes("vegan")) matched = t.diets[0]; // Vegetarian
          else if (lower.includes("vegan")) matched = t.diets[1];
          else if (lower.includes("non") || lower.includes("meat") || lower.includes("chicken") || lower.includes("fish")) matched = t.diets[2];
        }
        if (matched) { handleOption(matched, "diet"); return; }
      }

      // ── Meal type toggling ──────────────────────────────────
      if (step === "meals") {
        let matched = null;
        for (const alt of allAlts) {
          matched = fuzzyMatch(alt, t.meals);
          if (matched) break;
        }
        if (matched) { handleOption(matched, "meals-toggle"); return; }
        // "confirm / done / ok / yes" → confirm
        if (lower.includes("confirm") || lower.includes("done") || lower.includes("ok") ||
            lower.includes("yes") || lower.includes("finish") || lower.includes("సరే")) {
          handleOption("confirm", "meals-confirm"); return;
        }
      }

      // ── Plan type matching ──────────────────────────────────
      if (step === "plan") {
        const planOptions = t.plans;
        let matched = null;
        for (const alt of allAlts) {
          matched = fuzzyMatch(alt, planOptions);
          if (matched) break;
        }
        if (!matched) {
          if (lower.includes("today") || lower.includes("ఈరోజు") || lower.includes("now")) matched = planOptions[0];
          else if (lower.includes("tomorrow") || lower.includes("రేపు") || lower.includes("next day")) matched = planOptions[1];
          else if (lower.includes("week") || lower.includes("వారం") || lower.includes("7") || lower.includes("seven")) matched = planOptions[2];
        }
        if (matched) { handleOption(matched, "plan"); return; }
      }

      // ── Age group matching ──────────────────────────────────
      if (step === "age") {
        const matched = fuzzyMatch(raw, t.ages);
        if (matched) { handleOption(matched, "age"); return; }
        // Try to extract digits like "36" or "36 to 45"
        const digits = raw.match(/\d+/g);
        if (digits) {
          const num = parseInt(digits[0]);
          const ageMap = [[18,25,"18-25"],[26,35,"26-35"],[36,45,"36-45"],[46,60,"46-60"],[61,120,"60+"]];
          const found = ageMap.find(([lo,hi]) => num >= lo && num <= hi);
          if (found) { handleOption(found[2], "age"); return; }
        }
      }

      // ── Region matching ─────────────────────────────────────
      if (step === "region") {
        let matched = null;
        for (const alt of allAlts) {
          matched = fuzzyMatch(alt, t.regions);
          if (matched) break;
        }
        if (matched) { handleOption(matched, "region"); return; }
      }

      // ── BMI matching ────────────────────────────────────────
      if (step === "bmi") {
        const digits = raw.match(/\d+(\.\d+)?/);
        if (digits) { handleOption(digits[0], "bmi"); return; }
      }

      // ── Nothing matched ─────────────────────────────────────
      addMsg(t.notUnderstood);
      speak(t.notUnderstood, lang);
    };
    rec.onerror = ()=>setListening(false);
    rec.onend   = ()=>setListening(false);
  },[lang, step, t]);

  const handleOption = useCallback((value, forStep)=>{
    const l = forStep==="lang" ? (value==="te"?"te":"en") : lang;
    const tx = T[l];

    if(forStep==="lang"){
      setLang(value);
      addMsg(value==="te"?"తెలుగు":"English","user");
      setTimeout(()=>{ addMsg(tx.askStage); speak(tx.askStage,value); setStep("stage"); },400);
      return;
    }
    if(forStep==="stage"){
      setProfile(p=>({...p,stage:toEn(value)}));
      addMsg(value,"user");
      setTimeout(()=>{ addMsg(tx.askDiet); speak(tx.askDiet,l); setStep("diet"); },400);
      return;
    }
    if(forStep==="diet"){
      setProfile(p=>({...p,diet:toEn(value)}));
      addMsg(value,"user");
      setTimeout(()=>{ addMsg(tx.askMeals); speak(tx.askMeals,l); setStep("meals"); setSelectedMeals([]); },400);
      return;
    }
    if(forStep==="meals-toggle"){
      const ev = toEn(value);
      setSelectedMeals(prev=>prev.includes(ev)?prev.filter(m=>m!==ev):[...prev,ev]);
      return;
    }
    if(forStep==="meals-confirm"){
      const fm = selectedMeals.length>0?selectedMeals:["Breakfast","Lunch","Dinner","Snacks"];
      setProfile(p=>({...p,meals:fm}));
      addMsg(fm.join(", "),"user");
      setTimeout(()=>{ addMsg(tx.askPlan); speak(tx.askPlan,l); setStep("plan"); },400);
      return;
    }
    if(forStep==="plan"){
      const ev = toEn(value);
      const pm = {"Today":"today","Tomorrow":"tomorrow","Full Week":"week","today":"today","tomorrow":"tomorrow","week":"week","ఈరోజు":"today","రేపు":"tomorrow","పూర్తి వారం":"week"};
      const pv = pm[ev]||pm[value]||"today";
      setProfile(p=>({...p,planType:pv}));
      addMsg(value,"user");
      setTimeout(()=>{ addMsg(tx.askAge); speak(tx.askAge,l); setStep("age"); },400);
      return;
    }
    if(forStep==="age"){
      if(value!=="skip") setProfile(p=>({...p,age:value}));
      addMsg(value==="skip"?tx.skip:value,"user");
      setTimeout(()=>{ addMsg(tx.askRegion); speak(tx.askRegion,l); setStep("region"); },400);
      return;
    }
    if(forStep==="region"){
      if(value!=="skip") setProfile(p=>({...p,region:toEn(value)}));
      addMsg(value==="skip"?tx.skip:value,"user");
      setTimeout(()=>{ addMsg(tx.askBMI); speak(tx.askBMI,l); setStep("bmi"); },400);
      return;
    }
    if(forStep==="bmi"){
      if(value!=="skip") setProfile(p=>({...p,bmi:value}));
      addMsg(value==="skip"?tx.skip:value,"user");
      setTimeout(()=>{
        addMsg(tx.generating); speak(tx.generating,l);
        setStep("result");
        setTimeout(()=>{
          const fp = {...profile,planType:profile.planType||"today",language:l};
          if(value!=="skip") fp.bmi = value;
          const plan = generatePlan(fp);
          setResult(plan);
          addMsg(tx.yourPlan); speak(tx.yourPlan,l);
          // Auto-save
          setSavingReport(true);
          apiCall("/reports","POST",{profile:fp,plan},token)
            .then(()=>{ setReportSaved(true); setSavingReport(false);
              return apiCall("/reports/latest","GET",null,token);
            }).then(d=>setLatestReport(d.report))
            .catch(()=>setSavingReport(false));
        },1400);
      },400);
      return;
    }
  },[lang, step, selectedMeals, profile, speak, addMsg, token]);

  const handleRestart = ()=>{
    setLang(null); setStep("lang"); setProfile({meals:[]}); setSelectedMeals([]);
    setResult(null); setReportSaved(false); setMessages([]);
    setTimeout(()=>{ addMsg(T.en.welcome); addMsg(T.en.askLang); speak(T.en.welcome+" "+T.en.askLang,"en"); },200);
  };

  const renderOptions = ()=>{
    if(step==="lang") return (
      <div style={S.optRow}>
        {[{l:"English",v:"en"},{l:"తెలుగు",v:"te"}].map(o=>(
          <button key={o.v} style={S.optBtn} onClick={()=>handleOption(o.v,"lang")}>{o.l}</button>
        ))}
      </div>
    );
    if(step==="stage") return (
      <div style={S.optCol}>
        {t.stages.map((s,i)=>(
          <button key={i} style={S.optBtn} onClick={()=>handleOption(s,"stage")}>{s}</button>
        ))}
      </div>
    );
    if(step==="diet") return (
      <div style={S.optRow}>
        {t.diets.map((d,i)=>(
          <button key={i} style={S.optBtn} onClick={()=>handleOption(d,"diet")}>{d}</button>
        ))}
      </div>
    );
    if(step==="meals") return (
      <div style={S.optCol}>
        <div style={S.optRow}>
          {t.meals.map((m,i)=>{
            const ev = toEn(m);
            const sel = selectedMeals.includes(ev);
            return (
              <button key={i} style={{...S.optBtn,...(sel?S.optBtnSel:{})}} onClick={()=>handleOption(m,"meals-toggle")}>
                {sel?"  ":""}{m}
              </button>
            );
          })}
        </div>
        <button style={{...S.optBtn,...S.optBtnPrimary}} onClick={()=>handleOption("confirm","meals-confirm")}>
          {t.confirm} {selectedMeals.length>0?`(${selectedMeals.length})` : "(All)"}
        </button>
      </div>
    );
    if(step==="plan") return (
      <div style={S.optRow}>
        {t.plans.map((p,i)=>(
          <button key={i} style={S.optBtn} onClick={()=>handleOption(p,"plan")}>{p}</button>
        ))}
      </div>
    );
    if(step==="age") return (
      <div style={S.optCol}>
        <div style={S.optRow}>{t.ages.map((a,i)=><button key={i} style={S.optBtn} onClick={()=>handleOption(a,"age")}>{a}</button>)}</div>
        <button style={{...S.optBtn,...S.optBtnSkip}} onClick={()=>handleOption("skip","age")}>{t.skip}</button>
      </div>
    );
    if(step==="region") return (
      <div style={S.optCol}>
        <div style={S.optRow}>{t.regions.map((r,i)=><button key={i} style={S.optBtn} onClick={()=>handleOption(r,"region")}>{r}</button>)}</div>
        <button style={{...S.optBtn,...S.optBtnSkip}} onClick={()=>handleOption("skip","region")}>{t.skip}</button>
      </div>
    );
    if(step==="bmi") return (
      <div style={S.optCol}>
        <div style={S.optRow}>
          {["18","20","22","24","26","28","30"].map(b=>(
            <button key={b} style={{...S.optBtn,padding:"8px 14px",fontSize:13}} onClick={()=>handleOption(b,"bmi")}>{b}</button>
          ))}
        </div>
        <button style={{...S.optBtn,...S.optBtnSkip}} onClick={()=>handleOption("skip","bmi")}>{t.skip}</button>
      </div>
    );
    return null;
  };

  const renderResult = ()=>{
    if(!result) return null;
    const tx = T[lang||"en"];
    return (
      <div style={S.resultWrap}>
        {savingReport && <div style={S.saveNotice}>Saving your report...</div>}
        {reportSaved && <div style={{...S.saveNotice,...S.saveNoticeGreen}}>Report saved to your account</div>}
        <div style={S.recCards}>
          <div style={S.recCard}>
            <div style={S.recCardTitle}>{tx.exercises}</div>
            <div style={S.pillRow}>{result.exercises.map(e=><span key={e} style={{...S.pill,...S.pillGreen}}>{e}</span>)}</div>
          </div>
          <div style={S.recCard}>
            <div style={S.recCardTitle}>{tx.avoid}</div>
            <div style={S.pillRow}>{result.avoid.map(a=><span key={a} style={{...S.pill,...S.pillRed}}>{a}</span>)}</div>
          </div>
        </div>
        {result.days.map((day,di)=>(
          <div key={di} style={S.dayCard}>
            <div style={S.dayHead}>
              <span style={S.dayName}>{lang==="te"?(tx.days[["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(day.dayName)]||day.dayName):day.dayName}</span>
              <span style={S.dayDate}>{day.date}</span>
              <span style={S.dayCal}>{day.totalCal} {tx.calories}</span>
            </div>
            <div style={S.mealGrid}>
              {day.meals.map((meal,mi)=>{
                const mealLabel = lang==="te"?(tx.meals[["Breakfast","Lunch","Dinner","Snacks"].indexOf(meal.type)]||meal.type):meal.type;
                return (
                  <div key={mi} style={S.mealCard}>
                    <div style={S.mealType}>{mealLabel}</div>
                    <div style={S.mealFood}>{meal.food}</div>
                    <div style={S.mealMacros}>{meal.calories} kcal · {meal.carbs}g carbs · {meal.protein}g protein</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button style={S.restartBtn} onClick={handleRestart}>{tx.restart}</button>
      </div>
    );
  };

  return (
    <div style={S.chatRoot}>
      {/* Navbar */}
      <div style={S.navbar}>
        <div style={S.navBrand}>RetinaDiet</div>
        <div style={S.navRight}>
          {latestReport && (
            <button style={S.navBtn} onClick={()=>setShowReport(true)}>View Last Report</button>
          )}
          <div style={S.navUser}>{user.name}</div>
          <button style={S.navLogout} onClick={onLogout}>Sign Out</button>
        </div>
      </div>

      {/* Chat area */}
      <div style={S.chatArea} ref={chatRef}>
        {messages.map(msg=>(
          <div key={msg.id} style={msg.from==="user"?S.userRow:S.botRow}>
            {msg.from==="bot" && <div style={S.botAvatar}>RD</div>}
            <div style={msg.from==="user"?S.userBubble:S.botBubble}>{msg.text}</div>
          </div>
        ))}
        {speaking && (
          <div style={S.botRow}>
            <div style={S.botAvatar}>RD</div>
            <div style={S.botBubble}>
              <span style={S.dotAnim}/><span style={{...S.dotAnim,animationDelay:"0.2s"}}/><span style={{...S.dotAnim,animationDelay:"0.4s"}}/>
            </div>
          </div>
        )}
        {result && renderResult()}
      </div>

      {/* Options + Mic */}
      {step!=="result" && (
        <div style={S.inputArea}>
          <div style={S.hintText}>{t.tapOptions}</div>
          {renderOptions()}
          {step!=="lang" && (
            <div style={S.micRow}>
              <button style={{...S.micBtn,...(listening?S.micBtnActive:{})}} onClick={startListening} disabled={listening||speaking}>
                <span style={S.micLabel}>{listening ? t.speakNow : "Hold to Speak"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Report overlay */}
      {showReport && latestReport && (
        <ReportViewer report={latestReport} onClose={()=>setShowReport(false)} lang={lang}/>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function isSessionFresh() {
  const ts = localStorage.getItem("rd_login_ts");
  if (!ts) return false;
  return Date.now() - parseInt(ts) < SESSION_DURATION_MS;
}

export default function App() {
  const [user,    setUser]    = useState(()=>{ try{ return JSON.parse(localStorage.getItem("rd_user")); }catch{ return null; } });
  const [token,   setToken]   = useState(()=>localStorage.getItem("rd_token")||null);
  const [checked, setChecked] = useState(false); // prevent flash of login screen

  useEffect(()=>{
    const storedToken = localStorage.getItem("rd_token");
    const storedUser  = localStorage.getItem("rd_user");

    // If session is still fresh (within 30 min), trust localStorage — no API call needed
    if (storedToken && storedUser && isSessionFresh()) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {}
      setChecked(true);
      return;
    }

    // Session expired or no timestamp — verify with backend
    if (storedToken) {
      apiCall("/auth/me","GET",null,storedToken)
        .then(d=>{
          setUser(d.user);
          setToken(storedToken);
          localStorage.setItem("rd_user", JSON.stringify(d.user));
          localStorage.setItem("rd_login_ts", Date.now().toString()); // refresh timestamp
        })
        .catch(()=>{
          setUser(null); setToken(null);
          localStorage.removeItem("rd_token");
          localStorage.removeItem("rd_user");
          localStorage.removeItem("rd_login_ts");
        })
        .finally(()=>setChecked(true));
    } else {
      setChecked(true);
    }
  },[]);

  function handleLogin(u, t) {
    setUser(u); setToken(t);
    localStorage.setItem("rd_login_ts", Date.now().toString());
  }

  function handleLogout() {
    setUser(null); setToken(null);
    localStorage.removeItem("rd_token");
    localStorage.removeItem("rd_user");
    localStorage.removeItem("rd_login_ts");
  }

  // Don't render anything until we've checked auth — prevents flash of login screen
  if (!checked) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#faf8f4", fontFamily:"'DM Sans', sans-serif", color:"#5a5a5a", fontSize:14 }}>
      Loading...
    </div>
  );

  if (!user || !token) return <AuthScreen onLogin={handleLogin}/>;
  return <Chatbot user={user} token={token} onLogout={handleLogout}/>;
}

// ─────────────────────────────────────────────────────────────────
// STYLES — Light, refined, editorial
// ─────────────────────────────────────────────────────────────────
const sage    = "#4a7c59";
const sageLt  = "#e8f0ea";
const sageMid = "#c5dbc9";
const cream   = "#faf8f4";
const sand    = "#f2ede4";
const charcoal= "#1a1a1a";
const mid     = "#5a5a5a";
const border  = "#e2ddd6";
const white   = "#ffffff";
const red     = "#c0392b";
const redLt   = "#fdecea";

const S = {
  // ── Auth ──────────────────────────────────────────────────────
  authRoot: {
    display:"flex", minHeight:"100vh",
    fontFamily:"'DM Sans', 'Segoe UI', sans-serif",
    background: cream,
  },
  authLeft: {
    width:"45%", background:`linear-gradient(160deg, ${sage} 0%, #2d5a3d 100%)`,
    display:"flex", alignItems:"center", justifyContent:"center",
    position:"relative", overflow:"hidden",
    "@media(max-width:768px)": { display:"none" },
  },
  authLeftInner: { padding:48, zIndex:2, position:"relative" },
  authBrand: { fontSize:36, fontWeight:700, color:white, letterSpacing:"-1px", marginBottom:12, fontFamily:"'Playfair Display', Georgia, serif" },
  authTagline: { fontSize:16, color:"rgba(255,255,255,0.75)", lineHeight:1.6, marginBottom:40, maxWidth:300 },
  authFeatures: { display:"flex", flexDirection:"column", gap:14 },
  authFeatureItem: { display:"flex", alignItems:"center", gap:12, color:"rgba(255,255,255,0.85)", fontSize:14 },
  featureDot: { width:8, height:8, borderRadius:"50%", background:"rgba(255,255,255,0.6)", flexShrink:0 },
  authDecor1: {
    position:"absolute", top:-80, right:-80, width:300, height:300,
    borderRadius:"50%", background:"rgba(255,255,255,0.06)", zIndex:1,
  },
  authDecor2: {
    position:"absolute", bottom:-60, left:-60, width:200, height:200,
    borderRadius:"50%", background:"rgba(255,255,255,0.04)", zIndex:1,
  },
  authRight: {
    flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:32,
  },
  authCard: { width:"100%", maxWidth:420 },
  authCardTitle: { fontSize:28, fontWeight:700, color:charcoal, marginBottom:6, fontFamily:"'Playfair Display', Georgia, serif", letterSpacing:"-0.5px" },
  authCardSub: { fontSize:14, color:mid, marginBottom:28 },
  tabRow: { display:"flex", background:sand, borderRadius:10, padding:4, marginBottom:24, gap:4 },
  tab: { flex:1, padding:"9px 0", border:"none", background:"transparent", borderRadius:8, fontSize:14, fontWeight:500, color:mid, cursor:"pointer", transition:"all 0.2s", fontFamily:"inherit" },
  tabActive: { background:white, color:charcoal, fontWeight:600, boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  fieldWrap: { marginBottom:16 },
  label: { display:"block", fontSize:12, fontWeight:600, color:mid, marginBottom:6, letterSpacing:"0.4px", textTransform:"uppercase" },
  input: {
    width:"100%", padding:"12px 14px", border:`1.5px solid ${border}`, borderRadius:10,
    fontSize:14, color:charcoal, background:white, outline:"none",
    fontFamily:"inherit", boxSizing:"border-box", transition:"border 0.2s",
  },
  errorBox: { background:redLt, border:`1px solid ${red}`, borderRadius:8, padding:"10px 14px", fontSize:13, color:red, marginBottom:16 },
  primaryBtn: {
    width:"100%", padding:"13px", background:sage, color:white, border:"none",
    borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer",
    fontFamily:"inherit", transition:"all 0.2s", marginTop:4,
  },
  btnLoading: { opacity:0.7, cursor:"not-allowed" },

  // ── Navbar ────────────────────────────────────────────────────
  navbar: {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 24px", background:white, borderBottom:`1px solid ${border}`,
    position:"sticky", top:0, zIndex:20,
  },
  navBrand: { fontSize:18, fontWeight:700, color:charcoal, fontFamily:"'Playfair Display', Georgia, serif", letterSpacing:"-0.3px" },
  navRight: { display:"flex", alignItems:"center", gap:12 },
  navUser: { fontSize:14, color:mid, fontWeight:500 },
  navBtn: {
    padding:"7px 14px", background:sageLt, color:sage, border:`1.5px solid ${sageMid}`,
    borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
  },
  navLogout: {
    padding:"7px 14px", background:"transparent", color:mid, border:`1.5px solid ${border}`,
    borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit",
  },

  // ── Chatbot ───────────────────────────────────────────────────
  chatRoot: {
    display:"flex", flexDirection:"column", height:"100vh",
    background:cream, fontFamily:"'DM Sans', 'Segoe UI', sans-serif",
  },
  chatArea: {
    flex:1, overflowY:"auto", padding:"20px 24px",
    display:"flex", flexDirection:"column", gap:12,
    maxWidth:680, width:"100%", margin:"0 auto", alignSelf:"stretch",
  },
  botRow: { display:"flex", gap:10, alignItems:"flex-start" },
  userRow: { display:"flex", justifyContent:"flex-end" },
  botAvatar: {
    width:34, height:34, borderRadius:"50%", background:sage, color:white,
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:11, fontWeight:700, flexShrink:0, marginTop:2,
  },
  botBubble: {
    background:white, border:`1px solid ${border}`, borderRadius:"4px 16px 16px 16px",
    padding:"12px 16px", fontSize:14, color:charcoal, lineHeight:1.6,
    maxWidth:"75%", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
    display:"flex", alignItems:"center", gap:5,
  },
  userBubble: {
    background:sage, borderRadius:"16px 4px 16px 16px",
    padding:"12px 16px", fontSize:14, color:white, lineHeight:1.6,
    maxWidth:"72%", boxShadow:"0 2px 8px rgba(74,124,89,0.3)",
  },
  dotAnim: {
    display:"inline-block", width:7, height:7, background:sageMid, borderRadius:"50%",
    animation:"dotB 1s infinite",
  },

  // ── Options ───────────────────────────────────────────────────
  inputArea: {
    padding:"16px 24px 20px", background:white, borderTop:`1px solid ${border}`,
    maxWidth:680, width:"100%", margin:"0 auto", alignSelf:"stretch",
  },
  hintText: { fontSize:11, color:"#aaa", marginBottom:10, textAlign:"center", letterSpacing:"0.4px", textTransform:"uppercase" },
  optRow: { display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" },
  optCol: { display:"flex", flexDirection:"column", gap:8 },
  optBtn: {
    padding:"9px 18px", background:white, border:`1.5px solid ${border}`,
    borderRadius:20, fontSize:13.5, color:charcoal, fontWeight:500,
    cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit",
    whiteSpace:"nowrap",
  },
  optBtnSel: { background:sageLt, border:`1.5px solid ${sage}`, color:sage },
  optBtnPrimary: { background:sage, color:white, border:`1.5px solid ${sage}`, textAlign:"center" },
  optBtnSkip: { background:sand, border:`1.5px solid ${border}`, color:mid, textAlign:"center", fontSize:13 },
  micRow: { display:"flex", justifyContent:"center", marginTop:10 },
  micBtn: {
    padding:"10px 28px", background:sageLt, border:`1.5px solid ${sageMid}`,
    borderRadius:24, cursor:"pointer", fontFamily:"inherit", color:sage, fontWeight:600, fontSize:13,
  },
  micBtnActive: { background:sage, color:white },
  micLabel: { fontSize:13 },

  // ── Result ────────────────────────────────────────────────────
  resultWrap: { display:"flex", flexDirection:"column", gap:14, width:"100%" },
  saveNotice: { padding:"10px 16px", background:sand, borderRadius:8, fontSize:13, color:mid, textAlign:"center" },
  saveNoticeGreen: { background:sageLt, color:sage },
  recCards: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  recCard: { background:white, border:`1px solid ${border}`, borderRadius:12, padding:"14px 16px" },
  recCardTitle: { fontSize:11, fontWeight:700, color:mid, letterSpacing:"0.6px", textTransform:"uppercase", marginBottom:10 },
  pillRow: { display:"flex", flexWrap:"wrap", gap:6 },
  pill: { padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:500 },
  pillGreen: { background:sageLt, color:sage },
  pillRed:   { background:redLt, color:red },
  dayCard: { background:white, border:`1px solid ${border}`, borderRadius:12, overflow:"hidden" },
  dayHead: { display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:sand, borderBottom:`1px solid ${border}` },
  dayName: { fontSize:14, fontWeight:700, color:charcoal },
  dayDate: { fontSize:12, color:mid, marginLeft:"auto" },
  dayCal: { fontSize:13, fontWeight:600, color:sage },
  mealGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 },
  mealCard: { padding:"12px 16px", borderRight:`1px solid ${border}`, borderBottom:`1px solid ${border}` },
  mealType: { fontSize:10, fontWeight:700, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 },
  mealFood: { fontSize:13.5, color:charcoal, fontWeight:500, lineHeight:1.4, marginBottom:4 },
  mealMacros: { fontSize:11, color:"#bbb" },
  restartBtn: {
    padding:"12px 24px", background:white, border:`1.5px solid ${border}`,
    borderRadius:10, fontSize:14, fontWeight:600, color:mid, cursor:"pointer",
    fontFamily:"inherit", textAlign:"center",
  },

  // ── Report overlay ────────────────────────────────────────────
  reportOverlay: {
    position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:50,
    display:"flex", alignItems:"flex-end", justifyContent:"center",
    backdropFilter:"blur(4px)",
  },
  reportPanel: {
    background:white, borderRadius:"20px 20px 0 0",
    width:"100%", maxWidth:720, maxHeight:"90vh", overflowY:"auto",
    padding:"24px 28px",
  },
  reportHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  reportTitle: { fontSize:22, fontWeight:700, color:charcoal, fontFamily:"'Playfair Display', Georgia, serif" },
  reportDate: { fontSize:13, color:mid, marginTop:2 },
  closeBtn: { padding:"8px 18px", background:sand, border:`1px solid ${border}`, borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit", color:charcoal },
  reportMeta: { display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 },
  metaChip: { padding:"5px 12px", background:sand, borderRadius:20, fontSize:12, color:charcoal },
  metaKey: { fontWeight:600, color:mid },
  recRow: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 },
  recBlock: { background:sand, borderRadius:12, padding:"14px 16px" },
  recBlockTitle: { fontSize:11, fontWeight:700, color:mid, letterSpacing:"0.6px", textTransform:"uppercase", marginBottom:10 },
  reportDays: { display:"flex", flexDirection:"column", gap:12 },
  rDayCard: { border:`1px solid ${border}`, borderRadius:12, overflow:"hidden" },
  rDayHead: { display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:sageLt },
  rDayName: { fontSize:13, fontWeight:700, color:sage },
  rDayDate: { fontSize:12, color:mid, marginLeft:"auto" },
  rDayCal: { fontSize:12, fontWeight:600, color:sage },
  rMealGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))" },
  rMealCard: { padding:"10px 14px", borderRight:`1px solid ${border}`, borderBottom:`1px solid ${border}` },
  rMealType: { fontSize:10, fontWeight:700, color:"#bbb", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 },
  rMealFood: { fontSize:13, color:charcoal, fontWeight:500, marginBottom:3 },
  rMealMacros: { fontSize:11, color:"#bbb" },
};
