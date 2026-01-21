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
   ========================================================= */

// ✅ NUEVO API_URL (tu implementación actual)
const API_URL = "https://script.google.com/macros/s/AKfycbxNP9abTgngzg-_HfWPQvW0NKfcQm59cwhDWfWBwMDbNg7tyw3tZToTumIaJdEm54Os7Q/exec";

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

function normalizeRut(r){ return String(r || "").trim().toUpperCase(); }
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
  const bmiAnt = anterior ? calcBMI(anterior.pesoKg, tallaCm) : null;

  document.getElementById("pesoVal").textContent = `${actual.pesoKg} kg`;
  document.getElementById("pesoBadge").textContent =
    `IMC ${bmiAct} · ${bmiLabel(bmiAct)}`;

  document.getElementById("pesoCurr").style.left =
    Math.min(100, (actual.pesoKg / 150) * 100) + "%";

  if(anterior){
    document.getElementById("pesoPrev").style.left =
      Math.min(100, (anterior.pesoKg / 150) * 100) + "%";
  }

  // ===== GRASA VISCERAL =====
  document.getElementById("visVal").textContent = actual.grasaVisceral;
  document.getElementById("visBadge").textContent =
    visceralLabel(actual.grasaVisceral);

  document.getElementById("visCurr").style.left =
    Math.min(100, (actual.grasaVisceral / 20) * 100) + "%";

  if(anterior){
    document.getElementById("visPrev").style.left =
      Math.min(100, (anterior.grasaVisceral / 20) * 100) + "%";
  }
}

// ---------------- API helpers (GET/POST) ----------------
async function apiGet(resource){
  const url = `${API_URL}?resource=${encodeURIComponent(resource)}&_=${Date.now()}`;
  const r = await fetch(url, { method:"GET", cache:"no-store" });
  const t = await r.text();
  let j = null;
  try{ j = JSON.parse(t); }catch(e){ j = { ok:false, error:"Respuesta no JSON", raw:t }; }
  if(!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  if(j && j.ok === false) throw new Error(j.error || "API error");
  return j;
}

async function apiPost(resource, data){
  const payload = { resource, data };
  const r = await fetch(API_URL, {
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" }, // ✅ compat
    body: JSON.stringify(payload),
  });
  const t = await r.text();
  let j = null;
  try{ j = JSON.parse(t); }catch(e){ j = { ok:false, error:"Respuesta no JSON", raw:t }; }
  if(!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  if(j && j.ok === false) throw new Error(j.error || "API error");
  return j;
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

// ✅ LOGS PRO caches
function getWorkoutLog(){ return LS.get("mahfit_workout_log", []); }
function setWorkoutLog(v){ LS.set("mahfit_workout_log", v); }

function getCardioLog(){ return LS.get("mahfit_cardio_log", []); }
function setCardioLog(v){ LS.set("mahfit_cardio_log", v); }

function getBodyLog(){ return LS.get("mahfit_body_log", []); }
function setBodyLog(v){ LS.set("mahfit_body_log", v); }

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
   - Convierte <input type=file> a base64
   - (Opcional) comprime a JPG (más liviano)
   - Sube a Drive vía resource: EVALUATIONS_PHOTO_UPLOAD
   ========================================================= */

function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onload = ()=> resolve(String(fr.result||""));
    fr.onerror = ()=> reject(new Error("No se pudo leer el archivo"));
    fr.readAsDataURL(file);
  });
}

// ✅ compresión simple (sin librerías). Si algo falla, cae al dataURL original.
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

    // force jpg para peso
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

/**
 * Sube UNA foto (frente/perfil/espalda) y actualiza EVALUATIONS en Sheets
 * @param {Object} params
 *  - rutSocio (obligatorio)
 *  - evalId (obligatorio)
 *  - fecha (yyyy-mm-dd) (opcional)
 *  - slot: "frente"|"perfil"|"espalda" (obligatorio)
 *  - file: File (desde input) (obligatorio)
 *  - compress: boolean (default true)
 */
async function uploadEvaluationPhoto({ rutSocio, evalId, fecha, slot, file, compress=true }){
  if(!rutSocio) throw new Error("Falta rutSocio");
  if(!evalId) throw new Error("Falta evalId");
  if(!slot || !["frente","perfil","espalda"].includes(String(slot).toLowerCase())) throw new Error("slot inválido");
  if(!file) throw new Error("Falta file");
  const f = safeStr(fecha, isoLocalDate()).trim();

  // 1) file -> dataURL
  let dataURL = await fileToDataURL(file);

  // 2) (opcional) comprimir
  if(compress){
    dataURL = await compressImageDataURL(dataURL, { maxW: 1080, quality: 0.82 });
  }

  // 3) post
  const mimeType = inferMimeFromDataURL(dataURL);

  const res = await apiPost("EVALUATIONS_PHOTO_UPLOAD", {
    rutSocio: normalizeRut(rutSocio),
    evalId: String(evalId).trim(),
    fecha: f,
    slot: String(slot).toLowerCase(),
    mimeType,
    fileBase64: dataURL
  });

  // 4) refrescar cache (para tener URLs)
  //    (barato y te asegura que se vea en UI)
  await refreshEvaluations().catch(()=>{});

  return res;
}

/**
 * Sube hasta 3 fotos en orden (frente/perfil/espalda)
 * files: { frente?:File, perfil?:File, espalda?:File }
 */
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

  // ✅ LOGS PRO (con fallback logId/id)
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

  // ✅ EVALUATIONS (incluye compat + trae URLs si existen)
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

      // ✅ fotos (si tu sheet ya tiene esas columnas)
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

// ---------------- Auth (SINCRÓNICO) ----------------
function requireAuth(expectedRole){
  const s = getSession();
  if(!s){ window.location.href = "index.html"; return null; }

  const user = getUsers().find(u => normalizeRut(u.rut) === normalizeRut(s.rut));
  if(!user || user.activo === false){
    clearSession();
    window.location.href = "index.html";
    return null;
  }

  if(expectedRole){
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    if(!allowed.includes(user.rol) && !allowed.includes(normalizeRut(user.rut))){
      window.location.href = (user.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return null;
    }
  }
  return user;
}

// ---------------- Login/Register ----------------
function registerUser({rut, nombre, email, pass, rol}){
  rut = normalizeRut(rut);
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

  function showMsg(txt, ok=false){
    if(!msgLogin) return;
    msgLogin.textContent = txt;
    msgLogin.style.color = ok ? "#2bd576" : "#ff6b6b";
  }

  const s = getSession();
  if(s){
    const u = getUsers().find(x => normalizeRut(x.rut) === normalizeRut(s.rut));
    if(u){
      window.location.href = (u.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return;
    }
  }

  loginForm?.addEventListener("submit", (e)=>{
    e.preventDefault();
    try{
      const rut = document.getElementById("loginRut")?.value || "";
      const pass = document.getElementById("loginPass")?.value || "";
      const user = login({ rut, pass });
      showMsg("Ingreso correcto…", true);
      window.location.href = (user.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
    }catch(err){
      showMsg(err.message, false);
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

  /* =========================================================
   ✅ EVALUATIONS: guardar comentario (registro fotográfico)
   - Guarda en Sheets (columna observaciones) por evalId
   - Actualiza cache local para que se vea altiro
   ========================================================= */
async function saveEvaluationComment({ evalId, rutSocio, comentario }){
  const id = String(evalId || "").trim();
  const rut = normalizeRut(rutSocio || "");
  const text = String(comentario ?? "").trim();

  if(!id) throw new Error("Falta evalId");
  if(!rut) throw new Error("Falta rutSocio");

  // ✅ Usa el mismo endpoint EVALUATIONS (upsert/merge por evalId)
  const patch = {
    evalId: id,
    rutSocio: rut,
    observaciones: text,   // ✅ aquí queda el comentario
    actualizadoEn: nowISO()
  };

  const res = await apiPost("EVALUATIONS", patch);

  // ✅ Actualiza cache local (para que la UI refleje altiro)
  const list = upsertLocalByKey(getEvaluations(), "evalId", patch);
  setEvaluations(list);

  return res;
}





  const e = { ...(entry || {}) };

  e.rutSocio = normalizeRut(e.rutSocio || e.rut || "");
  e.fecha = safeStr(e.fecha, isoLocalDate()).trim();

  e.evalId = String(e.evalId ?? "").trim() || makeEvalId({ rutSocio: e.rutSocio, fecha: e.fecha });

  // ✅ compat: si viene masaMuscularPct y no kg, copiamos
  if(e.masaMuscularPct !== undefined && (e.masaMuscularKg === undefined || e.masaMuscularKg === "")){
    e.masaMuscularKg = e.masaMuscularPct;
  }
  // si viene kg y no pct, copiamos
  if(e.masaMuscularKg !== undefined && (e.masaMuscularPct === undefined || e.masaMuscularPct === "")){
    e.masaMuscularPct = e.masaMuscularKg;
  }

  e.actualizadoEn = nowISO();
  if(!e.creadoEn) e.creadoEn = e.actualizadoEn;

  const res = await apiPost("EVALUATIONS", e);

  const list = upsertLocalByKey(getEvaluations(), "evalId", e);
  setEvaluations(list);

  if(res && res.evalId) return res;
  return { ok:true, evalId: e.evalId };




}


/* =========================================================
   ✅ EVALUATIONS: guardar comentario por control (evalId)
   ========================================================= */
async function saveEvaluationComment({ evalId, rutSocio, comentario }){
  const id = String(evalId || "").trim();
  const rut = normalizeRut(rutSocio || "");
  const text = String(comentario ?? "").trim();

  if(!id) throw new Error("Falta evalId");
  if(!rut) throw new Error("Falta rutSocio");

  // patch mínimo (upsert por evalId)
  const patch = {
    evalId: id,
    rutSocio: rut,
    observaciones: text,
    actualizadoEn: nowISO()
  };

  // usa el resource estándar
  const res = await apiPost("EVALUATIONS", patch);

  // refresca cache local altiro
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

      // ✅ fotos
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

/* =========================================================
   ✅ (Opcional) refreshLogs(): baja SOLO logs sin bajar todo
   ========================================================= */
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
  setDbStatus("connecting");
  try{
    await syncDown();
    setDbStatus("connected");
  }catch(e){
    console.error("BOOT ERROR:", e);
    setDbStatus("error");
  }finally{
    if(window.__mahfitReleaseDOMContentLoaded) window.__mahfitReleaseDOMContentLoaded();
  }
})();

// ---------------- Exponer helpers globales ----------------
window.API_URL = API_URL;
window.apiGet = apiGet;
window.apiPost = apiPost;

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

// ✅ LOGS PRO exposed
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

// ✅ EVALUATIONS exposed
window.getEvaluations = getEvaluations;
window.setEvaluations = setEvaluations;
window.getEvaluationsForRut = evaluationsForRut;
window.lastEvaluationForRut = lastEvaluationForRut;


window.saveEvaluationComment = saveEvaluationComment;

window.refreshEvaluations = refreshEvaluations;
window.makeEvalId = makeEvalId;

// ✅ helpers para gráficos
window.evaluationsLastN = evaluationsLastN;
window.toNumClean = toNumClean;

// === MAH FIT | EVALUATION PHOTOS exposed ===
window.uploadEvaluationPhoto = uploadEvaluationPhoto;
window.uploadEvaluationPhotos3 = uploadEvaluationPhotos3;
