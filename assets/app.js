/* ============================================================
   MAH FIT - app.js (BASE ÚNICA)
   - Auth + helpers
   - Cache local (fallback)
   - API Get/Post para Google Apps Script
   - Rutinas V2 / Rutinas TXT
   - Plantillas V2 (preload)
   ============================================================ */

// ✅ TU URL REAL (Apps Script WebApp)
window.MAHFIT_API_URL =
  "https://script.google.com/macros/s/AKfycbywHSxOOwsunALacLErhqB2PMZLsqktUgRSYd6jO-pOZOo0-GaWAvrWbDO3BNZiTgnE/exec";

// =========================
// DOM helpers
// =========================
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return [...document.querySelectorAll(sel)]; }

// =========================
// UI msg helper
// =========================
function showMsg(el, msg, ok=true){
  if(!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "rgba(43,213,118,.95)" : "rgba(255,90,103,.95)";
}

// =========================
// Session / Auth
// =========================
function getSession(){
  try{
    return JSON.parse(localStorage.getItem("mahfit_session") || "null");
  }catch{
    return null;
  }
}

function requireAuth(requiredRole){
  const s = getSession();
  if(!s || !s.rol){
    window.location.href = "index.html";
    return null;
  }
  if(requiredRole && String(s.rol).toUpperCase() !== String(requiredRole).toUpperCase()){
    window.location.href = "index.html";
    return null;
  }
  return s;
}

// =========================
// API Helpers (Apps Script)
// =========================
// Convención esperada:
// GET  ->  {API_URL}?sheet=USUARIOS
// POST ->  body JSON: { sheet:"USUARIOS", ...payload }
// =========================
async function apiGet(sheetName){
  if(!window.MAHFIT_API_URL) throw new Error("MAHFIT_API_URL no está definido.");
  const url = `${window.MAHFIT_API_URL}?sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { method:"GET" });
  if(!res.ok) throw new Error(`apiGet(${sheetName}) falló: ${res.status}`);
  return await res.json();
}

async function apiPost(sheetName, payload){
  if(!window.MAHFIT_API_URL) throw new Error("MAHFIT_API_URL no está definido.");
  const res = await fetch(window.MAHFIT_API_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ sheet: sheetName, ...payload })
  });
  if(!res.ok) throw new Error(`apiPost(${sheetName}) falló: ${res.status}`);
  return await res.json();
}

// =========================
// Local cache helpers
// =========================
function lsGet(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch{
    return fallback;
  }
}
function lsSet(key, val){
  localStorage.setItem(key, JSON.stringify(val));
}

// ============================================================
// USERS
// ============================================================
function getUsers(){
  return lsGet("mahfit_users", []);
}

async function preloadUsers(){
  try{
    const users = await apiGet("USUARIOS");
    if(Array.isArray(users)) lsSet("mahfit_users", users);
  }catch(e){
    console.warn("No pude preloadUsers desde API. Uso cache local.", e);
  }
}

// ============================================================
// RUTINAS V2 (una rutina por socio, editable)
// ============================================================
function getRutinasV2Cache(){
  return lsGet("mahfit_rutinas_v2", []);
}
function setRutinasV2Cache(list){
  lsSet("mahfit_rutinas_v2", Array.isArray(list) ? list : []);
}

async function preloadRutinasV2(){
  try{
    const data = await apiGet("RUTINAS_V2");
    if(Array.isArray(data)) setRutinasV2Cache(data);
  }catch(e){
    console.warn("No pude preloadRutinasV2 desde API. Uso cache local.", e);
  }
}

function rutinaV2DeSocio(rutSocio){
  const rut = String(rutSocio || "");
  const all = getRutinasV2Cache();

  const matches = all.filter(r => String(r.rutSocio || r.rut || "") === rut);
  if(matches.length === 0) return null;

  matches.sort((a,b)=>{
    const ta = Date.parse(a.actualizadoEn || a.creadoEn || 0) || 0;
    const tb = Date.parse(b.actualizadoEn || b.creadoEn || 0) || 0;
    return tb - ta;
  });

  return matches[0];
}

async function upsertRutinaV2({ rutSocio, routine, creadoPorRut }){
  const now = new Date().toISOString();
  const rut = String(rutSocio || "");
  if(!rut) throw new Error("rutSocio requerido.");

  const all = getRutinasV2Cache();
  const idx = all.findIndex(r => String(r.rutSocio || r.rut || "") === rut);

  const row = {
    rutSocio: rut,
    routine,
    creadoPorRut: creadoPorRut || "",
    creadoEn: idx >= 0 ? (all[idx].creadoEn || now) : now,
    actualizadoEn: now
  };

  if(idx >= 0) all[idx] = row;
  else all.push(row);

  setRutinasV2Cache(all);

  // Guardar API
  try{
    await apiPost("RUTINAS_V2", row);
  }catch(e){
    console.warn("No pude guardar RUTINAS_V2 en API (quedó en cache local).", e);
  }

  return row;
}

// ============================================================
// RUTINAS TXT (legacy)
// ============================================================
function getRutinasTxtCache(){
  return lsGet("mahfit_rutinas_txt", []);
}
function setRutinasTxtCache(list){
  lsSet("mahfit_rutinas_txt", Array.isArray(list) ? list : []);
}

async function preloadRutinasTxt(){
  try{
    const data = await apiGet("RUTINAS_TXT");
    if(Array.isArray(data)) setRutinasTxtCache(data);
  }catch(e){
    console.warn("No pude preloadRutinasTxt desde API. Uso cache local.", e);
  }
}

async function upsertRutina({ rutSocio, titulo, detalle, creadoPorRut }){
  const now = new Date().toISOString();
  const rut = String(rutSocio || "");
  if(!rut) throw new Error("rutSocio requerido.");

  const all = getRutinasTxtCache();
  const idx = all.findIndex(r => String(r.rutSocio || r.rut || "") === rut);

  const row = {
    rutSocio: rut,
    titulo: titulo || "",
    detalle: detalle || "",
    creadoPorRut: creadoPorRut || "",
    creadoEn: idx >= 0 ? (all[idx].creadoEn || now) : now,
    actualizadoEn: now
  };

  if(idx >= 0) all[idx] = row;
  else all.push(row);

  setRutinasTxtCache(all);

  // Guardar API
  try{
    await apiPost("RUTINAS_TXT", row);
  }catch(e){
    console.warn("No pude guardar RUTINAS_TXT en API (quedó en cache local).", e);
  }

  return row;
}

// ============================================================
// PLANTILLAS V2 (preload + cache)
// ============================================================
async function preloadPlantillasV2(){
  try{
    const data = await apiGet("PLANTILLAS_V2");
    if(Array.isArray(data)) lsSet("mahfit_plantillas_v2", data);
  }catch(e){
    console.warn("No pude preloadPlantillasV2 desde API.", e);
  }
}

function getPlantillasV2Cache(){
  return lsGet("mahfit_plantillas_v2", []);
}

// ============================================================
// Preload core data (lo llama rutinas.html)
// ============================================================
async function preloadCoreData(){
  await preloadUsers();
  await preloadRutinasV2();
  await preloadRutinasTxt();
  await preloadPlantillasV2();
}

// Exponer globales (rutinas.html los usa)
window.apiGet = apiGet;
window.apiPost = apiPost;

window.getUsers = getUsers;
window.requireAuth = requireAuth;
window.showMsg = showMsg;

window.preloadCoreData = preloadCoreData;

window.rutinaV2DeSocio = rutinaV2DeSocio;
window.upsertRutinaV2 = upsertRutinaV2;

window.upsertRutina = upsertRutina;

window.getPlantillasV2Cache = getPlantillasV2Cache;
