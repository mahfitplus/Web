/* =========================================================
   MAH FIT - app.js (MINIMO / SIN TOCAR HTML)
   - Mantiene tu "esencia": mismos IDs, mismos flujos
   - Agrega backend (Google Sheets Apps Script)
   - Deja funciones SINCRÓNICAS para no romper tus páginas
   - Soporta requireAuth("ROL") y requireAuth(["A","B"])
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbxNVTZip8UzwOZNo0aBXY56glkVPPHtZURBpoGTRr8usebtaJvxq9Lpx0w8rSEBUESFZg/exec";


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

// -------- DOMContentLoaded GATE --------
// (No modificas tus HTML. Esto evita que corran scripts antes de cargar backend)
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

// -------- API --------
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

// -------- Cache local (la web lo usa) --------
function getUsers(){ return LS.get("mahfit_users", []); }
function setUsers(v){ LS.set("mahfit_users", v); }

function getRutinas(){ return LS.get("mahfit_rutinas", []); }
function setRutinas(v){ LS.set("mahfit_rutinas", v); }

function getRutinasV2(){ return LS.get("mahfit_rutinas_v2", []); }
function setRutinasV2(v){ LS.set("mahfit_rutinas_v2", v); }

// -------- Session --------
function setSession(user){
  LS.set("mahfit_session", { rut:user.rut, rol:user.rol, at: nowISO() });
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
    rol: x.rol ?? "SOCIO",
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

// -------- Auth (SINCRÓNICO, compatible con tus HTML) --------
function requireAuth(expectedRole){
  const s = getSession();
  if(!s){ window.location.href = "index.html"; return null; }

  const user = getUsers().find(u => normalizeRut(u.rut) === normalizeRut(s.rut));
  if(!user || user.activo === false){
    clearSession();
    window.location.href = "index.html";
    return null;
  }

  // expectedRole puede ser string o array
  if(expectedRole){
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    if(!allowed.includes(user.rol) && !allowed.includes(normalizeRut(user.rut))){
      // fallback por si pasas "ADMIN" como rol
      window.location.href = (user.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return null;
    }
  }

  return user;
}

// -------- Login/Register (manteniendo tu esencia) --------
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

  // local inmediato
  users.push(user);
  setUsers(users);

  // remoto
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

// -------- Rutinas (sincrónico para tu socio.html) --------
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

// -------- UI helpers --------
function $(sel){ return document.querySelector(sel); }
function showMsg(el, msg, ok=false){
  if(!el) return;
  el.textContent = msg;
  el.style.color = ok ? "#a7ffb3" : "#ffb0b0";
}

// -------- INIT por página (mantiene tu flujo actual) --------
function initIndex(){
  const loginForm = $("#loginForm");
  const msgLogin  = $("#msgLogin");

  const s = getSession();
  if(s){
    const u = getUsers().find(x => normalizeRut(x.rut) === normalizeRut(s.rut));
    if(u){
      window.location.href = (u.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return;
    }
  }

  loginForm.addEventListener("submit", (e)=>{
    e.preventDefault();
    try{
      const user = login({ rut: $("#loginRut").value, pass: $("#loginPass").value });
      showMsg(msgLogin, "Ingreso correcto. Redirigiendo...", true);
      window.location.href = (user.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
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
    $("#kSocios").textContent = users.filter(u=>u.rol==="SOCIO").length;
    $("#kFunc").textContent = users.filter(u=>u.rol==="FUNCIONARIO").length;
    $("#kActivos").textContent = users.filter(u=>u.activo !== false).length;
  }

  function refreshTable(){
    const users = getUsers().slice().sort((a,b)=> (a.rol>b.rol?1:-1) || a.nombre.localeCompare(b.nombre));
    const tbody = $("#usersTbody");
    tbody.innerHTML = "";

    for(const u of users){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nombre}</td>
        <td>${u.rut}</td>
        <td><span class="pill">${u.rol}</span></td>
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
      showMsg(msgUser, `Usuario creado: ${newUser.nombre} (${newUser.rol})`, true);
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

// -------- BOOT: baja backend -> seed -> libera DOMContentLoaded --------
(async function boot(){
  try{
    await syncDown();
    await seedRemoteAdmin();
  }catch(e){
    console.error("BOOT ERROR:", e);
  }finally{
    if(window.__mahfitReleaseDOMContentLoaded) window.__mahfitReleaseDOMContentLoaded();
  }
})();

// -------- Ejecuta init por página (como ya lo tienes) --------
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex();
  if(page === "funcionario") initFuncionario();
  // socio.html y rutinas.html traen su propia lógica y seguirán funcionando
});

