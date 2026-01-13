/* =========================================================
   MAH FIT - app.js (COMPLETO / LISTO PARA REEMPLAZAR)
   - Backend Google Sheets Apps Script (resource-based)
   - Mantiene funciones SINCRÓNICAS para no romper tus HTML
   - requireAuth("ROL") y requireAuth(["A","B"])
   - Cache local: users / rutinas / rutinas_v2 / plantillas_v2
   - Helpers plantillas: plantillasVisiblesPara + savePlantillaV2
   - Indicador conexión (dbDot/dbText) 🟢🔴⚪ (PING REAL)
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbwIx78f0IsuQTRdnEcHT0zuktGdDfuO1P2yjpdPsdxv6iedNTtYQdVzKMtmk2Kv8QttRg/exec";

// ===============================
// Helpers DOMContentLoaded (para esperar BOOT sin romper HTML)
// ===============================
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

// ===============================
// LocalStorage helpers
// ===============================
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

// ---------------- DB STATUS (pelotita) ----------------
function setDbStatus(status, msg){
  // status: "connecting" | "connected" | "error"
  const dot  = document.getElementById("dbDot");
  const text = document.getElementById("dbText");
  if(!dot || !text) return;

  dot.className = "db-dot";

  if(status === "connected"){
    dot.classList.add("connected");
    text.textContent = msg || "Conectado";
  }else if(status === "error"){
    dot.classList.add("error");
    text.textContent = msg || "Sin conexión";
  }else{
    dot.classList.add("connecting");
    text.textContent = msg || "Conectando…";
  }
}

// ✅ Ping real al API (GET, estable para GitHub Pages)
async function pingApi_(){
  try{
    const url = `${API_URL}?resource=USERS&_=${Date.now()}`;
    const r = await fetch(url, { method:"GET", cache:"no-store" });
    const t = await r.text();
    let j = null;
    try{ j = JSON.parse(t); }catch(_){}
    // Si responde 200, lo consideramos conexión OK (aunque no parseara)
    return r.ok && (!j || j.ok === true || j.ok === undefined);
  }catch(_){
    return false;
  }
}

function startDbIndicator_(){
  // primera pasada rápida
  setDbStatus("connecting", "Conectando…");
  (async ()=>{
    const ok = await pingApi_();
    setDbStatus(ok ? "connected" : "error");
  })();

  // refresco periódico
  setInterval(async ()=>{
    const ok = await pingApi_();
    setDbStatus(ok ? "connected" : "error");
  }, 15000);
}

// ===============================
// Storage wrappers
// ===============================
function getUsers(){ return LS.get("mahfit_users", []); }
function setUsers(v){ LS.set("mahfit_users", v); }

function getRutinas(){ return LS.get("mahfit_rutinas", []); }
function setRutinas(v){ LS.set("mahfit_rutinas", v); }

function getRutinasV2(){ return LS.get("mahfit_rutinas_v2", []); }
function setRutinasV2(v){ LS.set("mahfit_rutinas_v2", v); }

function getPlantillasV2(){ return LS.get("mahfit_plantillas_v2", []); }
function setPlantillasV2(v){ LS.set("mahfit_plantillas_v2", v); }

// ===============================
// Session
// ===============================
function setSession(user){
  LS.set("mahfit_session", { rut:user.rut, rol:user.rol, nombre:user.nombre, email:user.email });
}
function getSession(){
  return LS.get("mahfit_session", null);
}
function clearSession(){
  LS.del("mahfit_session");
}
function currentUser(){
  const s = getSession();
  if(!s || !s.rut) return null;
  const u = getUsers().find(x => normalizeRut(x.rut) === normalizeRut(s.rut));
  return u || null;
}

// requireAuth("SOCIO") o requireAuth(["ADMIN","FUNCIONARIO"])
function requireAuth(roles){
  const u = currentUser();
  if(!u){
    if(location.pathname.toLowerCase().includes("index.html")) return null;
    location.href = "index.html";
    return null;
  }
  const arr = Array.isArray(roles) ? roles : [roles];
  if(arr.length && !arr.includes(String(u.rol || "").toUpperCase())){
    location.href = "index.html";
    return null;
  }
  if(u.activo === false || String(u.activo).toLowerCase() === "false"){
    alert("Tu acceso está desactivado. Contacta administración.");
    clearSession();
    location.href = "index.html";
    return null;
  }
  return u;
}

// ===============================
// API helpers
// ===============================
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
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const t = await r.text();
  let j = null;
  try{ j = JSON.parse(t); }catch(e){ j = { ok:false, error:"Respuesta no JSON", raw:t }; }
  if(!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  if(j && j.ok === false) throw new Error(j.error || "API error");
  return j;
}

// ===============================
// Sync DOWN (descarga) + seed admin
// ===============================
async function syncDown(){
  // Baja USERS
  const u = await apiGet("USERS");
  if(u && u.users) setUsers(u.users);

  // Rutinas TXT
  try{
    const rt = await apiGet("RUTINAS_TXT");
    if(rt && rt.rutinas_txt) setRutinas(rt.rutinas_txt);
  }catch(e){
    console.warn("syncDown RUTINAS_TXT:", e.message);
  }

  // Rutinas V2
  try{
    const rv2 = await apiGet("RUTINAS_V2");
    if(rv2 && rv2.rutinas_v2) setRutinasV2(rv2.rutinas_v2);
  }catch(e){
    console.warn("syncDown RUTINAS_V2:", e.message);
  }

  // Plantillas V2
  try{
    const pv2 = await apiGet("PLANTILLAS_V2");
    if(pv2 && pv2.plantillas_v2) setPlantillasV2(pv2.plantillas_v2);
  }catch(e){
    console.warn("syncDown PLANTILLAS_V2:", e.message);
  }
}

async function seedRemoteAdmin(){
  // Si no existe ADMIN, lo crea (para evitar quedar sin acceso)
  const users = getUsers();
  const admin = users.find(u => String(u.rol||"").toUpperCase() === "ADMIN");
  if(admin) return;

  const payload = {
    rut:"ADMIN",
    nombre:"Administrador MAH FIT",
    email:"",
    pass:"admin",
    rol:"ADMIN",
    activo:true,
    creadoEn: nowISO()
  };

  try{
    await apiPost("USERS", payload);
    const u = await apiGet("USERS");
    if(u && u.users) setUsers(u.users);
  }catch(e){
    console.warn("seedRemoteAdmin:", e.message);
  }
}

// ===============================
// Auth: login
// ===============================
function loginByRutAndPass(rut, pass){
  rut = normalizeRut(rut);
  pass = String(pass || "").trim();

  const u = getUsers().find(x => normalizeRut(x.rut) === rut);
  if(!u) return { ok:false, error:"Usuario no encontrado" };

  const realPass = String(u.pass || "").trim();
  if(realPass !== pass) return { ok:false, error:"Clave incorrecta" };

  if(u.activo === false || String(u.activo).toLowerCase() === "false"){
    return { ok:false, error:"Tu acceso está desactivado" };
  }

  setSession(u);
  return { ok:true, user:u };
}

// ===============================
// Helpers Rutina V2 (para socio)
// ===============================
function parseJsonSafe(s){
  try{
    if(typeof s === "object") return s;
    if(!s) return null;
    return JSON.parse(s);
  }catch(e){
    return null;
  }
}

function rutinaV2DeSocio(rutSocio){
  const rut = normalizeRut(rutSocio);
  const all = getRutinasV2();
  const row = all.find(x => normalizeRut(x.rutSocio) === rut);
  if(!row) return null;
  return { ...row, routine: parseJsonSafe(row.routine_json) };
}

// ===============================
// Helpers Plantillas V2
// ===============================
function plantillasVisiblesPara(user){
  const rol = String(user.rol||"").toUpperCase();
  const rut = normalizeRut(user.rut);
  const all = getPlantillasV2();

  return all.filter(p=>{
    const vis = String(p.visibility||"PRIVADA").toUpperCase();
    const owner = normalizeRut(p.ownerRut);
    if(rol === "ADMIN") return true;
    if(vis === "PUBLICA") return true;
    if(vis === "GYM") return true;
    return owner === rut;
  }).map(p=>({ ...p, template: parseJsonSafe(p.template_json) }));
}

async function savePlantillaV2(data){
  const payload = {
    templateId: data.templateId || "",
    nombrePlantilla: data.nombrePlantilla || "",
    nivel: data.nivel || "",
    objetivo: data.objetivo || "",
    dias: Number(data.dias || 0),
    visibility: data.visibility || "PRIVADA",
    ownerRut: data.ownerRut || "",
    ownerNombre: data.ownerNombre || "",
    template_json: typeof data.template_json === "string" ? data.template_json : JSON.stringify(data.template_json || null),
    creadoEn: data.creadoEn || nowISO(),
    actualizadoEn: nowISO(),
  };
  const r = await apiPost("PLANTILLAS_V2", payload);
  // refresca cache
  const pv2 = await apiGet("PLANTILLAS_V2");
  if(pv2 && pv2.plantillas_v2) setPlantillasV2(pv2.plantillas_v2);
  return r;
}

// ===============================
// FUNCIONARIO: render + acciones
// (si tu funcionario.html usa estas)
// ===============================
function boolVal(v){
  if(typeof v === "boolean") return v;
  const s = String(v||"").toLowerCase().trim();
  if(s === "true" || s === "1" || s === "si" || s === "sí") return true;
  if(s === "false" || s === "0" || s === "no") return false;
  return !!v;
}

function formatPlanRemaining(user){
  const fin = user.planFin ? new Date(user.planFin) : null;
  if(!fin || isNaN(fin.getTime())) return { label:"Sin plan", status:"none", days:null };

  fin.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const days = Math.ceil((fin.getTime() - today.getTime()) / (1000*60*60*24));

  if(days < 0) return { label:`Vencido`, status:"expired", days };
  if(days === 0) return { label:`Vence hoy`, status:"today", days:0 };
  return { label:`${days} días`, status: days <= 5 ? "soon" : "active", days };
}

// ===============================
// BOOT
// ===============================
(async function boot(){
  // ✅ indicador real (se actualiza solo)
  startDbIndicator_();

  try{
    await syncDown();
    await seedRemoteAdmin();
    // Si syncDown falló por algo puntual pero el API responde, no muestres "Sin conexión"
    const ok = await pingApi_();
    setDbStatus(ok ? "connected" : "error");
  }catch(e){
    console.error("BOOT ERROR:", e);
    const ok = await pingApi_();
    setDbStatus(ok ? "connected" : "error");
  }finally{
    if(window.__mahfitReleaseDOMContentLoaded) window.__mahfitReleaseDOMContentLoaded();
  }
})();

// ===============================
// Ejecuta init por página
// (tu HTML llama estas funciones)
// ===============================
function pageId(){
  return document.body && document.body.getAttribute("data-page");
}

// INDEX
function initIndex(){
  const rutEl = document.getElementById("loginRut");
  const passEl = document.getElementById("loginPass");
  const btn = document.getElementById("btnLogin");
  const btnReset = document.getElementById("btnResetData");

  if(btn){
    btn.addEventListener("click", ()=>{
      const rut = rutEl ? rutEl.value : "";
      const pass = passEl ? passEl.value : "";
      const res = loginByRutAndPass(rut, pass);
      if(!res.ok){
        alert(res.error || "No se pudo iniciar sesión");
        return;
      }
      const u = res.user;
      const rol = String(u.rol||"").toUpperCase();
      if(rol === "ADMIN" || rol === "FUNCIONARIO") location.href = "funcionario.html";
      else location.href = "socio.html";
    });
  }

  if(btnReset){
    btnReset.addEventListener("click", async ()=>{
      try{
        // limpia cache
        LS.del("mahfit_users");
        LS.del("mahfit_rutinas");
        LS.del("mahfit_rutinas_v2");
        LS.del("mahfit_plantillas_v2");
        clearSession();
        await syncDown();
        alert("Datos reiniciados ✅");
        location.reload();
      }catch(e){
        alert("No se pudo reiniciar. Revisa conexión/API.");
      }
    });
  }
}

// Si necesitas agregar init específico para otras páginas, déjalo aquí
document.addEventListener("DOMContentLoaded", ()=>{
  const p = pageId();
  if(p === "index") initIndex();
});
