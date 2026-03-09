import { useState, useEffect, useRef, useCallback } from "react";

const API      = "http://localhost:5000/api";
const DIET_API = API;  // diet endpoints live under /api/diet on the same server

// ─── Data ─────────────────────────────────────────────────────────


const T = {
  en: {
    welcome:"Hello! I am your Diabetic Retinopathy Diet Assistant. I will help create a personalized meal plan for you.",
    askLang:"Please choose your preferred language to continue.",
    askStage:"What is your diabetic retinopathy stage?",
    askDiet:"What is your diet preference?",
    askMeals:"Which meals would you like in your plan? You may select multiple.",
    askPlan:"Would you like a plan for today, tomorrow, or the full week?",
    askAge:"What is your age group? This is optional.",
    askRegion:"Which region are you from? This is optional.",
    askBMI:"What is your BMI? This is optional.",
    generating:"Generating your personalized meal plan, please wait...",
    yourPlan:"Your personalized meal plan is ready!",
    exercises:"Recommended Exercises", avoid:"Foods to Avoid",
    tapOptions:"Tap an option or speak",
    skip:"Skip", confirm:"Confirm Selection", restart:"Generate New Plan",
    speakNow:"Listening...", notUnderstood:"Sorry, I did not catch that. Please tap an option or try again.",
    calories:"kcal",
    stages:["No retinopathy","Mild Retinopathy","Moderate Retinopathy","Severe Retinopathy","Proliferative Retinopathy"],
    diets:["Vegetarian","Vegan","Non Vegetarian"],
    meals:["Breakfast","Lunch","Dinner","Snacks"],
    plans:["Today","Tomorrow","Full Week"],
    ages:["18-25","26-35","36-45","46-60","60+"],
    regions:["North","South","East","West","Central"],
    days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  },
  te: {
    welcome:"నమస్కారం! నేను మీ డయాబెటిక్ రెటినోపతి డైట్ అసిస్టెంట్. మీకు వ్యక్తిగత భోజన ప్రణాళికను రూపొందించడానికి సహాయం చేస్తాను.",
    askLang:"కొనసాగించడానికి మీకు ఇష్టమైన భాషను ఎంచుకోండి.",
    askStage:"మీ డయాబెటిక్ రెటినోపతి దశ ఏమిటి?",
    askDiet:"మీ ఆహార ప్రాధాన్యత ఏమిటి?",
    askMeals:"మీ ప్రణాళికలో ఏ భోజనాలు కావాలి? మీరు అనేకం ఎంచుకోవచ్చు.",
    askPlan:"మీకు ఈరోజు, రేపు లేదా పూర్తి వారానికి ప్రణాళిక కావాలా?",
    askAge:"మీ వయస్సు గ్రూప్ ఏమిటి? ఇది ఐచ్ఛికం.",
    askRegion:"మీరు ఏ ప్రాంతం నుండి వచ్చారు? ఇది ఐచ్ఛికం.",
    askBMI:"మీ BMI ఎంత? ఇది ఐచ్ఛికం.",
    generating:"మీ వ్యక్తిగత భోజన ప్రణాళికను రూపొందిస్తున్నాను, దయచేసి వేచి ఉండండి...",
    yourPlan:"మీ వ్యక్తిగత భోజన ప్రణాళిక సిద్ధంగా ఉంది!",
    exercises:"సిఫార్సు చేసిన వ్యాయామాలు", avoid:"నివారించాల్సిన ఆహారాలు",
    tapOptions:"ఒక ఎంపికను నొక్కండి లేదా మాట్లాడండి",
    skip:"దాటవేయు", confirm:"ఎంపికను నిర్ధారించు", restart:"కొత్త ప్రణాళిక రూపొందించు",
    speakNow:"వినుతున్నాను...", notUnderstood:"క్షమించండి, అర్థం కాలేదు. దయచేసి ఒక ఎంపికను నొక్కండి లేదా మళ్ళీ ప్రయత్నించండి.",
    calories:"కేలరీలు",
    stages:["రెటినోపతి లేదు","తేలికపాటి రెటినోపతి","మితమైన రెటినోపతి","తీవ్రమైన రెటినోపతి","ప్రోలిఫెరేటివ్ రెటినోపతి"],
    diets:["శాకాహారి","వీగన్","మాంసాహారి"],
    meals:["అల్పాహారం","మధ్యాహ్న భోజనం","రాత్రి భోజనం","స్నాక్స్"],
    plans:["ఈరోజు","రేపు","పూర్తి వారం"],
    ages:["18-25","26-35","36-45","46-60","60+"],
    regions:["ఉత్తరం","దక్షిణం","తూర్పు","పశ్చిమం","మధ్యభాగం"],
    days:["ఆదివారం","సోమవారం","మంగళవారం","బుధవారం","గురువారం","శుక్రవారం","శనివారం"],
  },
};

const TE2EN = {
  "రెటినోపతి లేదు":"No retinopathy","తేలికపాటి రెటినోపతి":"Mild Retinopathy",
  "మితమైన రెటినోపతి":"Moderate Retinopathy","తీవ్రమైన రెటినోపతి":"Severe Retinopathy",
  "ప్రోలిఫెరేటివ్ రెటినోపతి":"Proliferative Retinopathy",
  "శాకాహారి":"Vegetarian","వీగన్":"Vegan","మాంసాహారి":"Non Vegetarian",
  "అల్పాహారం":"Breakfast","మధ్యాహ్న భోజనం":"Lunch","రాత్రి భోజనం":"Dinner","స్నాక్స్":"Snacks",
  "ఈరోజు":"today","రేపు":"tomorrow","పూర్తి వారం":"week",
  "ఉత్తరం":"North","దక్షిణం":"South","తూర్పు":"East","పశ్చిమం":"West","మధ్యభాగం":"Central",
};
const toEn = v => TE2EN[v] || v;
const EN_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ─── Helpers ──────────────────────────────────────────────────────

/** Call the ML diet API and transform response to the internal plan shape. */
async function fetchMLPlan(profile) {
  const { stage, diet, meals, planType, age, region, bmi } = profile;
  const body = {
    retinopathy_stage: stage,
    diet_preference:   diet,
    meal_types:        meals && meals.length > 0 ? meals : ["Breakfast","Lunch","Dinner","Snacks"],
    plan_type:         planType || "today",
    ...(age    ? { age_group: age }       : {}),
    ...(region ? { region }               : {}),
    ...(bmi    ? { bmi: parseFloat(bmi) } : {}),
  };
  const res = await fetch(`${DIET_API}/diet/meal-plan`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(err.detail?.message || err.detail || "Diet API error");
  }
  const data = await res.json();
  return {
    exercises:    data.exercise_recommendation?.recommended_exercises || [],
    avoid:        data.diet_recommendation?.foods_to_avoid            || [],
    exerciseNote: data.exercise_recommendation?.exercise_note         || "",
    dietNote:     data.diet_recommendation?.diet_note                 || "",
    days: (data.days || []).map(d => ({
      dayName:      d.day_name,
      date:         new Date(d.date + "T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"}),
      totalCal:     d.total_calories_kcal,
      totalCarbs:   d.total_carbohydrates_g,
      totalProtein: d.total_proteins_g,
      meals: (d.meals || []).map(m => ({
        type:         m.meal_type,
        food:         m.recommended_food,
        alternatives: m.alternatives || [],
        calories:     m.calories_kcal,
        carbs:        m.carbohydrates_g,
        protein:      m.proteins_g,
      })),
    })),
  };
}

async function api(path, method="GET", body=null, token=null) {
  const h = {"Content-Type":"application/json"};
  if (token) h["Authorization"] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`,{method,headers:h,body:body?JSON.stringify(body):null});
  const d = await r.json();
  if (!r.ok) throw new Error(d.message||"Request failed");
  return d;
}

// ─── Global Styles ────────────────────────────────────────────────
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body,#root{height:100%;}
    body{background:#f6f3ee;-webkit-font-smoothing:antialiased;font-family:'DM Sans','Segoe UI',sans-serif;}
    button{font-family:inherit;cursor:pointer;transition:background .15s,opacity .15s,transform .1s,box-shadow .15s;}
    button:active{transform:scale(0.97);opacity:.85;}
    input{font-family:inherit;}
    input:focus{outline:none!important;border-color:#4a7c59!important;box-shadow:0 0 0 3px rgba(74,124,89,.14)!important;}
    ::-webkit-scrollbar{width:5px;}
    ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px;}

    @keyframes dotB{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{transform:translateY(50px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(74,124,89,.35)}50%{box-shadow:0 0 0 10px rgba(74,124,89,0)}}
    .msg{animation:fadeUp .22s ease both;}
    .result{animation:slideUp .32s ease both;}
    .sheet{animation:slideUp .28s ease both;}

    /* ── Auth ── */
    .auth-root{display:flex;min-height:100vh;background:#f6f3ee;}
    .auth-left{width:44%;background:linear-gradient(150deg,#3d6b4a 0%,#2a4d35 55%,#1e3828 100%);display:flex;flex-direction:column;justify-content:center;padding:56px 48px;position:relative;overflow:hidden;flex-shrink:0;}
    .auth-decor1{position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.05);}
    .auth-decor2{position:absolute;bottom:-60px;left:-60px;width:210px;height:210px;border-radius:50%;background:rgba(255,255,255,.04);}
    .auth-right{flex:1;display:flex;align-items:center;justify-content:center;padding:40px 32px;overflow-y:auto;}
    .auth-card{width:100%;max-width:400px;}
    .auth-mobile-brand{display:none;margin-bottom:28px;}
    @media(max-width:700px){
      .auth-left{display:none!important;}
      .auth-right{padding:36px 20px;align-items:flex-start;padding-top:52px;}
      .auth-mobile-brand{display:block!important;}
      .auth-card{max-width:100%;}
    }
    .auth-tabs{display:flex;background:#f2ede4;border-radius:10px;padding:4px;gap:4px;margin-bottom:24px;}
    .auth-tab{flex:1;padding:10px 0;border:none;background:transparent;border-radius:7px;font-size:14px;font-weight:500;color:#888;}
    .auth-tab.active{background:#fff;color:#1a1a1a;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.08);}

    /* ── Chat root ── */
    .chat-root{display:flex;flex-direction:column;height:100vh;height:100dvh;background:#f6f3ee;}
    .chat-navbar{display:flex;align-items:center;justify-content:space-between;padding:13px 20px;background:#fff;border-bottom:1px solid #e8e3db;flex-shrink:0;z-index:10;}
    .chat-body{flex:1;display:flex;min-height:0;}
    .chat-sidebar{display:none;}
    @media(min-width:900px){
      .chat-sidebar{display:flex;flex-direction:column;width:290px;border-right:1px solid #e8e3db;background:#fff;padding:24px 20px;gap:0;overflow-y:auto;flex-shrink:0;}
    }
    .chat-main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0;}
    .chat-messages{flex:1;overflow-y:auto;padding:20px 16px 12px;}
    @media(min-width:768px){.chat-messages{padding:28px 32px 16px;}}
    .chat-messages-inner{max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:10px;}
    .chat-input{background:#fff;border-top:1px solid #e8e3db;padding:14px 16px 20px;flex-shrink:0;}
    @media(min-width:768px){.chat-input{padding:16px 32px 24px;}}
    .chat-input-inner{max-width:680px;margin:0 auto;}

    /* ── Option buttons ── */
    .opt{padding:10px 18px;background:#fff;border:1.5px solid #e2ddd6;border-radius:24px;font-size:13.5px;color:#1a1a1a;font-weight:500;}
    .opt:hover{background:#f0ece5;border-color:#b8d4be;}
    .opt.sel{background:#e8f0ea!important;border-color:#4a7c59!important;color:#4a7c59!important;}
    .opt.primary{background:#4a7c59!important;border-color:#4a7c59!important;color:#fff!important;}
    .opt.skip{background:#f2ede4!important;border-color:#e2ddd6!important;color:#999!important;}
    @media(max-width:380px){.opt{font-size:12.5px!important;padding:9px 14px!important;}}

    /* ── Grids ── */
    .meal-grid{display:grid;grid-template-columns:1fr 1fr;}
    @media(max-width:400px){.meal-grid{grid-template-columns:1fr;}}
    .rec-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    @media(max-width:500px){.rec-grid{grid-template-columns:1fr;}}

    /* ── Report sheet ── */
    .rpt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.28);backdrop-filter:blur(4px);z-index:50;display:flex;align-items:flex-end;justify-content:center;}
    .rpt-sheet{background:#fff;border-radius:22px 22px 0 0;width:100%;max-height:92vh;overflow-y:auto;padding:24px 20px 36px;}
    @media(min-width:700px){
      .rpt-overlay{align-items:center;padding:24px;}
      .rpt-sheet{border-radius:18px;max-width:680px;max-height:88vh;padding:32px 36px;}
    }
    .rpt-rec-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;}
    @media(max-width:500px){.rpt-rec-grid{grid-template-columns:1fr;}}
    .rpt-meal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));}
    @media(max-width:380px){.rpt-meal-grid{grid-template-columns:1fr 1fr;}}

    /* ── Mic ── */
    .mic-btn{padding:12px 40px;background:#fff;border:2px solid #c5dbc9;border-radius:30px;color:#4a7c59;font-weight:600;font-size:14px;min-width:180px;}
    .mic-btn:hover{background:#f0f8f2;}
    .mic-btn.active{background:#4a7c59;color:#fff;animation:micPulse 1.2s ease-in-out infinite;}
    .mic-btn:disabled{opacity:.65;cursor:default;}

    /* ── Nav ── */
    @media(max-width:440px){
      .nav-username{display:none!important;}
    }
    
    /* ── Step indicator ── */
    .step-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;font-weight:700;}
  `}</style>
);

// ─── Auth Screen ──────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode]   = useState("login");
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = m => { setMode(m); setErr(""); };

  async function submit() {
    setErr(""); setLoading(true);
    try {
      const path = mode==="login" ? "/auth/login" : "/auth/register";
      const body = mode==="login" ? {email,password:pass} : {name,email,password:pass};
      const d = await api(path,"POST",body);
      localStorage.setItem("rd_token",d.token);
      localStorage.setItem("rd_user",JSON.stringify(d.user));
      onLogin(d.user,d.token);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const inp = (label,type,val,set,ph) => (
    <div style={{marginBottom:16}}>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#aaa",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:6}}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
        onKeyDown={e=>e.key==="Enter"&&submit()}
        style={{width:"100%",padding:"12px 14px",border:"1.5px solid #e2ddd6",borderRadius:10,fontSize:14,color:"#1a1a1a",background:"#fff"}}/>
    </div>
  );

  return (
    <div className="auth-root">
      <GS/>
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-decor1"/><div className="auth-decor2"/>
        <div style={{position:"relative",zIndex:2}}>
          <div style={{fontSize:32,fontWeight:700,color:"#fff",fontFamily:"'Playfair Display',Georgia,serif",marginBottom:10,lineHeight:1.2}}>RetinaDiet</div>
          <div style={{fontSize:15,color:"rgba(255,255,255,.7)",lineHeight:1.75,marginBottom:40,maxWidth:280}}>
            Personalized nutrition guidance for diabetic retinopathy care
          </div>
          {["Voice-guided meal planning","English and Telugu support","Tailored to your retinopathy stage","Reports saved on every login"].map(f=>(
            <div key={f} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"rgba(255,255,255,.55)",flexShrink:0}}/>
              <span style={{fontSize:14,color:"rgba(255,255,255,.82)"}}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <div style={{fontSize:26,fontWeight:700,color:"#1a1a1a",fontFamily:"'Playfair Display',Georgia,serif"}}>RetinaDiet</div>
            <div style={{fontSize:13,color:"#bbb",marginTop:3}}>Diabetic Retinopathy Diet Assistant</div>
          </div>

          <div style={{fontSize:25,fontWeight:700,color:"#1a1a1a",fontFamily:"'Playfair Display',Georgia,serif",marginBottom:5}}>
            {mode==="login"?"Welcome back":"Create account"}
          </div>
          <div style={{fontSize:14,color:"#aaa",marginBottom:26}}>
            {mode==="login"?"Sign in to access your meal plans":"Join to get your personalized diet"}
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab${mode==="login"?" active":""}`} onClick={()=>switchMode("login")}>Sign In</button>
            <button className={`auth-tab${mode==="register"?" active":""}`} onClick={()=>switchMode("register")}>Register</button>
          </div>

          {mode==="register" && inp("Full Name","text",name,setName,"Your name")}
          {inp("Email Address","email",email,setEmail,"you@example.com")}
          {inp("Password","password",pass,setPass,"••••••••")}

          {err && <div style={{padding:"11px 14px",background:"#fdecea",border:"1px solid #f5c6c2",borderRadius:8,fontSize:13,color:"#c0392b",marginBottom:16}}>{err}</div>}

          <button onClick={submit} disabled={loading}
            style={{width:"100%",padding:"13px",background:"#4a7c59",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:600,opacity:loading?.7:1}}>
            {loading?"Please wait...":mode==="login"?"Sign In":"Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report Viewer ────────────────────────────────────────────────
function ReportViewer({ report, onClose, lang }) {
  const tx = T[lang||"en"];
  const { profile, plan, generatedAt } = report;
  const dateStr = new Date(generatedAt).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});

  return (
    <div className="rpt-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rpt-sheet sheet">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:"#1a1a1a",fontFamily:"'Playfair Display',Georgia,serif"}}>Latest Report</div>
            <div style={{fontSize:13,color:"#bbb",marginTop:2}}>{dateStr}</div>
          </div>
          <button onClick={onClose} style={{padding:"8px 16px",background:"#f2ede4",border:"1px solid #e2ddd6",borderRadius:8,fontSize:13,color:"#666"}}>Close</button>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:20}}>
          {[["Stage",profile.stage],["Diet",profile.diet],["Plan",profile.planType],
            ...(profile.age?[["Age",profile.age]]:[]),
            ...(profile.region?[["Region",profile.region]]:[]),
          ].map(([k,v])=>(
            <span key={k} style={{padding:"5px 12px",background:"#f2ede4",borderRadius:20,fontSize:12,color:"#555"}}>
              <span style={{fontWeight:700,color:"#aaa"}}>{k} </span>{v}
            </span>
          ))}
        </div>

        <div className="rpt-rec-grid">
          {[{title:tx.exercises,items:plan.exercises,green:true},{title:tx.avoid,items:plan.avoid,green:false}].map(({title,items,green})=>(
            <div key={title} style={{background:green?"#f0f8f2":"#fef7f6",border:`1px solid ${green?"#c5dbc9":"#f5c6c2"}`,borderRadius:12,padding:"13px 15px"}}>
              <div style={{fontSize:10,fontWeight:700,color:green?"#4a7c59":"#c0392b",letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:9}}>{title}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {items.map(i=><span key={i} style={{padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:500,background:green?"#d4edda":"#fdecea",color:green?"#2d6a3f":"#c0392b"}}>{i}</span>)}
              </div>
            </div>
          ))}
        </div>

        {plan.days.map((day,di)=>(
          <div key={di} style={{background:"#fff",border:"1px solid #e8e3db",borderRadius:12,overflow:"hidden",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,padding:"10px 15px",background:"#f8f5f0",borderBottom:"1px solid #e8e3db"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{day.dayName}</span>
              <span style={{fontSize:12,color:"#bbb",marginLeft:"auto"}}>{day.date}</span>
              <span style={{fontSize:13,fontWeight:600,color:"#4a7c59"}}>{day.totalCal} kcal</span>
            </div>
            <div className="rpt-meal-grid">
              {day.meals.map((meal,mi)=>(
                <div key={mi} style={{padding:"11px 13px",borderRight:"1px solid #f0ece5",borderBottom:"1px solid #f0ece5"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#ccc",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}}>{meal.type}</div>
                  <div style={{fontSize:13,color:"#1a1a1a",fontWeight:500,lineHeight:1.4,marginBottom:3}}>{meal.food}</div>
                  <div style={{fontSize:11,color:"#ccc"}}>{meal.calories} kcal</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chatbot ──────────────────────────────────────────────────────
function Chatbot({ user, token, onLogout }) {
  const [lang,setLang]         = useState(null);
  const [step,setStep]         = useState("lang");
  const [profile,setProfile]   = useState({meals:[]});
  const [msgs,setMsgs]         = useState([]);
  const [listening,setListening] = useState(false);
  const [speaking,setSpeaking] = useState(false);
  const [result,setResult]     = useState(null);
  const [selMeals,setSelMeals] = useState([]);
  const [latestRpt,setLatestRpt] = useState(null);
  const [showRpt,setShowRpt]   = useState(false);
  const [saving,setSaving]     = useState(false);
  const [saved,setSaved]       = useState(false);

  const chatRef = useRef(null);
  const synth   = useRef(window.speechSynthesis);
  const didInit = useRef(false);
  const t = T[lang||"en"];

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[msgs,result]);

  useEffect(()=>{
    if(!token) return;
    api("/reports/latest","GET",null,token).then(d=>setLatestRpt(d.report)).catch(()=>{});
  },[token]);

  const speak = useCallback((text,l)=>{
    if(!synth.current) return;
    synth.current.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang=l==="te"?"te-IN":"en-IN"; u.rate=0.9;
    setSpeaking(true); u.onend=()=>setSpeaking(false);
    synth.current.speak(u);
  },[]);

  const addMsg = useCallback((text,from="bot")=>{
    setMsgs(p=>[...p,{text,from,id:Date.now()+Math.random()}]);
  },[]);

  useEffect(()=>{
    if(didInit.current) return;
    didInit.current=true;
    const w=T.en.welcome, a=T.en.askLang;
    addMsg(w); addMsg(a);
    setTimeout(()=>speak(w+" "+a,"en"),300);
  },[]);

  const norm=s=>s.toLowerCase().replace(/[.,!?।؟\-]/g,"").trim();
  const fuzzy=(txt,opts)=>{
    const nt=norm(txt);
    const ex=opts.find(o=>norm(o)===nt); if(ex) return ex;
    const co=opts.find(o=>nt.includes(norm(o))||norm(o).includes(nt)); if(co) return co;
    const ws=nt.split(/\s+/); let best=null,bs=0;
    for(const o of opts){const ow=norm(o).split(/\s+/);const sc=ws.filter(w=>ow.includes(w)).length;if(sc>bs){bs=sc;best=o;}}
    return bs>0?best:null;
  };

  const startListening=useCallback(()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice recognition requires Chrome or Edge.");return;}
    const rec=new SR(); rec.lang=lang==="te"?"te-IN":"en-IN"; rec.interimResults=false; rec.maxAlternatives=3;
    setListening(true); rec.start();
    rec.onresult=e=>{
      const alts=Array.from({length:e.results[0].length},(_,i)=>e.results[0][i].transcript.trim());
      const raw=alts[0]; setListening(false); addMsg(raw,"user");
      const lo=norm(raw);
      if(step==="lang"){handleOption(lo.includes("telugu")||lo.includes("తెలుగు")?"te":"en","lang");return;}
      const isSkip=lo.includes("skip")||lo.includes("దాటు")||lo.includes("next")||lo.includes("pass");
      if(["age","region","bmi"].includes(step)&&isSkip){handleOption("skip",step);return;}
      if(step==="stage"){let m=null;for(const a of alts){m=fuzzy(a,t.stages);if(m)break;}if(m){handleOption(m,"stage");return;}}
      if(step==="diet"){
        let m=null;for(const a of alts){m=fuzzy(a,t.diets);if(m)break;}
        if(!m){if(lo.includes("vegan"))m=t.diets[1];else if(lo.includes("veg")&&!lo.includes("non"))m=t.diets[0];else if(lo.includes("non")||lo.includes("meat")||lo.includes("chicken")||lo.includes("fish"))m=t.diets[2];}
        if(m){handleOption(m,"diet");return;}
      }
      if(step==="meals"){
        let m=null;for(const a of alts){m=fuzzy(a,t.meals);if(m)break;}
        if(m){handleOption(m,"meals-toggle");return;}
        if(lo.includes("confirm")||lo.includes("done")||lo.includes("ok")||lo.includes("yes")){handleOption("confirm","meals-confirm");return;}
      }
      if(step==="plan"){
        let m=null;for(const a of alts){m=fuzzy(a,t.plans);if(m)break;}
        if(!m){if(lo.includes("today")||lo.includes("now"))m=t.plans[0];else if(lo.includes("tomorrow"))m=t.plans[1];else if(lo.includes("week")||lo.includes("seven")||lo.includes("7"))m=t.plans[2];}
        if(m){handleOption(m,"plan");return;}
      }
      if(step==="age"){const m=fuzzy(raw,t.ages);if(m){handleOption(m,"age");return;}const dg=raw.match(/\d+/g);if(dg){const n=parseInt(dg[0]);const mp=[[18,25,"18-25"],[26,35,"26-35"],[36,45,"36-45"],[46,60,"46-60"],[61,120,"60+"]];const f=mp.find(([lo,hi])=>n>=lo&&n<=hi);if(f){handleOption(f[2],"age");return;}}}
      if(step==="region"){let m=null;for(const a of alts){m=fuzzy(a,t.regions);if(m)break;}if(m){handleOption(m,"region");return;}}
      if(step==="bmi"){const dg=raw.match(/\d+(\.\d+)?/);if(dg){handleOption(dg[0],"bmi");return;}}
      addMsg(t.notUnderstood); speak(t.notUnderstood,lang);
    };
    rec.onerror=()=>setListening(false); rec.onend=()=>setListening(false);
  },[lang,step,t]);

  const handleOption=useCallback((value,forStep)=>{
    const l=forStep==="lang"?(value==="te"?"te":"en"):lang;
    const tx=T[l];
    const next=(msg,s)=>setTimeout(()=>{addMsg(msg);speak(msg,l);setStep(s);},400);
    if(forStep==="lang"){setLang(value);addMsg(value==="te"?"తెలుగు":"English","user");next(tx.askStage,"stage");return;}
    if(forStep==="stage"){setProfile(p=>({...p,stage:toEn(value)}));addMsg(value,"user");next(tx.askDiet,"diet");return;}
    if(forStep==="diet"){setProfile(p=>({...p,diet:toEn(value)}));addMsg(value,"user");setTimeout(()=>{addMsg(tx.askMeals);speak(tx.askMeals,l);setStep("meals");setSelMeals([]);},400);return;}
    if(forStep==="meals-toggle"){const ev=toEn(value);setSelMeals(p=>p.includes(ev)?p.filter(m=>m!==ev):[...p,ev]);return;}
    if(forStep==="meals-confirm"){const fm=selMeals.length>0?selMeals:["Breakfast","Lunch","Dinner","Snacks"];setProfile(p=>({...p,meals:fm}));addMsg(fm.join(", "),"user");next(tx.askPlan,"plan");return;}
    if(forStep==="plan"){const pm={"Today":"today","Tomorrow":"tomorrow","Full Week":"week",today:"today",tomorrow:"tomorrow",week:"week","ఈరోజు":"today","రేపు":"tomorrow","పూర్తి వారం":"week"};const pv=pm[toEn(value)]||pm[value]||"today";setProfile(p=>({...p,planType:pv}));addMsg(value,"user");next(tx.askAge,"age");return;}
    if(forStep==="age"){if(value!=="skip")setProfile(p=>({...p,age:value}));addMsg(value==="skip"?tx.skip:value,"user");next(tx.askRegion,"region");return;}
    if(forStep==="region"){if(value!=="skip")setProfile(p=>({...p,region:toEn(value)}));addMsg(value==="skip"?tx.skip:value,"user");next(tx.askBMI,"bmi");return;}
    if(forStep==="bmi"){
      if(value!=="skip")setProfile(p=>({...p,bmi:value}));
      addMsg(value==="skip"?tx.skip:value,"user");
      setTimeout(async ()=>{
        addMsg(tx.generating);speak(tx.generating,l);setStep("result");
        const fp={...profile,planType:profile.planType||"today",language:l};
        if(value!=="skip")fp.bmi=value;
        try {
          const plan = await fetchMLPlan(fp);
          setResult(plan);
          addMsg(tx.yourPlan);speak(tx.yourPlan,l);
          // Convert ML plan → report format for save
          const reportPlan = {
            exercises: plan.exercises,
            avoid:     plan.avoid,
            days: plan.days.map(d=>({
              dayName:  d.dayName,
              date:     d.date,
              totalCal: d.totalCal,
              meals: d.meals.map(m=>({
                type:     m.type,
                food:     m.food,
                calories: m.calories,
                carbs:    m.carbs,
                protein:  m.protein,
              })),
            })),
          };
          setSaving(true);
          api("/reports","POST",{profile:fp,plan:reportPlan},token)
            .then(()=>{setSaved(true);setSaving(false);return api("/reports/latest","GET",null,token);})
            .then(d=>setLatestRpt(d.report)).catch(()=>setSaving(false));
        } catch(err) {
          setStep("bmi");
          addMsg("⚠️ Could not reach the diet API. Please ensure diet_api.py is running on port 8000. Error: "+err.message);
        }
      },400);
    }
  },[lang,step,selMeals,profile,speak,addMsg,token]);

  const restart=()=>{
    setLang(null);setStep("lang");setProfile({meals:[]});setSelMeals([]);
    setResult(null);setSaved(false);setMsgs([]);didInit.current=false;
    setTimeout(()=>{didInit.current=true;addMsg(T.en.welcome);addMsg(T.en.askLang);setTimeout(()=>speak(T.en.welcome+" "+T.en.askLang,"en"),300);},150);
  };

  // ── Options ────────────────────────────────────────────────────
  const Opts=()=>{
    const row=(items,cb)=>(
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {items.map((x,i)=><button key={i} className="opt" onClick={()=>cb(x)}>{x}</button>)}
      </div>
    );
    if(step==="lang") return row(["English","తెలుగు"],v=>handleOption(v==="English"?"en":"te","lang"));
    if(step==="stage") return (
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {t.stages.map((s,i)=><button key={i} className="opt" style={{textAlign:"left"}} onClick={()=>handleOption(s,"stage")}>{s}</button>)}
      </div>
    );
    if(step==="diet") return row(t.diets,v=>handleOption(v,"diet"));
    if(step==="meals") return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {t.meals.map((m,i)=>{const ev=toEn(m);const sel=selMeals.includes(ev);
            return <button key={i} className={`opt${sel?" sel":""}`} onClick={()=>handleOption(m,"meals-toggle")}>{m}</button>;
          })}
        </div>
        <button className="opt primary" onClick={()=>handleOption("confirm","meals-confirm")}>
          {t.confirm}{selMeals.length>0?` (${selMeals.length})`:" (All)"}
        </button>
      </div>
    );
    if(step==="plan") return row(t.plans,v=>handleOption(v,"plan"));
    const skipBtn=<button className="opt skip" style={{width:"100%",marginTop:2}} onClick={()=>handleOption("skip",step)}>{t.skip}</button>;
    if(step==="age")    return <div style={{display:"flex",flexDirection:"column",gap:8}}>{row(t.ages,v=>handleOption(v,"age"))}{skipBtn}</div>;
    if(step==="region") return <div style={{display:"flex",flexDirection:"column",gap:8}}>{row(t.regions,v=>handleOption(v,"region"))}{skipBtn}</div>;
    if(step==="bmi")    return (
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {["18","20","22","24","26","28","30"].map(b=><button key={b} className="opt" style={{padding:"9px 15px",fontSize:13}} onClick={()=>handleOption(b,"bmi")}>{b}</button>)}
        </div>
        {skipBtn}
      </div>
    );
    return null;
  };

  // ── Result ─────────────────────────────────────────────────────
  const Result=()=>{
    const tx=T[lang||"en"];
    return (
      <div className="result" style={{display:"flex",flexDirection:"column",gap:12,width:"100%"}}>
        {(saving||saved)&&(
          <div style={{padding:"10px 14px",background:saved?"#edf7f0":"#f8f5f0",border:`1px solid ${saved?"#b8d9c1":"#e2ddd6"}`,borderRadius:8,fontSize:13,color:saved?"#2d6a3f":"#999",textAlign:"center"}}>
            {saving?"Saving your report...":"Report saved to your account"}
          </div>
        )}
        <div className="rec-grid">
          {[{title:tx.exercises,items:result.exercises,green:true},{title:tx.avoid,items:result.avoid,green:false}].map(({title,items,green})=>(
            <div key={title} style={{background:green?"#f0f8f2":"#fef7f6",border:`1px solid ${green?"#c5dbc9":"#f5c6c2"}`,borderRadius:12,padding:"13px 15px"}}>
              <div style={{fontSize:10,fontWeight:700,color:green?"#4a7c59":"#c0392b",letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:9}}>{title}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {items.map(i=><span key={i} style={{padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:500,background:green?"#d4edda":"#fdecea",color:green?"#2d6a3f":"#c0392b"}}>{i}</span>)}
              </div>
            </div>
          ))}
        </div>
        {/* ML badge */}
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",background:"#f0f8f2",border:"1px solid #c5dbc9",borderRadius:8,fontSize:12,color:"#4a7c59"}}>
          <span style={{fontWeight:700,fontSize:11,letterSpacing:"0.4px"}}>🤖 ML-POWERED</span>
          <span style={{color:"#6aaa7c"}}>Recommendations generated by KNN model trained on 10,000 patient records</span>
        </div>
        {result.days.map((day,di)=>{
          const dLabel=lang==="te"?(tx.days[EN_DAYS.indexOf(day.dayName)]||day.dayName):day.dayName;
          return (
            <div key={di} style={{background:"#fff",border:"1px solid #e8e3db",borderRadius:12,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,padding:"11px 15px",background:"#f8f5f0",borderBottom:"1px solid #e8e3db"}}>
                <span style={{fontSize:14,fontWeight:700,color:"#1a1a1a"}}>{dLabel}</span>
                <span style={{fontSize:12,color:"#bbb",marginLeft:"auto"}}>{day.date}</span>
                <span style={{fontSize:13,fontWeight:600,color:"#4a7c59"}}>{day.totalCal} {tx.calories}</span>
              </div>
              <div className="meal-grid">
                {day.meals.map((meal,mi)=>{
                  const mLabel=lang==="te"?(tx.meals[["Breakfast","Lunch","Dinner","Snacks"].indexOf(meal.type)]||meal.type):meal.type;
                  return (
                    <div key={mi} style={{padding:"11px 14px",borderRight:"1px solid #f0ece5",borderBottom:"1px solid #f0ece5"}}>
                      <div style={{fontSize:10,fontWeight:700,color:"#ccc",textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4}}>{mLabel}</div>
                      <div style={{fontSize:13.5,color:"#1a1a1a",fontWeight:500,lineHeight:1.4,marginBottom:4}}>{meal.food}</div>
                      <div style={{fontSize:11,color:"#ccc",marginBottom: meal.alternatives?.length ? 5 : 0}}>{meal.calories} kcal · {meal.carbs}g carbs · {meal.protein}g protein</div>
                      {meal.alternatives && meal.alternatives.length > 0 && (
                        <div style={{fontSize:10,color:"#b8b0a8"}}>
                          <span style={{fontWeight:600}}>Alt: </span>{meal.alternatives.join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <button onClick={restart} style={{padding:"13px",background:"#fff",border:"1.5px solid #e2ddd6",borderRadius:10,fontSize:14,fontWeight:600,color:"#777",width:"100%"}}>
          {tx.restart}
        </button>
      </div>
    );
  };

  // ── Sidebar (desktop ≥ 900px) ──────────────────────────────────
  const STEP_KEYS=["lang","stage","diet","meals","plan","age","region","bmi","result"];
  const STEP_LABELS=["Language","Stage","Diet","Meals","Plan","Age","Region","BMI"];
  const curIdx=STEP_KEYS.indexOf(step);

  return (
    <div className="chat-root">
      {/* Navbar */}
      <nav className="chat-navbar">
        <div style={{fontWeight:700,fontSize:17,color:"#1a1a1a",fontFamily:"'Playfair Display',Georgia,serif"}}>RetinaDiet</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {latestRpt&&(
            <button onClick={()=>setShowRpt(true)}
              style={{padding:"7px 14px",background:"#e8f0ea",color:"#4a7c59",border:"1.5px solid #c5dbc9",borderRadius:8,fontSize:13,fontWeight:600}}>
              Last Report
            </button>
          )}
          <span className="nav-username" style={{fontSize:13,color:"#aaa",fontWeight:500,maxWidth:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</span>
          <button onClick={onLogout} style={{padding:"7px 13px",background:"transparent",color:"#aaa",border:"1.5px solid #e2ddd6",borderRadius:8,fontSize:13}}>Sign Out</button>
        </div>
      </nav>

      <div className="chat-body">
        {/* Sidebar — desktop only */}
        <div className="chat-sidebar">
          <div style={{marginBottom:24}}>
            <div style={{fontSize:13,fontWeight:600,color:"#333",marginBottom:2}}>{user.name}</div>
            <div style={{fontSize:12,color:"#bbb",wordBreak:"break-all"}}>{user.email}</div>
          </div>

          {latestRpt&&(
            <button onClick={()=>setShowRpt(true)}
              style={{width:"100%",padding:"10px 14px",background:"#e8f0ea",border:"1.5px solid #c5dbc9",borderRadius:9,fontSize:13,fontWeight:600,color:"#4a7c59",marginBottom:10}}>
              View Last Report
            </button>
          )}
          <button onClick={onLogout}
            style={{width:"100%",padding:"10px 14px",background:"transparent",border:"1.5px solid #e2ddd6",borderRadius:9,fontSize:13,color:"#aaa",marginBottom:28}}>
            Sign Out
          </button>

          <div style={{borderTop:"1px solid #f0ece5",paddingTop:20}}>
            <div style={{fontSize:11,fontWeight:700,color:"#ccc",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:14}}>Progress</div>
            {STEP_LABELS.map((label,i)=>{
              const done=i<curIdx, active=STEP_KEYS[i]===step;
              return (
                <div key={label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  <div className="step-dot" style={{background:active?"#4a7c59":done?"#d4edda":"#f0ece5",border:`2px solid ${active?"#4a7c59":done?"#b8d9c1":"#e2ddd6"}`,color:active?"#fff":done?"#4a7c59":"#ccc"}}>
                    {done?"✓":(i+1)}
                  </div>
                  <span style={{fontSize:13,color:active?"#1a1a1a":done?"#4a7c59":"#bbb",fontWeight:active?600:400}}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main chat column */}
        <div className="chat-main">
          <div className="chat-messages" ref={chatRef}>
            <div className="chat-messages-inner">
              {msgs.map(msg=>(
                <div key={msg.id} className="msg" style={{display:"flex",justifyContent:msg.from==="user"?"flex-end":"flex-start",gap:9,alignItems:"flex-end"}}>
                  {msg.from==="bot"&&(
                    <div style={{width:32,height:32,borderRadius:"50%",background:"#4a7c59",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0,marginBottom:2}}>RD</div>
                  )}
                  <div style={{
                    padding:"11px 16px",
                    borderRadius:msg.from==="user"?"16px 4px 16px 16px":"4px 16px 16px 16px",
                    background:msg.from==="user"?"#4a7c59":"#fff",
                    border:msg.from==="user"?"none":"1px solid #e8e3db",
                    color:msg.from==="user"?"#fff":"#1a1a1a",
                    fontSize:14,lineHeight:1.6,maxWidth:"78%",
                    boxShadow:msg.from==="user"?"0 2px 8px rgba(74,124,89,.22)":"0 1px 3px rgba(0,0,0,.04)",
                  }}>{msg.text}</div>
                </div>
              ))}

              {speaking&&(
                <div style={{display:"flex",gap:9,alignItems:"flex-end"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:"#4a7c59",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,flexShrink:0}}>RD</div>
                  <div style={{padding:"13px 16px",background:"#fff",border:"1px solid #e8e3db",borderRadius:"4px 16px 16px 16px",display:"flex",gap:5,alignItems:"center"}}>
                    {[0,.2,.4].map(d=><span key={d} style={{display:"inline-block",width:7,height:7,background:"#c5dbc9",borderRadius:"50%",animation:`dotB 1s ${d}s infinite`}}/>)}
                  </div>
                </div>
              )}

              {result&&<Result/>}
            </div>
          </div>

          {step!=="result"&&(
            <div className="chat-input">
              <div className="chat-input-inner">
                <div style={{fontSize:10,color:"#ccc",marginBottom:10,textAlign:"center",letterSpacing:"0.5px",textTransform:"uppercase"}}>{t.tapOptions}</div>
                <Opts/>
                {step!=="lang"&&(
                  <div style={{display:"flex",justifyContent:"center",marginTop:14}}>
                    <button onClick={startListening} disabled={listening||speaking}
                      className={`mic-btn${listening?" active":""}`}>
                      {listening?t.speakNow:"Hold to Speak"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRpt&&latestRpt&&<ReportViewer report={latestRpt} onClose={()=>setShowRpt(false)} lang={lang}/>}
    </div>
  );
}

// ─── Session ──────────────────────────────────────────────────────
const SESSION_MS=30*60*1000;
const freshSession=()=>{const ts=localStorage.getItem("rd_login_ts");return ts&&Date.now()-parseInt(ts)<SESSION_MS;};

// ─── Root App ─────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]   = useState(null);
  const [token,setToken] = useState(null);
  const [ready,setReady] = useState(false);

  useEffect(()=>{
    const st=localStorage.getItem("rd_token");
    const su=localStorage.getItem("rd_user");
    if(st&&su&&freshSession()){
      try{setUser(JSON.parse(su));setToken(st);}catch{}
      setReady(true);return;
    }
    if(st){
      api("/auth/me","GET",null,st)
        .then(d=>{setUser(d.user);setToken(st);localStorage.setItem("rd_user",JSON.stringify(d.user));localStorage.setItem("rd_login_ts",Date.now().toString());})
        .catch(()=>{["rd_token","rd_user","rd_login_ts"].forEach(k=>localStorage.removeItem(k));})
        .finally(()=>setReady(true));
    } else { setReady(true); }
  },[]);

  const login=(u,t)=>{setUser(u);setToken(t);localStorage.setItem("rd_login_ts",Date.now().toString());};
  const logout=()=>{setUser(null);setToken(null);["rd_token","rd_user","rd_login_ts"].forEach(k=>localStorage.removeItem(k));};

  if(!ready) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f6f3ee",color:"#bbb",fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>
      <GS/>
      <div style={{textAlign:"center"}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:"#4a7c59",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,margin:"0 auto 12px"}}>RD</div>
        Loading...
      </div>
    </div>
  );

  return (
    <>
      <GS/>
      {(!user||!token)?<AuthScreen onLogin={login}/>:<Chatbot user={user} token={token} onLogout={logout}/>}
    </>
  );
}