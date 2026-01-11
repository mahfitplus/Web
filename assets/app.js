/* =========================================================
   MAH FIT - app.js (MINIMO / SIN TOCAR HTML)
   - Mantiene tu "esencia": mismos IDs, mismos flujos
   - Backend Google Sheets Apps Script (resource-based)
   - Funciones SINCRÓNICAS para no romper tus páginas
   - requireAuth("ROL") y requireAuth(["A","B"])
   - Indicador conexión (dbDot/dbText) 🟢🔴⚪
   - ✅ Agrega PLANTILLAS_V2 (sync + cache + helpers)
   - ✅ FIX: soporta rol / role (tu caso actual)
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbywHSxOOwsunALacLErhqB2PMZLsqktUgRSYd6jO-pOZOo0-GaWAvrWbDO3BNZiTgnE/exec";

// -------- LocalStorage helpers --------
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

// 🔧 Normaliza rol aunque venga como "role"
function getRol(u){
  return String((u && (u.rol ?? u.role)) || "").toUpperCase().trim();
}

// -------- DB STATUS (pelotita) --------
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

// -------- DOMContentLoaded GATE --------
(function gateDOMContentLoaded(){
  const origAdd = document.addEventListener.bind(document);
  const queued = [];
  let ready = false;

  document.addEventListener = function(type, listener, options){
    if(type === "DOMContentLoaded"){
      if(ready) {
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

// -------- API (resource-based) --------
async function apiGet(resource){
  const r = await fetch(`${API_URL}?resource=${encodeURIComponent(resource)}`);
  const j = await r.json();
  if(!j.ok) throw new Error(j.error || "API GET error");
  return j;
}
async function apiPost(resource, data){
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ resource, data })
  });
  const j = await r.json();
  if(!j.ok) throw new Error(j.error || "API POST error");
  return j;
}

// -------- Cache local --------
function getUsers(){ return LS.get("mahfit_users", []); }
function setUsers(v){ LS.set("mahfit_users", v); }

function getRutinas(){ return LS.get("mahfit_rutinas", []); }
function setRutinas(v){ LS.set("mahfit_rutinas", v); }

function getRutinasV2(){ return LS.get("mahfit_rutinas_v2", []); }
function setRutinasV2(v){ LS.set("mahfit_rutinas_v2", v); }

// ✅ Plantillas V2 cache
function getPlantillasV2(){ return LS.get("mahfit_plantillas_v2", []); }
function setPlantillasV2(v){ LS.set("mahfit_plantillas_v2", v); }

// -------- Session --------
function setSession(user){
  LS.set("mahfit_session", { rut:user.rut, rol:getRol(user), at: nowISO() });
}
function getSession(){ return LS.get("mahfit_session", null); }
function clearSession(){ LS.del("mahfit_session"); }

// -------- Sync DOWN (Sheets -> cache) --------
async function syncDown(){
  // USERS
  const u = await apiGet("USERS");
  const users = (u.users || []).map(x => ({
    rut: normalizeRut(x.rut),
    nombre: x.nombre ?? "",
    email: x.email ?? "",
    pass: String(x.pass ?? ""),
    // ✅ FIX CLAVE: si viene "role" lo guardamos en "rol"
    rol: (x.rol ?? x.role ?? "SOCIO"),
    activo: (x.activo === false) ? false : true,
    creadoEn: x.creadoEn ?? ""
  }));
  setUsers(users);

  // RUTINAS_TXT
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

  // RUTINAS_V2
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

  // PLANTILLAS_V2
  try{
    const pv2 = await apiGet("PLANTILLAS_V2");
    const tpl = (pv2.plantillas_v2 || []).map(x => {
      let template = null;
      const raw = x.template_json ?? x.template_json_str ?? x.template ?? null;

      if(typeof raw === "string"){
        try{ template = JSON.parse(raw); }catch{ template = null; }
      }else{
        template = raw;
      }

      return {
        templateId: x.templateId || x.id || crypto.randomUUID(),
        nombrePlantilla: x.nombrePlantilla ?? x.nombre ?? "",
        nivel: x.nivel ?? "",
        objetivo: x.objetivo ?? "",
        dias: Number(x.dias ?? 0),
        visibility: (x.visibility ?? "PRIVADA"),
        ownerRut: normalizeRut(x.ownerRut ?? x.creadoPorRut ?? ""),
        ownerNombre: x.ownerNombre ?? "",
        template_json: template,
        creadoEn: x.creadoEn ?? "",
        actualizadoEn: x.actualizadoEn ?? ""
      };
    });
    setPlantillasV2(tpl);
  }catch(e){
    console.warn("No pude sync de PLANTILLAS_V2 (se usa cache local si hay).", e);
  }
}

// -------- Seed ADMIN remoto --------
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
    creadoEn: nowISO()
  });

  await syncDown();
}

// -------- Auth (SINCRÓNICO) --------
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
    const userRol = getRol(user);
    const userRut = normalizeRut(user.rut);
    const allowedUp = allowed.map(a => String(a).toUpperCase().trim());

    if(!allowedUp.includes(userRol) && !allowedUp.includes(userRut)){
      window.location.href = (userRol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return null;
    }
  }

  return user;
}

// -------- Login/Register --------
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
    creadoEn: nowISO()
  };

  users.push(user);
  setUsers(users);

  apiPost("USERS", user).catch(console.error);

  return user;
}

function login({rut, pass}){
  rut = normalizeRut(rut);
  const user = getUsers().find(u => normalizeRut(u.rut) === rut && String(u.pass) === String(pass));
  if(!user) throw new Error("Usuario/RUT o clave incorrecta.");
  if(user.activo === false) throw new Error("Usuario inactivo. Contacta a administración.");
  setSession(user);
  return user;
}

// -------- Rutinas (sincrónico) --------
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

// Helpers Plantillas (para rutinas.html)
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

  if(typeof data.template_json !== "string"){
    data.template_json = JSON.stringify(data.template_json ?? null);
  }
  if(!data.creadoEn) data.creadoEn = nowISO();
  data.actualizadoEn = nowISO();
  data.ownerRut = normalizeRut(data.ownerRut || "");

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

// -------- UI helpers --------
function $(sel){ return document.querySelector(sel); }
function showMsg(el, msg, ok=false){
  if(!el) return;
  el.textContent = msg;
  el.style.color = ok ? "#a7ffb3" : "#ffb0b0";
}

// -------- INIT por página --------
function initIndex(){
  const loginForm = $("#loginForm");
  const msgLogin  = $("#msgLogin");

  const s = getSession();
  if(s){
    const u = getUsers().find(x => normalizeRut(x.rut) === normalizeRut(s.rut));
    if(u){
      window.location.href = (getRol(u) === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return;
    }
  }

  loginForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    try{
      const user = login({ rut: $("#loginRut").value, pass: $("#loginPass").value });
      showMsg(msgLogin, "Ingreso correcto. Redirigiendo...", true);
      window.location.href = (getRol(user) === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
    }catch(err){
      showMsg(msgLogin, err.message);
    }
  });

  const resetBtn = document.getElementById("resetBtn");
  if(resetBtn){
    resetBtn.addEventListener("click", ()=>{
      localStorage.removeItem("mahfit_users");
      localStorage.removeItem("mahfit_rutinas");
      localStorage.removeItem("mahfit_rutinas_v2");
      localStorage.removeItem("mahfit_plantillas_v2");
      localStorage.removeItem("mahfit_session");
      alert("Datos locales reiniciados. Recarga la página.");
      window.location.reload();
    });
  }
}

function initFuncionario(){
  const user = requireAuth("FUNCIONARIO");
  if(!user) return;

  $("#who").textContent = user.nombre;
  $("#roleBadge").textContent = "FUNCIONARIO";

  const msgUser = $("#msgUser");

  function refreshKPIs(){
    const users = getUsers();
    $("#kSocios").textContent = users.filter(u=>getRol(u)==="SOCIO").length;
    $("#kFunc").textContent = users.filter(u=>getRol(u)==="FUNCIONARIO").length;
    $("#kActivos").textContent = users.filter(u=>u.activo !== false).length;
  }

  function refreshTable(){
    const users = getUsers().slice().sort((a,b)=> (getRol(a)>getRol(b)?1:-1) || (a.nombre||"").localeCompare(b.nombre||""));
    const tbody = $("#usersTbody");
    tbody.innerHTML = "";

    for(const u of users){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nombre}</td>
        <td>${u.rut}</td>
        <td><span class="pill">${getRol(u)}</span></td>
        <td>${u.activo === false ? "⛔" : "✅"}</td>
        <td style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn small ghost" data-act="${u.rut}">
            ${u.activo === false ? "Activar" : "Desactivar"}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll("[data-act]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const rut = btn.getAttribute("data-act");
        const users = getUsers();
        const u = users.find(x=>x.rut===rut);
        if(!u) return;

        u.activo = !(u.activo === false);
        setUsers(users);
        apiPost("USERS", u).catch(console.error);

        refreshTable();
        refreshKPIs();
      });
    });
  }

  $("#createUserForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    try{
      const newUser = registerUser({
        rut: $("#newRut").value,
        nombre: $("#newNombre").value,
        email: $("#newEmail").value,
        pass: $("#newPass").value,
        rol: $("#newRol").value
      });
      showMsg(msgUser, `Usuario creado: ${newUser.nombre} (${getRol(newUser)})`, true);
      e.target.reset();
      refreshTable();
      refreshKPIs();
    }catch(err){
      showMsg(msgUser, err.message);
    }
  });

  $("#btnLogout").addEventListener("click", ()=>{
    clearSession();
    window.location.href = "index.html";
  });

  refreshKPIs();
  refreshTable();
}

// -------- BOOT --------
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

// -------- Ejecuta init por página --------
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex();
  if(page === "funcionario") initFuncionario();
  // socio.html y rutinas.html traen su propia lógica y seguirán funcionando
});

// -------- Exponer helpers necesarios globales --------
window.apiGet = apiGet;
window.apiPost = apiPost;
window.getUsers = getUsers;
window.requireAuth = requireAuth;
window.getPlantillasV2 = getPlantillasV2;
window.setPlantillasV2 = setPlantillasV2;
window.plantillasVisiblesPara = plantillasVisiblesPara;
window.savePlantillaV2 = savePlantillaV2;
window.upsertRutina = upsertRutina;
window.upsertRutinaV2 = upsertRutinaV2;
window.rutinaV2DeSocio = rutinaV2DeSocio;
