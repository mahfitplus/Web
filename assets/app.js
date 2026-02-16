/* =========================================================
   MAH FIT - app.js (ESTABLE / LISTO PARA REEMPLAZAR)
   - Backend Google Sheets Apps Script (resource-based)
   - Cache local: users / planes / rutinas / rutinas_v2 / plantillas_v2
   - ✅ Perfil syncDown completo
   - ✅ LOGS PRO: workout_log / cardio_log / body_log
   - ✅ PRO PATCH: IDs robustos + compat logId/id + fallback sync
   - ✅ NUEVO: EVALUATIONS (evaluaciones corporales + informe)
   - ✅ UPDATE: compat masaMuscularPct (para gráficos + socio.html)
   - ✅ NUEVO: EVALUATION PHOTOS (Drive upload + URLs en EVALUATIONS)
   - ✅ FIX CRÍTICO: apiPost ÚNICO + token SIEMPRE (arregla "No autorizado" al guardar perfil)
   ========================================================= */

// ✅ NUEVO API_URL (tu implementación actual)
const API_URL_DEFAULT = "https://script.google.com/macros/s/AKfycbwxxetYZHZbHWou4jFE7_yOs-7yaz_jHVuXbHxV87JqU8kc7gk3s9PLrMQ5n0djk5RzdA/exec";

// ================= AUTH TOKEN (MAH FIT PRO) =================
const TOKEN_KEY = "MAHFIT_TOKEN";
const USER_KEY  = "MAHFIT_USER";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function setToken(token, user) {
  localStorage.setItem(TOKEN_KEY, token || "");
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function getUserSession() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch(e){ return null; }
}

// ================= COMPAT (admin.html antiguo) =================
// admin.html / vistas históricas usan estas funciones y la key "mahfit_session".
// Mantenerlas evita que se rompan botones (Salir) y visores/modales.
function setUserSession(token, user){
  // token+user (nuevo esquema)
  setToken(token, user);
  // snapshot legacy
  try {
    const legacy = {
      token: token || "",
      rut: user && user.rut ? String(user.rut) : "",
      rol: user && user.rol ? String(user.rol) : "",
      user: user || null,
      at: new Date().toISOString()
    };
    localStorage.setItem("mahfit_session", JSON.stringify(legacy));
  } catch(e){}
}

function clearUserSession(){
  clearToken();
  try { localStorage.removeItem("mahfit_session"); } catch(e){}
}

function getSession(){
  // prefer nuevo
  const u = getUserSession();
  if(u) return u;
  // fallback legacy
  try { return JSON.parse(localStorage.getItem("mahfit_session") || "null"); } catch(e){ return null; }
}

// Permite override: localStorage.MAHFIT_API_URL o window.MAHFIT_API_URL
function getApiUrl_(){
  try {
    return (localStorage.getItem("MAHFIT_API_URL") || window.MAHFIT_API_URL || API_URL_DEFAULT).trim();
  } catch(e){
    return (window.MAHFIT_API_URL || API_URL_DEFAULT).trim();
  }
}

// ✅ compat: algunas partes llaman getApiUrl() (sin guión bajo)
function getApiUrl(){
  return API_URL_DEFAULT; // ✅ sin override por localStorage
}


/* ---------------- small compat ---------------- */
(function ensureUUID(){
  if(!window.crypto) window.crypto = {};
  if(typeof window.crypto.randomUUID !== "function"){
    window.crypto.randomUUID = function(){
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c=>{
        const r = Math.random()*16|0;
        const v = (c==="x") ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    };
  }
})();

// ---------------- DOMContentLoaded GATE ----------------
(function(){
  const origAdd = document.addEventListener.bind(document);
  const queued = [];
  let ready = false;

  document.addEventListener = function(type, listener, options){
    if(type === "DOMContentLoaded"){
      if(ready){
        try{ listener(); }catch(e){ console.error(e); }
      } else {
        queued.push(listener);
      }
      return;
    }
    return origAdd(type, listener, options);
  };

  window.__mahfitReleaseDOMContentLoaded = function(){
    ready = true;
    queued.forEach(fn=>{ try{ fn(); }catch(e){ console.error(e); } });
    queued.length = 0;
  };
})();

// ---------------- LocalStorage helpers ----------------
const LS = {
  get(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch{ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  del(key){ localStorage.removeItem(key); }
};

function normalizeRut(r){ return String(r||"").trim().toLowerCase().replace(/[^0-9k]/g,""); }

/* ======================= RUT VALIDATION (Chile) =======================
   - Valida DV (módulo 11)
   - Retorna canonical: XXXXXXXX-DV (sin puntos)
====================================================================== */
function rutParts(rutRaw){
  const raw = String(rutRaw || "").trim().toLowerCase();
  if(!raw) return null;
  const clean = raw.replace(/\./g,"").replace(/\s+/g,"");
  let body = "", dv = "";
  if(clean.includes("-")){
    const parts = clean.split("-");
    body = (parts[0] || "").replace(/[^0-9]/g,"");
    dv = String(parts[1] || "").replace(/[^0-9k]/g,"");
  } else {
    const only = clean.replace(/[^0-9k]/g,"");
    if(only.length < 2) return null;
    body = only.slice(0, -1).replace(/[^0-9]/g,"");
    dv = only.slice(-1);
  }
  if(!body || !dv) return null;
  return { body, dv: dv.toLowerCase() };
}
function rutDvCalc(bodyDigits){
  const s = String(bodyDigits || "").replace(/[^0-9]/g,"");
  if(!s) return "";
  let sum = 0, mul = 2;
  for(let i = s.length - 1; i >= 0; i--){
    sum += Number(s[i]) * mul;
    mul = (mul === 7) ? 2 : (mul + 1);
  }
  const mod = 11 - (sum % 11);
  if(mod === 11) return "0";
  if(mod === 10) return "k";
  return String(mod);
}
function validateRutChile(rutRaw){
  const p = rutParts(rutRaw);
  if(!p) return { ok:false, error:"RUT inválido" };
  const dv = rutDvCalc(p.body);
  if(dv !== p.dv) return { ok:false, error:"Dígito verificador inválido" };
  return { ok:true, canonical: `${p.body}-${dv.toUpperCase()}` };
}
function requireRutChile(rutRaw, label){
  const v = validateRutChile(rutRaw);
  if(!v.ok) throw new Error((label || "RUT") + ": " + v.error);
  return v.canonical;
}

// ✅ COMPAT: algunas pantallas antiguas llaman validateRut_() y esperan { ok, fmt }
function validateRut_(rutRaw){
  const v = validateRutChile(rutRaw);
  return v.ok ? { ok:true, fmt:v.canonical } : { ok:false, error:v.error };
}

// ✅ UTIL: si el usuario escribe SOLO cuerpo (sin DV), calculamos DV y devolvemos canonical
function rutAutoComplete_(rutMaybeBody){
  const s = String(rutMaybeBody||"").trim().replace(/\./g,"").replace(/\s+/g,"");
  if(!s) return "";
  if(s.includes("-")) return s;

  const only = s.replace(/[^0-9kK]/g,"");
  const body = only.replace(/[^0-9]/g,"");
  if(body.length < 7) return only;

  const dv = rutDvCalc(body);
  return body + "-" + String(dv).toUpperCase();
}

// ✅ LOGIN HYBRID: detecta si el input es RUT válido (o RUT con DV incorrecto) o username
function parseLoginIdentifier_(input){
  const raw = String(input || "").trim();
  if(!raw) return { ok:false, error:"Falta RUT/Usuario" };

  const cleaned = raw.replace(/\./g,"").replace(/\s+/g,"");

  // Username/correo/texto libre: contiene letras distintas a K o caracteres fuera de [0-9k-]
  const onlyRutChars = /^[0-9kK\-]+$/.test(cleaned);
  const hasNonKLetters = /[a-jl-zA-JL-Z]/.test(cleaned);

  if(!onlyRutChars || hasNonKLetters){
    return { ok:true, kind:"username", value: raw };
  }

  // Intento RUT
  const parts = rutParts(cleaned);
  if(parts && parts.body && parts.dv){
    const dvCalc = rutDvCalc(parts.body);
    if(String(dvCalc).toLowerCase() !== String(parts.dv).toLowerCase()){
      const suggestion = `${parts.body}-${String(dvCalc).toUpperCase()}`;
      return { ok:false, kind:"rut", error:"Dígito verificador inválido", suggestion };
    }
    return { ok:true, kind:"rut", canonical: `${parts.body}-${String(dvCalc).toUpperCase()}` };
  }

  // Si no calza como RUT, úsalo como username tal cual
  return { ok:true, kind:"username", value: raw };
}


// ✅ Normaliza texto (minúsculas + sin acentos) para matching de ejercicios
function mhfNormText(s){
  return String(s||"")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeExerciseName(name){
  return String(name||"")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function nowISO(){ return new Date().toISOString(); }

// ✅ Helpers fecha / ids (PRO)
function isoLocalDate(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
function safeStr(v, fb=""){ return (v===undefined || v===null) ? fb : String(v); }

// ✅ Number cleaner (para gráficos / normalización)
function toNumClean(v){
  if(v===undefined || v===null) return null;
  const s = String(v).replace(",", ".").trim();
  if(!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// ---------------- DB STATUS (pelotita) ----------------
function setDbStatus(status){
  const dot  = document.getElementById("dbDot");
  const text = document.getElementById("dbText");
  if(!dot) return;

  dot.className = "db-dot";

  if(status === "connected"){
    dot.classList.add("ok", "connected");
    if(text) text.textContent = "Conectado";
  }else if(status === "error"){
    dot.classList.add("bad", "error");
    if(text) text.textContent = "Sin conexión";
  }else{
    dot.classList.add("pending", "connecting");
    if(text) text.textContent = "Conectando…";
  }
}

// ---------------- API helpers ----------------
function parseISODate(d){
  const s = String(d || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return null;
  const yyyy = Number(m[1]), mm = Number(m[2]), dd = Number(m[3]);
  const dt = new Date(yyyy, mm - 1, dd);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function calcAge(fechaNacimiento){
  const dob = parseISODate(fechaNacimiento);
  if(!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if(m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function normSexHM(sexo){
  const s = String(sexo || "").trim().toUpperCase();
  if(s === "HOMBRE") return "M";
  if(s === "MUJER") return "F";
  return null;
}

function omronAgeBandFat(age){
  if(age == null) return "20-39";
  if(age >= 60) return "60-79";
  if(age >= 40) return "40-59";
  return "20-39";
}
function omronAgeBandMuscle(age){
  if(age == null) return "18-39";
  if(age >= 60) return "60-80";
  if(age >= 40) return "40-59";
  return "18-39";
}

// OMRON - % grasa (bajo/normal/alto/muy alto)
const OMRON_FAT = {
  F: {
    "20-39": { lowMax: 20.9, normalMax: 32.9, highMax: 38.9 },
    "40-59": { lowMax: 22.9, normalMax: 33.9, highMax: 39.9 },
    "60-79": { lowMax: 23.9, normalMax: 35.9, highMax: 41.9 }
  },
  M: {
    "20-39": { lowMax: 7.9,  normalMax: 19.9, highMax: 24.9 },
    "40-59": { lowMax: 10.9, normalMax: 21.9, highMax: 27.9 },
    "60-79": { lowMax: 12.9, normalMax: 24.9, highMax: 29.9 }
  }
};

// OMRON - % músculo esquelético (bajo/normal/alto/muy alto)
const OMRON_MUSCLE = {
  F: {
    "18-39": { lowMax: 24.2, normalMax: 30.3, highMax: 35.3 },
    "40-59": { lowMax: 24.0, normalMax: 30.1, highMax: 35.1 },
    "60-80": { lowMax: 23.8, normalMax: 29.9, highMax: 34.9 }
  },
  M: {
    "18-39": { lowMax: 33.2, normalMax: 39.3, highMax: 44.0 },
    "40-59": { lowMax: 33.0, normalMax: 39.1, highMax: 43.8 },
    "60-80": { lowMax: 32.8, normalMax: 38.9, highMax: 43.6 }
  }
};

function classifyOmron(value, cuts){
  if(value == null || !Number.isFinite(value)) return "normal";
  if(value <= cuts.lowMax) return "low";
  if(value <= cuts.normalMax) return "normal";
  if(value <= cuts.highMax) return "high";
  return "veryHigh";
}

function labelClass(cls){
  if(cls === "low") return "Bajo";
  if(cls === "normal") return "Normal";
  if(cls === "high") return "Alto";
  return "Muy alto";
}

function calcBMI(pesoKg, tallaCm){
  const w = Number(pesoKg);
  const h = Number(tallaCm);
  if(!w || !h) return null;
  const m = h / 100;
  return +(w / (m*m)).toFixed(1);
}

function bmiLabel(bmi){
  if(bmi < 18.5) return "Bajo peso";
  if(bmi < 25) return "Normal";
  if(bmi < 30) return "Sobrepeso";
  return "Obesidad";
}

function visceralLabel(v){
  if(v <= 9) return "Normal";
  if(v <= 14) return "Alto";
  return "Muy alto";
}

function renderPesoYVisceral(actual, anterior, tallaCm){
  // ===== PESO / IMC =====
  const bmiAct = calcBMI(actual.pesoKg, tallaCm);
  document.getElementById("pesoVal").textContent = `${actual.pesoKg} kg`;
  document.getElementById("pesoBadge").textContent = `IMC ${bmiAct} · ${bmiLabel(bmiAct)}`;
  document.getElementById("pesoCurr").style.left = Math.min(100, (actual.pesoKg / 150) * 100) + "%";
  if(anterior){
    document.getElementById("pesoPrev").style.left = Math.min(100, (anterior.pesoKg / 150) * 100) + "%";
  }

  // ===== GRASA VISCERAL =====
  document.getElementById("visVal").textContent = actual.grasaVisceral;
  document.getElementById("visBadge").textContent = visceralLabel(actual.grasaVisceral);
  document.getElementById("visCurr").style.left = Math.min(100, (actual.grasaVisceral / 20) * 100) + "%";
  if(anterior){
    document.getElementById("visPrev").style.left = Math.min(100, (anterior.grasaVisceral / 20) * 100) + "%";
  }
}

/* =========================================================
   ✅ API (GET/POST) — FIX TOKEN
   - Mantiene compat:
     apiPost("USERS", {...})
     apiPost({ action:"USERS", data:{...} })
     apiPost({ resource:"USERS", data:{...} })
   - Token SIEMPRE inyectado cuando includeToken=true (default)
   - Envía token tanto top-level como dentro de data (por compat backend)
   ========================================================= */

async function apiGet(resource, params = {}, opts = {}) {
  const includeToken = (opts.includeToken !== false); // default true
  const token = includeToken ? getToken() : "";
  const url = new URL(getApiUrl());
  url.searchParams.set("resource", resource);
  if (includeToken && token) url.searchParams.set("token", token);
  Object.keys(params || {}).forEach(k => url.searchParams.set(k, params[k]));

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json();

  if (json && json.ok === false && /no autorizado|sesión inválida|expirada/i.test(String(json.error || ""))) {
    clearToken();
  }
  return json;
}

async function apiPost(resourceOrEnvelope, data = {}, opts = {}) {
  const includeToken = (opts.includeToken !== false); // default true
  const token = includeToken ? getToken() : "";

  // 1) Normaliza envelope
  let env;
  if (resourceOrEnvelope && typeof resourceOrEnvelope === "object") {
    env = Object.assign({}, resourceOrEnvelope);
    // normaliza action/resource a UPPER (no rompe si tu router es case-insensitive)
    if (env.resource) env.resource = String(env.resource || "").toUpperCase();
    if (env.action) env.action = String(env.action || "").toUpperCase();
    env.data = Object.assign({}, env.data || {});
  } else {
    env = { resource: String(resourceOrEnvelope || "").toUpperCase(), data: Object.assign({}, data || {}) };
  }

  // merge data 2do arg si venía envelope
  if (resourceOrEnvelope && typeof resourceOrEnvelope === "object" && data && typeof data === "object" && Object.keys(data).length) {
    env.data = Object.assign({}, env.data || {}, data);
  }

  // 2) Inyecta token (compat backend)
  if (includeToken && token) {
    env.token = env.token || token;
    env.data = Object.assign({ token }, env.data || {}); // también dentro de data
  }

  // 3) Body final (tu backend puede leer action o resource)
  const body = env.action
    ? { action: env.action, data: env.data, token: env.token || "" }
    : { resource: env.resource, data: env.data, token: env.token || "" };

  const r = await fetch(getApiUrl_(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script-friendly
    body: JSON.stringify(body)
  });

  const t = await r.text();
  let j;
  try { j = JSON.parse(t); }
  catch(e){
    console.error("API RAW:", t);
    throw new Error("Respuesta API no JSON");
  }

  // Si sesión expirada: limpia token para forzar login
  if (j && j.ok === false && /no autorizado|sesión inválida|expirada/i.test(String(j.error || ""))) {
    clearToken();
  }

  // Mantiene comportamiento anterior: si ok=false lanza (para no romper pantallas que esperan throw)
  if(!j.ok) throw new Error(j.error || "API error");
  return j;
}

// Conveniencia: post por action (para endpoints tipo LOG_WORKOUT_SET)
function apiPostAction(action, data){
  return apiPost({ action, data: data || {} });
}

// Login / Me / Logout (integrado en tu UI)
async function apiLogin(rut, pass) {
  // LOGIN NO requiere token
  const res = await apiPost("LOGIN", { rut, pass, token: "" }, { includeToken:false });
  if (res && res.ok && res.token) setToken(res.token, res.user || null);
  return res;
}
async function apiMe() {
  // AUTH_ME requiere token
  return apiPost("AUTH_ME", {}, { includeToken:true });
}
async function apiLogout() {
  let res = null;
  try { res = await apiPost("LOGOUT", {}, { includeToken:true }); } catch(e){}
  clearToken();
  return res;
}

// ---------------- EXERCISES helpers (Base) ----------------
function exIdNew_(){
  return "EX_" + crypto.randomUUID().replace(/-/g,"").slice(0,10).toUpperCase();
}

function findExerciseByName_(nombre){
  const n = String(nombre||"").trim().toLowerCase();
  if(!n) return null;
  return getExercises().find(e => String(e.nombre||"").trim().toLowerCase() === n) || null;
}

async function upsertExercise_(ex){
  const payload = {
    exId: String(ex.exId || "").trim() || exIdNew_(),
    nombre: String(ex.nombre || "").trim(),
    musculo: String(ex.musculo || "").trim(),
    maq: String(ex.maq || "").trim(),
    tecnica: String(ex.tecnica || "").trim(),
    mediaUrlGif: String(ex.mediaUrlGif || "").trim(),
    mediaUrl: String(ex.mediaUrl || "").trim(),
    estado: String(ex.estado || "pendiente").trim(),
    actualizadoEn: nowISO()
  };
  if(!payload.nombre) throw new Error("Falta nombre de ejercicio");

  try{
    await apiPost("EXERCISES", payload);
  }catch(err){
    console.warn("[EXERCISES] No se pudo guardar remoto (se guardará local):", err && err.message ? err.message : err);
  }

  const list = getExercises();
  const i = list.findIndex(x => String(x.exId).trim() === payload.exId);
  if(i >= 0) list[i] = { ...list[i], ...payload };
  else list.unshift(payload);
  setExercises(list);
  return payload;
}

async function ensureExerciseInBase_(nombre, musculo="", maq=""){
  const found = findExerciseByName_(nombre);
  if(found) return found;

  return await upsertExercise_({
    exId: exIdNew_(),
    nombre,
    musculo,
    maq,
    tecnica: "",
    mediaUrlGif: "",
    mediaUrl: "",
    estado: "pendiente",
  });
}

// ---------------- Cache local ----------------
function getUsers(){ return LS.get("mahfit_users", []); }
function setUsers(v){ LS.set("mahfit_users", v); }

function getPlanes(){ return LS.get("mahfit_planes", []); }
function setPlanes(v){ LS.set("mahfit_planes", v); }

function getPlanesActivos(){
  return getPlanes()
    .filter(p => Number(p.activo ?? p.Activo ?? 1) === 1)
    .sort((a,b)=> Number(a.orden ?? a.Orden ?? 999) - Number(b.orden ?? b.Orden ?? 999));
}

function getRutinas(){ return LS.get("mahfit_rutinas", []); }
function setRutinas(v){ LS.set("mahfit_rutinas", v); }

function getRutinasV2(){ return LS.get("mahfit_rutinas_v2", []); }
function setRutinasV2(v){ LS.set("mahfit_rutinas_v2", v); }

function getPlantillasV2(){ return LS.get("mahfit_plantillas_v2", []); }
function setPlantillasV2(v){ LS.set("mahfit_plantillas_v2", v); }

function getExercises(){ return LS.get("mahfit_exercises", []); }
function setExercises(v){ LS.set("mahfit_exercises", v); }

// ✅ LOGS PRO caches
function getWorkoutLog(){ return LS.get("mahfit_workout_log", []); }
function setWorkoutLog(v){ LS.set("mahfit_workout_log", v); }

function getCardioLog(){ return LS.get("mahfit_cardio_log", []); }
function setCardioLog(v){ LS.set("mahfit_cardio_log", v); }

function getBodyLog(){ return LS.get("mahfit_body_log", []); }
function setBodyLog(v){ LS.set("mahfit_body_log", v); }

function getWorkoutSetsLog(){ return LS.get("mahfit_workout_sets_log", []); }
function setWorkoutSetsLog(v){ LS.set("mahfit_workout_sets_log", v); }

// filtra por socio + ejercicio
function workoutSetsForExercise(rutSocio, ejercicioId, ejercicioNombre){
  const rutN = normalizeRut(rutSocio);
  const id = String(ejercicioId||"").trim();
  const idLower = id.toLowerCase();
  const nameN = mhfNormText(ejercicioNombre||"");

  const rows = (window.__CACHE__ && Array.isArray(window.__CACHE__.workout_sets_log))
    ? window.__CACHE__.workout_sets_log
    : (Array.isArray(window.__WORKOUT_SETS_LOG__) ? window.__WORKOUT_SETS_LOG__ : []);

  const out = (rows||[]).filter(x=>{
    if(normalizeRut(x.rut_socio || x.rutSocio) !== rutN) return false;

    const xid = String(x.ejercicio_id || x.ejercicioId || "").trim();
    if(id && xid === id) return true;
    if(id && xid && xid.toLowerCase().includes(idLower)) return true;

    if(nameN){
      const xn = mhfNormText(x.ejercicio_nombre || x.ejercicioNombre || x.ejercicio || "");
      if(xn && xn === nameN) return true;
    }
    return false;
  });

  out.sort((a,b)=> Number(b.timestamp||b.ts||0) - Number(a.timestamp||a.ts||0));
  return out;
}

// ✅ NUEVO: EVALUATIONS cache
function getEvaluations(){ return LS.get("mahfit_evaluations", []); }
function setEvaluations(v){ LS.set("mahfit_evaluations", v); }

// ---------------- Session ----------------
function setSession(user){
  LS.set("mahfit_session", { rut:user.rut, rol:user.rol, at: nowISO() });
}
function getSession(){ return LS.get("mahfit_session", null); }
function clearSession(){ LS.del("mahfit_session"); }

/* =========================================================
   ✅ LOGS PRO: ID builders (robustos)
   ========================================================= */
function makeWorkoutLogId({ rutSocio, fecha, dayLabel, idx }){
  const r = normalizeRut(rutSocio);
  const f = safeStr(fecha, isoLocalDate()).trim();
  const d = safeStr(dayLabel, "DIA").trim().replace(/\s+/g,"_");
  const i = String(idx ?? 0).trim();
  return `WL_${r}_${f}_${d}_${i}`;
}
function makeCardioId({ rutSocio, fecha, dayLabel }){
  const r = normalizeRut(rutSocio);
  const f = safeStr(fecha, isoLocalDate()).trim();
  const d = safeStr(dayLabel, "DIA").trim().replace(/\s+/g,"_");
  return `CL_${r}_${f}_${d}`;
}
function makeBodyId({ rutSocio, fecha }){
  const r = normalizeRut(rutSocio);
  const f = safeStr(fecha, isoLocalDate()).trim();
  return `BL_${r}_${f}`;
}

/* =========================================================
   ✅ NUEVO: EVALUATIONS ID builder
   ========================================================= */
function makeEvalId({ rutSocio, fecha }){
  const r = normalizeRut(rutSocio);
  const f = safeStr(fecha, isoLocalDate()).trim();
  const uid = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).slice(0,8);
  return `EV_${r}_${f}_${uid}`;
}

/* =========================================================
   ✅ Helpers internos (local upsert)
   ========================================================= */
function upsertLocalByKey(list, keyName, obj){
  const key = String(obj?.[keyName] ?? "").trim();
  if(!key) return list;
  const next = (list || []).slice();
  const idx = next.findIndex(x => String(x?.[keyName] ?? "").trim() === key);
  if(idx >= 0) next[idx] = { ...next[idx], ...obj };
  else next.push(obj);
  return next;
}

function getWorkoutLogById(logId){
  const id = String(logId||"").trim();
  if(!id) return null;
  return (getWorkoutLog() || []).find(x => String(x.logId||x.id||"").trim() === id) || null;
}

/* =========================================================
   === MAH FIT | EVALUATION PHOTOS ===
   ========================================================= */
function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(String(fr.result||""));
    fr.onerror = ()=> reject(new Error("No se pudo leer el archivo"));
    fr.readAsDataURL(file);
  });
}

async function compressImageDataURL(dataURL, { maxW=1080, quality=0.82 } = {}){
  try{
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej)=>{
      img.onload = ()=> res(true);
      img.onerror = ()=> rej(new Error("Imagen inválida"));
      img.src = dataURL;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = (w > maxW) ? (maxW / w) : 1;
    const nw = Math.round(w * scale);
    const nh = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = nw; canvas.height = nh;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, nw, nh);

    const out = canvas.toDataURL("image/jpeg", quality);
    return out;
  }catch(e){
    return dataURL;
  }
}

function inferMimeFromDataURL(dataURL){
  const m = String(dataURL||"").match(/^data:([^;]+);base64,/i);
  return (m && m[1]) ? m[1] : "image/jpeg";
}

async function uploadEvaluationPhoto({ rutSocio, evalId, fecha, slot, file, compress=true }){
  if(!rutSocio) throw new Error("Falta rutSocio");
  if(!evalId) throw new Error("Falta evalId");
  if(!slot || !["frente","perfil","espalda"].includes(String(slot).toLowerCase())) throw new Error("slot inválido");
  if(!file) throw new Error("Falta file");
  const f = safeStr(fecha, isoLocalDate()).trim();

  let dataURL = await fileToDataURL(file);
  if(compress){
    dataURL = await compressImageDataURL(dataURL, { maxW: 1080, quality: 0.82 });
  }

  const mimeType = inferMimeFromDataURL(dataURL);

  const res = await apiPost("EVALUATIONS_PHOTO_UPLOAD", {
    rutSocio: normalizeRut(rutSocio),
    evalId: String(evalId).trim(),
    fecha: f,
    slot: String(slot).toLowerCase(),
    mimeType,
    fileBase64: dataURL
  });

  await refreshEvaluations().catch(()=>{});
  return res;
}

async function uploadEvaluationPhotos3({ rutSocio, evalId, fecha, files, compress=true, onProgress }){
  const slots = ["frente","perfil","espalda"];
  const out = [];
  for(const s of slots){
    const file = files?.[s];
    if(!file) continue;
    if(typeof onProgress === "function") onProgress({ slot:s, status:"uploading" });
    const r = await uploadEvaluationPhoto({ rutSocio, evalId, fecha, slot:s, file, compress });
    out.push(r);
    if(typeof onProgress === "function") onProgress({ slot:s, status:"done", result:r });
  }
  return out;
}

// ---------------- Sync DOWN (Sheets -> cache) ----------------
// ✅ Login-only: solo USERS (rápido para index.html)
async function syncDownLogin(){
  const u = await apiGet("USERS");
  const users = (u.users || []).map(x => ({
    rut: normalizeRut(x.rut),
    nombre: x.nombre ?? "",
    email: x.email ?? "",
    pass: String(x.pass ?? ""),
    rol: (x.rol ?? x.role ?? "SOCIO"),
    activo: (x.activo === false || x.activo === 0 || String(x.activo) === "0") ? false : true,

    planTipo: x.planTipo ?? "",
    planInicio: x.planInicio ?? "",
    planFin: x.planFin ?? "",
    planId: (x.planId ?? x.planID ?? "").toString().trim().toUpperCase(),
    planPrecioBase: Number(x.planPrecioBase ?? 0),
    planDescPct: Number(x.planDescPct ?? 0),
    planPrecioFinal: Number(x.planPrecioFinal ?? 0),
    planPagado: Number(x.planPagado ?? 0),

    telefono: x.telefono ?? "",
    fechaNacimiento: x.fechaNacimiento ?? "",
    sexo: (x.sexo ?? "").toString().trim().toUpperCase(),
    direccion: x.direccion ?? "",
    emergenciaNom: x.emergenciaNom ?? "",
    emergenciaTelef: x.emergenciaTelef ?? "",
    objetivo: x.objetivo ?? "",
    nivel: (x.nivel ?? "").toString().trim().toUpperCase(),
    lesiones: x.lesiones ?? "",
    patologias: x.patologias ?? "",
    medicamentos: x.medicamentos ?? "",
    alergias: x.alergias ?? "",
    notas: x.notas ?? "",
    creadoEn: x.creadoEn ?? ""
  }));
  setUsers(users);
  return true;
}

// ✅ Core: USERS + PLANES (para pantallas ligeras)
async function syncDownCore(){
  await syncDownLogin();

  const p = await apiGet("PLANES");
  const planes = (p.planes || []).map(x => ({
    planId: String(x.PlanId ?? x.planId ?? "").trim().toUpperCase(),
    nombre: x.Nombre ?? x.nombre ?? "",
    tipo: String(x.Tipo ?? x.tipo ?? "").trim().toUpperCase(),
    dias: Number(x.Dias ?? x.dias ?? 0),
    precioCLP: Number(x.PrecioCLP ?? x.precioCLP ?? 0),
    activo: Number(x.Activo ?? x.activo ?? 1),
    orden: Number(x.Orden ?? x.orden ?? 999),
    actualizadoEn: x.ActualizadoEn ?? x.actualizadoEn ?? ""
  })).filter(p=>p.planId);
  setPlanes(planes);

  return true;
}

async function syncDown(){
  const u = await apiGet("USERS");

  const users = (u.users || []).map(x => ({
    rut: normalizeRut(x.rut),
    nombre: x.nombre ?? "",
    email: x.email ?? "",
    pass: String(x.pass ?? ""),
    rol: (x.rol ?? x.role ?? "SOCIO"),
    activo: (x.activo === false || x.activo === 0 || String(x.activo) === "0") ? false : true,

    planTipo: x.planTipo ?? "",
    planInicio: x.planInicio ?? "",
    planFin: x.planFin ?? "",

    planId: (x.planId ?? x.planID ?? "").toString().trim().toUpperCase(),
    planPrecioBase: Number(x.planPrecioBase ?? 0),
    planDescPct: Number(x.planDescPct ?? 0),
    planPrecioFinal: Number(x.planPrecioFinal ?? 0),
    planPagado: Number(x.planPagado ?? 0),

    // ✅ PERFIL
    telefono: x.telefono ?? "",
    fechaNacimiento: x.fechaNacimiento ?? "",
    sexo: (x.sexo ?? "").toString().trim().toUpperCase(),
    direccion: x.direccion ?? "",
    emergenciaNom: x.emergenciaNom ?? "",
    emergenciaTelef: x.emergenciaTelef ?? "",
    objetivo: x.objetivo ?? "",
    nivel: (x.nivel ?? "").toString().trim().toUpperCase(),
    lesiones: x.lesiones ?? "",
    patologias: x.patologias ?? "",
    medicamentos: x.medicamentos ?? "",
    alergias: x.alergias ?? "",
    notas: x.notas ?? "",

    creadoEn: x.creadoEn ?? ""
  }));

  setUsers(users);

  const p = await apiGet("PLANES");
  const planes = (p.planes || []).map(x => ({
    planId: String(x.PlanId ?? x.planId ?? "").trim().toUpperCase(),
    nombre: x.Nombre ?? x.nombre ?? "",
    tipo: String(x.Tipo ?? x.tipo ?? "").trim().toUpperCase(),
    dias: Number(x.Dias ?? x.dias ?? 0),
    precioCLP: Number(x.PrecioCLP ?? x.precioCLP ?? 0),
    activo: Number(x.Activo ?? x.activo ?? 1),
    orden: Number(x.Orden ?? x.orden ?? 999),
    actualizadoEn: x.ActualizadoEn ?? x.actualizadoEn ?? ""
  })).filter(p=>p.planId);
  setPlanes(planes);

  const rt = await apiGet("RUTINAS_TXT");
  setRutinas((rt.rutinas_txt || []).map(x => ({
    id: x.id || crypto.randomUUID(),
    rutSocio: normalizeRut(x.rutSocio),
    titulo: x.titulo ?? "",
    detalle: x.detalle ?? "",
    creadoEn: x.creadoEn ?? "",
    creadoPorRut: x.creadoPorRut ?? ""
  })));

  const rv2 = await apiGet("RUTINAS_V2");
  setRutinasV2((rv2.rutinas_v2 || []).map(x => {
    let routine = null;
    try{ routine = JSON.parse(x.routine_json || "null"); }catch{}
    return {
      rutSocio: normalizeRut(x.rutSocio),
      routine,
      routine_json: x.routine_json ?? null,
      creadoPorRut: x.creadoPorRut ?? "",
      actualizadoEn: x.actualizadoEn ?? ""
    };
  }));

  const pv2 = await apiGet("PLANTILLAS_V2");
  setPlantillasV2((pv2.plantillas_v2 || []).map(x => {
    let templateObj = null;
    const raw = x.template_json ?? null;
    if(typeof raw === "string"){ try{ templateObj = JSON.parse(raw); }catch{} }
    else templateObj = raw;

    return {
      templateId: x.templateId || crypto.randomUUID(),
      nombrePlantilla: x.nombrePlantilla ?? "",
      nivel: x.nivel ?? "",
      objetivo: x.objetivo ?? "",
      dias: Number(x.dias ?? 0),
      visibility: (x.visibility ?? "PRIVADA"),
      ownerRut: normalizeRut(x.ownerRut ?? ""),
      ownerNombre: x.ownerNombre ?? "",
      template_json: templateObj,
      creadoEn: x.creadoEn ?? "",
      actualizadoEn: x.actualizadoEn ?? ""
    };
  }));

  // ✅ EXERCISES
  try{
    const ex = await apiGet("EXERCISES");
    const list = (ex.exercises || ex.EXERCISES || []).map(x => ({
      exId: String(x.exId ?? x.id ?? "").trim(),
      nombre: x.nombre ?? x.Nombre ?? "",
      musculo: x.musculo ?? x.Musculo ?? "",
      maq: x.maq ?? x.maquina ?? x.Maq ?? "",
      tecnica: x.tecnica ?? x.Tecnica ?? "",
      mediaUrl: x.mediaUrl ?? x.media_url ?? x.MediaUrl ?? "",
      mediaUrlGif: x.mediaUrlGif ?? x.media_url_gif ?? x.MediaUrlGif ?? "",
      estado: (x.estado ?? x.Estado ?? "").toString().trim(),
      actualizadoEn: x.actualizadoEn ?? x.ActualizadoEn ?? ""
    })).filter(x=>x.exId && x.nombre);
    setExercises(list);
  }catch(err){
    console.warn("[EXERCISES] syncDown omitido:", err && err.message ? err.message : err);
  }

  // ✅ WORKOUT_SETS_LOG
  try{
    const ws = await apiGet("WORKOUT_SETS_LOG");
    setWorkoutSetsLog(ws.workout_sets_log || []);
  }catch(err){
    console.warn("[WORKOUT_SETS_LOG] syncDown omitido:", err && err.message ? err.message : err);
  }

  // ✅ LOGS PRO
  const wl = await apiGet("WORKOUT_LOG");
  setWorkoutLog((wl.workout_log || []).map(x => {
    const rutSocio = normalizeRut(x.rutSocio);
    const logId = String(x.logId ?? x.id ?? "").trim();
    return { ...x, rutSocio, logId, id: String(x.id ?? logId ?? "").trim() };
  }).filter(x=>x.logId));

  const cl = await apiGet("CARDIO_LOG");
  setCardioLog((cl.cardio_log || []).map(x => ({
    ...x,
    rutSocio: normalizeRut(x.rutSocio),
    cardioId: String(x.cardioId ?? "").trim(),
  })).filter(x=>x.cardioId));

  const bl = await apiGet("BODY_LOG");
  setBodyLog((bl.body_log || []).map(x => ({
    ...x,
    rutSocio: normalizeRut(x.rutSocio),
    entryId: String(x.entryId ?? "").trim(),
  })).filter(x=>x.entryId));

  // ✅ EVALUATIONS
  const ev = await apiGet("EVALUATIONS");
  setEvaluations((ev.evaluations || []).map(x => {
    const mmPct = (x.masaMuscularPct ?? x.masaMuscularKg ?? "");
    return ({
      evalId: String(x.evalId ?? "").trim(),
      rutSocio: normalizeRut(x.rutSocio ?? ""),
      fecha: String(x.fecha ?? "").trim(),
      hora: String(x.hora ?? "").trim(),

      pesoKg: x.pesoKg ?? "",
      tallaCm: x.tallaCm ?? "",
      imc: x.imc ?? "",

      grasaPct: x.grasaPct ?? "",
      masaMuscularPct: mmPct ?? "",
      masaMuscularKg: x.masaMuscularKg ?? mmPct ?? "",
      grasaVisceral: x.grasaVisceral ?? "",
      aguaPct: x.aguaPct ?? "",

      cinturaCm: x.cinturaCm ?? "",
      caderaCm: x.caderaCm ?? "",
      cuelloCm: x.cuelloCm ?? "",
      brazoCm: x.brazoCm ?? "",
      musloCm: x.musloCm ?? "",
      pantorrillaCm: x.pantorrillaCm ?? "",

      pliegues: x.pliegues ?? "",
      observaciones: x.observaciones ?? "",

      evaluadorRut: x.evaluadorRut ?? "",
      evaluadorNombre: x.evaluadorNombre ?? "",

      creadoEn: x.creadoEn ?? "",
      actualizadoEn: x.actualizadoEn ?? "",

      photoFolderId: x.photoFolderId ?? "",
      fotoFrenteId: x.fotoFrenteId ?? "",
      fotoPerfilId: x.fotoPerfilId ?? "",
      fotoEspaldaId: x.fotoEspaldaId ?? "",
      fotoFrenteUrl: x.fotoFrenteUrl ?? "",
      fotoPerfilUrl: x.fotoPerfilUrl ?? "",
      fotoEspaldaUrl: x.fotoEspaldaUrl ?? "",
    });
  }).filter(x=>x.evalId && x.rutSocio));
}

// ---------------- Auth (TOKEN + SESSION) ----------------
function requireAuth(expectedRole){
  // 1) Intenta sesión local (legacy)
  let s = getSession();

  // 2) Fallback: si hay token, usa el user cacheado por token (LOGIN guarda USER_KEY)
  const tokUser = getUserSession && typeof getUserSession === "function" ? getUserSession() : null;

  if(!s){
    if(tokUser && tokUser.rut){
      s = { rut: tokUser.rut, rol: tokUser.rol, at: nowISO() };
      try { LS.set("mahfit_session", s); } catch(e){}
    } else {
      window.location.href = "index.html";
      return null;
    }
  }

  // 3) Intenta encontrar el usuario completo en cache local (USERS / USERS_LITE)
  const rutN = normalizeRut(s.rut);
  let user = (getUsers() || []).find(u => normalizeRut(u.rut) === rutN) || null;

  // 4) Fallback: si no existe en cache local, construye un user mínimo desde tokUser (evita rebote)
  if(!user && tokUser && normalizeRut(tokUser.rut) === rutN){
    user = {
      rut: rutN,
      rol: String(tokUser.rol || s.rol || ""),
      nombre: String(tokUser.nombre || ""),
      tenantId: String(tokUser.tenantId || ""),
      activo: true
    };
    // upsert mínimo en cache local para que el resto del UI no reviente
    try{
      const users = (getUsers() || []).slice();
      users.push(user);
      setUsers(users);
    }catch(e){}
  }

  // 5) Si definitivamente no hay usuario, a login
  if(!user){
    clearSession();
    window.location.href = "index.html";
    return null;
  }

  if(user.activo === false){
    clearSession();
    window.location.href = "index.html";
    return null;
  }

  // 6) Role gate
  if(expectedRole){
    const allowed = Array.isArray(expectedRole) ? expectedRole.slice() : [expectedRole];
    if(allowed.includes("ADMIN") && !allowed.includes("SUPER_ADMIN")) allowed.push("SUPER_ADMIN");

    const urol = String(user.rol||"").toUpperCase();
    if(!allowed.includes(urol) && !allowed.includes(normalizeRut(user.rut))){
      window.location.href = (urol === "FUNCIONARIO") ? "funcionario.html" : (urol === "SUPER_ADMIN" ? "admin.html" : "socio.html");
      return null;
    }
  }

  return user;
}


// ---------------- Login/Register ----------------
function registerUser({rut, nombre, email, pass, rol}){
  // ✅ VALIDAR RUT + AUTOCOMPLETAR DV si escriben solo cuerpo
  const typed = String(rut || "").trim();
  const candidate = rutAutoComplete_(typed); // si viene "19228778" => "19228778-2"
  const v = validateRutChile(candidate);
  if(!v.ok) throw new Error("RUT: " + v.error);

  // guardamos normalizado como antes: "192287782" (body+dv, sin puntos/guion)
  rut = normalizeRut(v.canonical);

  if(!rut || !nombre || !pass) throw new Error("Completa Usuario/RUT, nombre y clave.");

  const users = getUsers();
  if(users.some(u => u.rut === rut)) throw new Error("Ese Usuario/RUT ya existe.");

  const user = {
    rut,
    nombre: String(nombre).trim(),
    email: String(email||"").trim(),
    pass: String(pass),
    rol,
    activo: true,

    planTipo: "",
    planInicio: "",
    planFin: "",

    planId: "",
    planPrecioBase: 0,
    planDescPct: 0,
    planPrecioFinal: 0,
    planPagado: 0,

    telefono: "",
    fechaNacimiento: "",
    sexo: "",
    direccion: "",
    emergenciaNom: "",
    emergenciaTelef: "",
    objetivo: "",
    nivel: "",
    lesiones: "",
    patologias: "",
    medicamentos: "",
    alergias: "",
    notas: "",

    creadoEn: nowISO()
  };

  users.push(user);
  setUsers(users);

  // Sync a Sheets vía API (si falla, igual queda en local y se verá en "Pendientes")
  apiPost("USERS", user).catch(console.error);
  return user;
}

function login({rut, pass}){
  rut = normalizeRut(rut);
  const user = getUsers().find(u => u.rut === rut && String(u.pass) === String(pass));
  if(!user) throw new Error("Usuario/RUT o clave incorrecta.");
  if(user.activo === false) throw new Error("Usuario inactivo. Contacta a administración.");
  setSession(user);
  return user;
}

// ---------------- INIT INDEX ----------------
function initIndex(){
  const loginForm = document.getElementById("loginForm");
  const msgLogin  = document.getElementById("msgLogin");

  
  // ✅ UX (SIN autocorregir DV):
  // Antes se sugería/corregía automáticamente el DV al salir del campo (blur),
  // pero eso cambiaba el número escrito (ej: ...6 -> ...2).
  // Ahora NO modificamos el input; solo validamos al enviar el formulario.
  const loginRutInput = document.getElementById("loginRut");


  function showMsg(txt, ok=false){
    if(!msgLogin) return;
    msgLogin.textContent = txt;
    msgLogin.style.color = ok ? "#2bd576" : "#ff6b6b";
  }

  const s = getSession();
  if(s){
    let u = (getUsers()||[]).find(x => normalizeRut(x.rut) === normalizeRut(s.rut));
    // fallback por token (por si aún no sincroniza USERS_LITE)
    if(!u){
      const tu = (typeof getUserSession === "function") ? getUserSession() : null;
      if(tu && tu.rut && normalizeRut(tu.rut) === normalizeRut(s.rut)){
        u = { rut: normalizeRut(tu.rut), rol: String(tu.rol||""), nombre: String(tu.nombre||""), tenantId: String(tu.tenantId||""), activo:true };
      }
    }
    if(u){
      const r = String(u.rol||'').toUpperCase();
      window.location.href = (r === "SUPER_ADMIN") ? "admin.html" : ((r === "FUNCIONARIO") ? "funcionario.html" : "socio.html");
      return;
    }
  }

  loginForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      const elRut  = document.getElementById("loginRut");
      const elPass = document.getElementById("loginPass");
      const rutRaw = String(elRut?.value || "").trim();
      const pass   = String(elPass?.value || "");
      if(!rutRaw) throw new Error("Falta RUT");
      if(!pass)   throw new Error("Falta contraseña");

      
      // ✅ LOGIN PERMISIVO (SIN VALIDAR DV):
      // - Si el identificador contiene letras fuera de K/k o caracteres extraños -> se trata como username (se envía tal cual).
      // - Si parece RUT (solo números + opcional K/k y guión) -> se envía limpio (sin puntos/espacios), PERO sin validar DV.
      const cleaned = rutRaw.replace(/\./g,"").replace(/\s+/g,"");
      const onlyRutChars = /^[0-9kK\-]+$/.test(cleaned);
      const hasNonKLetters = /[a-jl-zA-JL-Z]/.test(cleaned);

      const rutCanonical = (!onlyRutChars || hasNonKLetters)
        ? String(rutRaw).trim()
        : cleaned; // puede venir con o sin guión/DV; backend decide

const res = await apiLogin(rutCanonical, pass);
      const u = res && res.user ? res.user : null;
      if(!u) throw new Error("Respuesta inválida del servidor");

      setSession({
        rut: String(u.rut || rutCanonical),
        rol: String(u.rol || ""),
        nombre: String(u.nombre || ""),
        tenantId: String(u.tenantId || "")
      });

      const rol = String(u.rol || "").toUpperCase();
      if(rol === "SUPER_ADMIN") window.location.href = "admin.html";
      else if(rol === "FUNCIONARIO") window.location.href = "funcionario.html";
      else window.location.href = "socio.html";

    }catch(err){
      showMsg(String(err && err.message ? err.message : err), false);
    }
  });
}

// ---------------- INIT AUTO POR ELEMENTOS ----------------
document.addEventListener("DOMContentLoaded", ()=>{
  if(document.getElementById("loginForm")) initIndex();
});

/* =========================================================
   ✅ FIX GLOBAL: rutinaV2DeSocio()
   ========================================================= */
function rutinaV2DeSocio(rutSocio){
  const rut = normalizeRut(rutSocio);
  const list = getRutinasV2() || [];
  const row = list.find(x => normalizeRut(x.rutSocio) === rut) || null;
  if(!row) return null;

  let routine = row.routine || null;
  if(!routine && row.routine_json){
    try{ routine = JSON.parse(row.routine_json); }catch(e){ routine = null; }
  }
  return { ...row, routine };
}

/* =========================================================
   ✅ LOGS PRO: helpers públicos (solo lectura)
   ========================================================= */
function logsForRut(list, rut){
  const r = normalizeRut(rut);
  return (list || []).filter(x => normalizeRut(x.rutSocio) === r);
}
function getWorkoutLogForRut(rut){ return logsForRut(getWorkoutLog(), rut); }
function getCardioLogForRut(rut){ return logsForRut(getCardioLog(), rut); }
function getBodyLogForRut(rut){ return logsForRut(getBodyLog(), rut); }

/* =========================================================
   ✅ LOGS PRO: save* robustos
   ========================================================= */
async function saveWorkoutLog(entry){
  const e = { ...(entry || {}) };

  e.rutSocio = normalizeRut(e.rutSocio || e.rut || "");
  e.fecha = safeStr(e.fecha, isoLocalDate()).trim();
  e.dayLabel = e.dayLabel ?? e.dia ?? "DIA";

  e.logId = String(e.logId ?? "").trim() || makeWorkoutLogId({
    rutSocio: e.rutSocio, fecha: e.fecha, dayLabel: e.dayLabel, idx: e.idx ?? 0
  });
  e.id = String(e.id ?? "").trim() || e.logId;

  e.actualizadoEn = nowISO();
  if(!e.creadoEn) e.creadoEn = e.actualizadoEn;

  const res = await apiPost("WORKOUT_LOG", e);

  const list = upsertLocalByKey(getWorkoutLog(), "logId", e);
  setWorkoutLog(list);
  return res;
}

async function saveCardioLog(entry){
  const e = { ...(entry || {}) };

  e.rutSocio = normalizeRut(e.rutSocio || e.rut || "");
  e.fecha = safeStr(e.fecha, isoLocalDate()).trim();
  e.dayLabel = e.dayLabel ?? e.dia ?? "DIA";

  e.cardioId = String(e.cardioId ?? "").trim() || makeCardioId({
    rutSocio: e.rutSocio, fecha: e.fecha, dayLabel: e.dayLabel
  });

  e.actualizadoEn = nowISO();
  if(!e.creadoEn) e.creadoEn = e.actualizadoEn;

  const res = await apiPost("CARDIO_LOG", e);

  const list = upsertLocalByKey(getCardioLog(), "cardioId", e);
  setCardioLog(list);
  return res;
}

async function saveBodyLog(entry){
  const e = { ...(entry || {}) };

  e.rutSocio = normalizeRut(e.rutSocio || e.rut || "");
  e.fecha = safeStr(e.fecha, isoLocalDate()).trim();

  e.entryId = String(e.entryId ?? "").trim() || makeBodyId({
    rutSocio: e.rutSocio, fecha: e.fecha
  });

  e.actualizadoEn = nowISO();
  if(!e.creadoEn) e.creadoEn = e.actualizadoEn;

  const res = await apiPost("BODY_LOG", e);

  const list = upsertLocalByKey(getBodyLog(), "entryId", e);
  setBodyLog(list);
  return res;
}

/* =========================================================
   ✅ EVALUATIONS helpers
   ========================================================= */
function evaluationsForRut(rut){
  const r = normalizeRut(rut);
  return (getEvaluations() || []).filter(x => normalizeRut(x.rutSocio) === r);
}

function lastEvaluationForRut(rut){
  const list = evaluationsForRut(rut)
    .slice()
    .sort((a,b)=> String(b.fecha||"").localeCompare(String(a.fecha||"")) || String(b.hora||"").localeCompare(String(a.hora||"")));
  return list[0] || null;
}

function evaluationsLastN(rut, n=12){
  return evaluationsForRut(rut)
    .slice()
    .sort((a,b)=> String(a.fecha||"").localeCompare(String(b.fecha||"")) || String(a.hora||"").localeCompare(String(b.hora||"")))
    .slice(-Math.max(1, Number(n)||12));
}

async function saveEvaluation(entry){
  const e = { ...(entry || {}) };

  e.rutSocio = normalizeRut(e.rutSocio || e.rut || "");
  e.fecha = safeStr(e.fecha, isoLocalDate()).trim();
  e.evalId = String(e.evalId ?? "").trim() || makeEvalId({ rutSocio: e.rutSocio, fecha: e.fecha });

  if(e.masaMuscularPct !== undefined && (e.masaMuscularKg === undefined || e.masaMuscularKg === "")){
    e.masaMuscularKg = e.masaMuscularPct;
  }
  if(e.masaMuscularKg !== undefined && (e.masaMuscularPct === undefined || e.masaMuscularPct === "")){
    e.masaMuscularPct = e.masaMuscularKg;
  }

  e.actualizadoEn = nowISO();
  if(!e.creadoEn) e.creadoEn = e.actualizadoEn;

  const res = await apiPost("EVALUATIONS", e);

  const list = upsertLocalByKey(getEvaluations(), "evalId", e);
  setEvaluations(list);

  return (res && res.evalId) ? res : { ok:true, evalId: e.evalId };
}

async function saveEvaluationComment({ evalId, rutSocio, comentario }){
  const id = String(evalId || "").trim();
  const rut = normalizeRut(rutSocio || "");
  const text = String(comentario ?? "").trim();

  if(!id) throw new Error("Falta evalId");
  if(!rut) throw new Error("Falta rutSocio");

  const patch = {
    evalId: id,
    rutSocio: rut,
    observaciones: text,
    actualizadoEn: nowISO()
  };

  const res = await apiPost("EVALUATIONS", patch);

  const list = upsertLocalByKey(getEvaluations(), "evalId", patch);
  setEvaluations(list);

  return res;
}

async function refreshEvaluations(){
  const ev = await apiGet("EVALUATIONS");
  setEvaluations((ev.evaluations || []).map(x => {
    const mmPct = (x.masaMuscularPct ?? x.masaMuscularKg ?? "");
    return ({
      evalId: String(x.evalId ?? "").trim(),
      rutSocio: normalizeRut(x.rutSocio ?? ""),
      fecha: String(x.fecha ?? "").trim(),
      hora: String(x.hora ?? "").trim(),

      pesoKg: x.pesoKg ?? "",
      tallaCm: x.tallaCm ?? "",
      imc: x.imc ?? "",

      grasaPct: x.grasaPct ?? "",
      masaMuscularPct: mmPct ?? "",
      masaMuscularKg: x.masaMuscularKg ?? mmPct ?? "",
      grasaVisceral: x.grasaVisceral ?? "",
      aguaPct: x.aguaPct ?? "",

      cinturaCm: x.cinturaCm ?? "",
      caderaCm: x.caderaCm ?? "",
      cuelloCm: x.cuelloCm ?? "",
      brazoCm: x.brazoCm ?? "",
      musloCm: x.musloCm ?? "",
      pantorrillaCm: x.pantorrillaCm ?? "",

      pliegues: x.pliegues ?? "",
      observaciones: x.observaciones ?? "",

      evaluadorRut: x.evaluadorRut ?? "",
      evaluadorNombre: x.evaluadorNombre ?? "",

      creadoEn: x.creadoEn ?? "",
      actualizadoEn: x.actualizadoEn ?? "",

      photoFolderId: x.photoFolderId ?? "",
      fotoFrenteId: x.fotoFrenteId ?? "",
      fotoPerfilId: x.fotoPerfilId ?? "",
      fotoEspaldaId: x.fotoEspaldaId ?? "",
      fotoFrenteUrl: x.fotoFrenteUrl ?? "",
      fotoPerfilUrl: x.fotoPerfilUrl ?? "",
      fotoEspaldaUrl: x.fotoEspaldaUrl ?? "",
    });
  }).filter(x=>x.evalId && x.rutSocio));
  return true;
}

async function refreshLogs(){
  const [wl,cl,bl] = await Promise.all([
    apiGet("WORKOUT_LOG"),
    apiGet("CARDIO_LOG"),
    apiGet("BODY_LOG"),
  ]);

  setWorkoutLog((wl.workout_log || []).map(x => {
    const rutSocio = normalizeRut(x.rutSocio);
    const logId = String(x.logId ?? x.id ?? "").trim();
    return { ...x, rutSocio, logId, id: String(x.id ?? logId ?? "").trim() };
  }).filter(x=>x.logId));

  setCardioLog((cl.cardio_log || []).map(x => ({
    ...x, rutSocio: normalizeRut(x.rutSocio), cardioId: String(x.cardioId ?? "").trim()
  })).filter(x=>x.cardioId));

  setBodyLog((bl.body_log || []).map(x => ({
    ...x, rutSocio: normalizeRut(x.rutSocio), entryId: String(x.entryId ?? "").trim()
  })).filter(x=>x.entryId));

  return true;
}

// ---------------- BOOT ----------------
(async function boot(){
  const mode = String(window.MAHFIT_BOOT_MODE || "full").toLowerCase().trim();

  setDbStatus("connecting");
  try{
    // ✅ Si no hay token aún (pantalla login), NO intentamos llamar endpoints protegidos.
    if(!getToken()){
      setDbStatus("connected");
      return;
    }

    if(mode === "none"){
      setDbStatus("connected");
      return;
    }
    if(mode === "login"){
      await syncDownLogin();
    } else if(mode === "core"){
      await syncDownCore();
    } else {
      await syncDown();
    }
    setDbStatus("connected");
  }catch(e){
    console.error("BOOT ERROR:", e);
    setDbStatus("error");
  }finally{
    if(window.__mahfitReleaseDOMContentLoaded) window.__mahfitReleaseDOMContentLoaded();
  }
})();

/* =========================================================
   ✅ RM helpers (Rutinas) — WORKOUT_SETS_LOG
   ========================================================= */
function getLastRMForExercise(rutSocio, ejercicioId){
  const rows = workoutSetsForExercise(rutSocio, ejercicioId)
    .filter(r => Number(r.e1rm) > 0)
    .sort((a,b)=> Number(b.timestamp||0) - Number(a.timestamp||0));
  return rows[0] || null;
}
function getBestRMForExercise(rutSocio, ejercicioId){
  const rows = workoutSetsForExercise(rutSocio, ejercicioId)
    .filter(r => Number(r.e1rm) > 0);
  if(!rows.length) return null;
  return rows.reduce((best, r) => Number(r.e1rm) > Number(best.e1rm) ? r : best);
}
function rmSuggestions(e1rm){
  const rm = Number(e1rm);
  if(!rm) return null;
  return { pct70: Math.round(rm * 0.70), pct80: Math.round(rm * 0.80) };
}
function detectRMStatus(rutSocio, ejercicioId){
  const rows = workoutSetsForExercise(rutSocio, ejercicioId)
    .filter(r => Number(r.e1rm) > 0)
    .sort((a,b)=> Number(b.timestamp||0) - Number(a.timestamp||0));
  if(rows.length < 2) return null;

  const last = rows[0];
  const prev = rows[1];

  const delta = Number(last.e1rm) - Number(prev.e1rm);
  const rpe = String(last.rpe || "").toLowerCase();

  if(delta > 0 && rpe === "optimo") return { type:"progress", delta };
  if(delta < 0 && rpe === "pesado") return { type:"fatigue", delta };
  return null;
}

// ---------------- Exponer helpers globales ----------------
window.getWorkoutSetsLog = getWorkoutSetsLog;
window.workoutSetsForExercise = workoutSetsForExercise;

window.getLastRMForExercise = getLastRMForExercise;
window.getBestRMForExercise = getBestRMForExercise;
window.rmSuggestions = rmSuggestions;
window.detectRMStatus = detectRMStatus;

window.API_URL = getApiUrl_();
window.setApiUrl = (u)=>{ try{ localStorage.setItem("MAHFIT_API_URL", String(u||"").trim()); }catch(e){} window.API_URL = getApiUrl_(); };
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPostAction = apiPostAction;

window.getUsers = getUsers;
window.setUsers = setUsers;

window.getPlanes = getPlanes;
window.setPlanes = setPlanes;
window.getPlanesActivos = getPlanesActivos;

window.getRutinas = getRutinas;
window.setRutinas = setRutinas;

window.getRutinasV2 = getRutinasV2;
window.setRutinasV2 = setRutinasV2;

window.getPlantillasV2 = getPlantillasV2;
window.setPlantillasV2 = setPlantillasV2;

window.requireAuth = requireAuth;
window.syncDown = syncDown;
window.clearSession = clearSession;
window.login = login;
window.registerUser = registerUser;
window.setDbStatus = setDbStatus;

window.rutinaV2DeSocio = rutinaV2DeSocio;

window.getWorkoutLog = getWorkoutLog;
window.getCardioLog = getCardioLog;
window.getBodyLog = getBodyLog;

window.getWorkoutLogForRut = getWorkoutLogForRut;
window.getCardioLogForRut = getCardioLogForRut;
window.getBodyLogForRut = getBodyLogForRut;

window.getWorkoutLogById = getWorkoutLogById;

window.saveWorkoutLog = saveWorkoutLog;
window.saveCardioLog = saveCardioLog;
window.saveBodyLog = saveBodyLog;

window.refreshLogs = refreshLogs;
window.makeWorkoutLogId = makeWorkoutLogId;
window.makeCardioId = makeCardioId;
window.makeBodyId = makeBodyId;

window.getEvaluations = getEvaluations;
window.setEvaluations = setEvaluations;
window.getEvaluationsForRut = evaluationsForRut;
window.lastEvaluationForRut = lastEvaluationForRut;

window.saveEvaluationComment = saveEvaluationComment;

window.refreshEvaluations = refreshEvaluations;
window.makeEvalId = makeEvalId;

window.evaluationsLastN = evaluationsLastN;
window.toNumClean = toNumClean;

window.uploadEvaluationPhoto = uploadEvaluationPhoto;
window.uploadEvaluationPhotos3 = uploadEvaluationPhotos3;

window.mhfNormText = mhfNormText;
