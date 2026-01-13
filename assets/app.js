/* =========================================================
   MAH FIT - app.js (ESTABLE / LISTO PARA REEMPLAZAR)
   - Backend Google Sheets Apps Script (resource-based)
   - Cache local: users / rutinas / rutinas_v2 / plantillas_v2
   - Login funcional en index.html (engancha submit)
   - requireAuth("ROL") y requireAuth(["A","B"])
   - ✅ USERS incluye planTipo, planInicio, planFin
   - Indicador conexión (dbDot/dbText) 🟢🔴⚪
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxOjrnGx1cj0jg_AmcF3miXVqfql5eIaA2y8J0pDStDXz9ZYTYfITUY0KGBlXVVrTEtTQ/exec";

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
function setDbStatus(status){
  const dot  = document.getElementById("dbDot");
  const text = document.getElementById("dbText");
  if(!dot || !text) return;

  dot.className = "db-dot";
  if(status === "connected"){
    dot.classList.add("connected");
    text.textContent = "Conectado";
  }else if(status === "error"){
    dot.classList.add("error");
    text.textContent = "Sin conexión";
  }else{
    dot.classList.add("connecting");
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
  // USERS
  const u = await apiGet("USERS");
  const users = (u.users || []).map(x => ({
    rut: normalizeRut(x.rut),
    nombre: x.nombre ?? "",
    email: x.email ?? "",
    pass: String(x.pass ?? ""),
    rol: (x.rol ?? x.role ?? "SOCIO"),
    activo: (x.activo === false) ? false : true,
    // ✅ plan
    planTipo: x.planTipo ?? x.plan_tipo ?? "",
    planInicio: x.planInicio ?? x.plan_inicio ?? "",
    planFin: x.planFin ?? x.plan_fin ?? "",
    creadoEn: x.creadoEn ?? ""
  }));
  setUsers(users);

  // Rutinas TXT
  const rt = await apiGet("RUTINAS_TXT");
  setRutinas((rt.rutinas_txt || []).map(x => ({
    id: x.id || crypto.randomUUID(),
    rutSocio: normalizeRut(x.rutSocio),
    titulo: x.titulo ?? "",
    detalle: x.detalle ?? "",
    creadoEn: x.creadoEn ?? "",
    creadoPorRut: x.creadoPorRut ?? ""
  })));

  // Rutinas V2
  const rv2 = await apiGet("RUTINAS_V2");
  setRutinasV2((rv2.rutinas_v2 || []).map(x => {
    let routine = null;
    try{ routine = JSON.parse(x.routine_json || "null"); }catch{}
    return {
      rutSocio: normalizeRut(x.rutSocio),
      routine,
      creadoPorRut: x.creadoPorRut ?? "",
      actualizadoEn: x.actualizadoEn ?? ""
    };
  }));

  // Plantillas V2
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

// ---------------- Seed ADMIN remoto ----------------
async function seedRemoteAdmin(){
  const users = getUsers();
  const exists = users.some(u => normalizeRut(u.rut) === "ADMIN");
  if(exists) return;

  await apiPost("USERS", {
    rut: "ADMIN",
    nombre: "Administrador MAH FIT",
    email: "admin@mahfit.cl",
    pass: "1234",
    rol: "FUNCIONARIO",
    activo: true,
    planTipo: "",
    planInicio: "",
    planFin: "",
    creadoEn: nowISO()
  });

  await syncDown();
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

// ---------------- V2 helper ----------------
function rutinaV2DeSocio(rutSocio){
  const rutSocioN = normalizeRut(rutSocio);
  return getRutinasV2().find(x => x.rutSocio === rutSocioN) || null;
}

// ---------------- INIT INDEX (ESTO FALTABA) ----------------
function initIndex(){
  const loginForm = document.getElementById("loginForm");
  const msgLogin  = document.getElementById("msgLogin");

  function showMsg(txt, ok=false){
    if(!msgLogin) return;
    msgLogin.textContent = txt;
    msgLogin.style.color = ok ? "#a7ffb3" : "#ffb0b0";
  }

  // si ya hay sesión válida, redirige
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

  const resetBtn = document.getElementById("resetBtn");
  resetBtn?.addEventListener("click", ()=>{
    localStorage.removeItem("mahfit_users");
    localStorage.removeItem("mahfit_rutinas");
    localStorage.removeItem("mahfit_rutinas_v2");
    localStorage.removeItem("mahfit_plantillas_v2");
    localStorage.removeItem("mahfit_session");
    alert("Datos locales reiniciados. Recarga la página.");
    window.location.reload();
  });
}

// ---------------- INIT AUTO POR ELEMENTOS ----------------
document.addEventListener("DOMContentLoaded", ()=>{
  // Si existe loginForm => index
  if(document.getElementById("loginForm")) initIndex();
});

// ---------------- BOOT ----------------
(async function boot(){
  setDbStatus("connecting");

  try{
    await syncDown();
    await seedRemoteAdmin();
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
window.getRutinasV2 = getRutinasV2;
window.rutinaV2DeSocio = rutinaV2DeSocio;
window.requireAuth = requireAuth;
window.syncDown = syncDown;
window.clearSession = clearSession;
window.login = login;
window.registerUser = registerUser;
