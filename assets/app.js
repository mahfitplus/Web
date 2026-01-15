/* =========================================================
   MAH FIT - app.js (ESTABLE / LISTO PARA REEMPLAZAR)
   - Backend Google Sheets Apps Script (resource-based)
   - Cache local: users / planes / rutinas / rutinas_v2 / plantillas_v2
   - ✅ Perfil: telefono, direccion, etc. (syncDown completo)
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbzhSrozYsFaGhAcXj8v6v17EgS5bA3fF5hy6R9cvUMjP0Tr0uBhboNKJUSppUCHV4g03Q/exec";

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

// ---------------- DB STATUS (pelotita) ----------------
// ✅ FIX: clases compatibles con tu CSS (ok/bad/pending) + compat vieja (connected/error/connecting)
function setDbStatus(status){
  const dot  = document.getElementById("dbDot");
  const text = document.getElementById("dbText");
  if(!dot || !text) return;

  // resetea
  dot.className = "db-dot";

  if(status === "connected"){
    // nuevo + compat
    dot.classList.add("ok", "connected");
    text.textContent = "Conectado";
  }else if(status === "error"){
    dot.classList.add("bad", "error");
    text.textContent = "Sin conexión";
  }else{
    dot.classList.add("pending", "connecting");
    text.textContent = "Conectando…";
  }
}

// ---------------- API helpers ----------------
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

// ---------------- Session ----------------
function setSession(user){
  LS.set("mahfit_session", { rut:user.rut, rol:user.rol, at: nowISO() });
}
function getSession(){ return LS.get("mahfit_session", null); }
function clearSession(){ LS.del("mahfit_session"); }

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

    // ✅ PERFIL
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
    msgLogin.style.color = ok ? "#a7ffb3" : "#ffb0b0";
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

function plantillasVisiblesPara(rut){
  const meRut = normalizeRut(rut);
  return (getPlantillasV2() || []).filter(p=>{
    const vis = String(p.visibility || "PRIVADA").toUpperCase().trim();
    const owner = normalizeRut(p.ownerRut || "");
    return vis === "PUBLICA" || owner === meRut;
  });
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
window.plantillasVisiblesPara = plantillasVisiblesPara;
