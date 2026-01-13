/* =========================================================
   MAH FIT - app.js (COMPLETO / LISTO PARA REEMPLAZAR)
   - Backend Google Sheets Apps Script (resource-based)
   - Mantiene funciones SINCRÓNICAS para no romper tus HTML
   - requireAuth("ROL") y requireAuth(["A","B"])
   - Cache local: users / rutinas / rutinas_v2 / plantillas_v2
   - Helpers plantillas: plantillasVisiblesPara + savePlantillaV2
   - Indicador conexión (dbDot/dbText) 🟢🔴⚪
   - ✅ FIX: Activar/Desactivar ahora SÍ alterna y escribe TRUE/FALSE en Sheets
   - ✅ Funcionario: buscador y filtro en vivo (sin tocar tu backend)
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbx0XfhanWYg40EwVbPbJ4uuUK31BF3BzAMPM_NzO9pJ90kenvxbbFacLn2bRnFPfAa9Mw/exec";

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
  // status: "connecting" | "connected" | "error"
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
    // ✅ Plan (si existe en la hoja)
    planTipo: x.planTipo ?? x.plan_tipo ?? "",
    planInicio: x.planInicio ?? x.plan_inicio ?? "",
    planFin: x.planFin ?? x.plan_fin ?? "",
    creadoEn: x.creadoEn ?? ""
  }));
  setUsers(users);

  // Rutinas TXT
  const rt = await apiGet("RUTINAS_TXT");
  const rutinas = (rt.rutinas_txt || []).map(x => ({
    id: x.id || crypto.randomUUID(),
    rutSocio: normalizeRut(x.rutSocio),
    titulo: x.titulo ?? "",
    detalle: x.detalle ?? "",
    creadoEn: x.creadoEn ?? "",
    creadoPorRut: x.creadoPorRut ?? ""
  }));
  setRutinas(rutinas);

  // Rutinas V2
  const rv2 = await apiGet("RUTINAS_V2");
  const list = (rv2.rutinas_v2 || []).map(x => {
    let routine = null;
    try{ routine = JSON.parse(x.routine_json || "null"); }catch{}
    return {
      rutSocio: normalizeRut(x.rutSocio),
      routine,
      creadoPorRut: x.creadoPorRut ?? "",
      actualizadoEn: x.actualizadoEn ?? ""
    };
  });
  setRutinasV2(list);

  // Plantillas V2
  const pv2 = await apiGet("PLANTILLAS_V2");
  const tpl = (pv2.plantillas_v2 || []).map(x => {
    let templateObj = null;
    const raw = x.template_json ?? x.templateJson ?? x.template ?? null;

    if(typeof raw === "string"){
      try{ templateObj = JSON.parse(raw); }catch{ templateObj = null; }
    }else{
      templateObj = raw;
    }

    return {
      templateId: x.templateId || x.templateid || x.id || crypto.randomUUID(),
      nombrePlantilla: x.nombrePlantilla ?? x.nombreplantilla ?? x.nombre ?? "",
      nivel: x.nivel ?? "",
      objetivo: x.objetivo ?? "",
      dias: Number(x.dias ?? 0),
      visibility: (x.visibility ?? "PRIVADA"),
      ownerRut: normalizeRut(x.ownerRut ?? x.ownerrut ?? ""),
      ownerNombre: x.ownerNombre ?? x.ownernombre ?? "",
      template_json: templateObj,
      creadoEn: x.creadoEn ?? "",
      actualizadoEn: x.actualizadoEn ?? ""
    };
  });
  setPlantillasV2(tpl);
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

// ---------------- Rutinas ----------------
function upsertRutina({rutSocio, titulo, detalle, creadoPorRut}){
  const rutSocioN = normalizeRut(rutSocio);
  const rutinas = getRutinas();
  const existing = rutinas.find(r => r.rutSocio === rutSocioN);

  const payload = {
    rutSocio: rutSocioN,
    titulo,
    detalle,
    creadoPorRut: creadoPorRut || "",
    creadoEn: nowISO()
  };

  if(existing){
    existing.titulo = titulo;
    existing.detalle = detalle;
    existing.creadoEn = payload.creadoEn;
    existing.creadoPorRut = payload.creadoPorRut;
  }else{
    rutinas.push({ id: crypto.randomUUID(), ...payload });
  }
  setRutinas(rutinas);

  apiPost("RUTINAS_TXT", payload).catch(console.error);
}

function rutinaDeSocio(rutSocio){
  const rutSocioN = normalizeRut(rutSocio);
  return getRutinas().find(r => r.rutSocio === rutSocioN) || null;
}

function upsertRutinaV2({rutSocio, routine, creadoPorRut}){
  const rutSocioN = normalizeRut(rutSocio);
  const list = getRutinasV2();
  const existing = list.find(x => x.rutSocio === rutSocioN);

  const payload = {
    rutSocio: rutSocioN,
    routine_json: JSON.stringify(routine),
    creadoPorRut: creadoPorRut || "",
    actualizadoEn: nowISO()
  };

  if(existing){
    existing.routine = routine;
    existing.creadoPorRut = payload.creadoPorRut;
    existing.actualizadoEn = payload.actualizadoEn;
  }else{
    list.push({
      rutSocio: rutSocioN,
      routine,
      creadoPorRut: payload.creadoPorRut,
      actualizadoEn: payload.actualizadoEn
    });
  }
  setRutinasV2(list);

  apiPost("RUTINAS_V2", payload).catch(console.error);
}

function rutinaV2DeSocio(rutSocio){
  const rutSocioN = normalizeRut(rutSocio);
  return getRutinasV2().find(x => x.rutSocio === rutSocioN) || null;
}

// ---------------- Plantillas helpers ----------------
function plantillasVisiblesPara(user){
  const rut = normalizeRut(user?.rut || "");
  return getPlantillasV2().filter(p=>{
    const vis = String(p.visibility || "").toUpperCase();
    const owner = normalizeRut(p.ownerRut || "");
    return vis === "PUBLICA" || owner === rut;
  });
}

async function savePlantillaV2(payload){
  const data = { ...payload };

  if(!data.templateId) data.templateId = crypto.randomUUID();
  if(!data.creadoEn) data.creadoEn = nowISO();
  data.actualizadoEn = nowISO();
  data.ownerRut = normalizeRut(data.ownerRut || "");

  const templateObj = data.template_json ?? null;
  if(typeof data.template_json !== "string"){
    data.template_json = JSON.stringify(templateObj);
  }

  await apiPost("PLANTILLAS_V2", data);

  const list = getPlantillasV2();
  const idx = list.findIndex(x => String(x.templateId) === String(data.templateId));

  const localObj = {
    templateId: data.templateId,
    nombrePlantilla: data.nombrePlantilla || "",
    nivel: data.nivel || "",
    objetivo: data.objetivo || "",
    dias: Number(data.dias || 0),
    visibility: data.visibility || "PRIVADA",
    ownerRut: normalizeRut(data.ownerRut || ""),
    ownerNombre: data.ownerNombre || "",
    template_json: (()=>{ try{ return JSON.parse(data.template_json); }catch{ return null; } })(),
    creadoEn: data.creadoEn || "",
    actualizadoEn: data.actualizadoEn || ""
  };

  if(idx >= 0) list[idx] = localObj;
  else list.push(localObj);
  setPlantillasV2(list);

  return localObj;
}

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

window.getRutinas = getRutinas;
window.setRutinas = setRutinas;

window.getRutinasV2 = getRutinasV2;
window.setRutinasV2 = setRutinasV2;
window.rutinaV2DeSocio = rutinaV2DeSocio;

window.getPlantillasV2 = getPlantillasV2;
window.setPlantillasV2 = setPlantillasV2;
window.plantillasVisiblesPara = plantillasVisiblesPara;
window.savePlantillaV2 = savePlantillaV2;

window.requireAuth = requireAuth;
window.upsertRutina = upsertRutina;
window.upsertRutinaV2 = upsertRutinaV2;
window.syncDown = syncDown;
window.clearSession = clearSession;
window.login = login;
window.registerUser = registerUser;
