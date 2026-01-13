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
   - ✅ NUEVO: Plan/Membresía (PlanFin) + columna TIEMPO PLAN + botón Renovar
   ========================================================= */


const API_URL = "https://script.google.com/macros/s/AKfycbwouCS-t64DLBWAf62c-iKX53ZiSyxG2Rly6eXYMdUH1IU98dLM7UGC7xiv46r8ysa3eg/exec";

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

// ---------------- DOMContentLoaded GATE ----------------
(function gateDOMContentLoaded(){
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

// ---------------- API (resource-based) ----------------
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

// ---------------- Fechas Plan helpers ----------------
function parseDateSafe(v){
  if(!v) return null;
  if(v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function toDateOnly(d){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}
function diffDays(a, b){
  // a y b Date (date-only)
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000*60*60*24));
}
function planStatusObj(planFin){
  const end = parseDateSafe(planFin);
  if(!end) return { kind:"none", text:"Sin plan", html:`<span class="muted">Sin plan</span>` };

  const today = toDateOnly(new Date());
  const e = toDateOnly(end);
  const d = diffDays(today, e);
  const endTxt = e.toLocaleDateString("es-CL");

  if(d < 0){
    return { kind:"expired", days:d, text:`Vencido (vence ${endTxt})`, html:`<span style="color:var(--bad);font-weight:900;">Vencido</span> <span class="muted">(vence ${endTxt})</span>` };
  }
  if(d === 0){
    return { kind:"today", days:d, text:`Vence hoy (${endTxt})`, html:`<span style="color:var(--bad);font-weight:900;">Vence hoy</span> <span class="muted">(${endTxt})</span>` };
  }
  if(d <= 5){
    return { kind:"soon", days:d, text:`Quedan ${d} días (vence ${endTxt})`, html:`<span style="color:#ffd36e;font-weight:900;">Quedan ${d} días</span> <span class="muted">(vence ${endTxt})</span>` };
  }
  return { kind:"ok", days:d, text:`Quedan ${d} días (vence ${endTxt})`, html:`<span style="color:var(--ok);font-weight:900;">Quedan ${d} días</span> <span class="muted">(vence ${endTxt})</span>` };
}

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
    creadoEn: x.creadoEn ?? "",

    // ✅ NUEVO: Plan/Membresía
    planTipo: x.planTipo ?? x.PlanTipo ?? "",
    planInicio: x.planInicio ?? x.PlanInicio ?? "",
    planFin: x.planFin ?? x.PlanFin ?? ""
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
    creadoEn: nowISO(),

    // ✅ NUEVO: plan por defecto vacío
    planTipo: "",
    planInicio: "",
    planFin: ""
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

// ---------------- UI helpers ----------------
function $(sel){ return document.querySelector(sel); }
function showMsg(el, msg, ok=false){
  if(!el) return;
  el.textContent = msg;
  el.style.color = ok ? "#a7ffb3" : "#ffb0b0";
}

// ---------------- Plan: Renovar (backend) ----------------
async function renovarPlan(rut){
  rut = normalizeRut(rut);
  const dias = parseInt(prompt("¿Cuántos días quieres agregar al plan? Ej: 30 / 90 / 365"), 10);
  if(!dias || dias <= 0) return;

  try{
    await apiPost("users_plan_update", { rut, dias });
    await syncDown();
    alert("Plan renovado ✅");
  }catch(e){
    console.error(e);
    alert("No se pudo renovar el plan. Revisa Apps Script (users_plan_update).");
  }
}

// ---------------- INIT por página ----------------
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

  loginForm?.addEventListener("submit", (e)=>{
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
      localStorage.removeItem("mahfit_plantillas_v2");
      localStorage.removeItem("mahfit_session");
      alert("Datos locales reiniciados. Recarga la página.");
      window.location.reload();
    });
  }
}

function initFuncionario(){
  const me = requireAuth("FUNCIONARIO");
  if(!me) return;

  const who = document.getElementById("who");
  const roleBadge = document.getElementById("roleBadge");
  if(who) who.textContent = me.nombre;
  if(roleBadge) roleBadge.textContent = "FUNCIONARIO";

  const msgUser = $("#msgUser");
  const tbody = $("#usersTbody");

  const searchInput = document.getElementById("userSearch");
  const roleFilter  = document.getElementById("roleFilter");

  function refreshKPIs(){
    const users = getUsers();
    const kSocios = document.getElementById("kSocios");
    const kFunc = document.getElementById("kFunc");
    const kActivos = document.getElementById("kActivos");
    if(kSocios) kSocios.textContent = users.filter(u=>String(u.rol).toUpperCase()==="SOCIO").length;
    if(kFunc) kFunc.textContent = users.filter(u=>String(u.rol).toUpperCase()==="FUNCIONARIO").length;
    if(kActivos) kActivos.textContent = users.filter(u=>u.activo !== false).length;
  }

  function getFilteredUsers(){
    const users = getUsers().slice();

    const q = String(searchInput?.value || "").toLowerCase().trim();
    const rf = String(roleFilter?.value || "ALL").toUpperCase();

    return users.filter(u=>{
      const rol = String(u.rol || "").toUpperCase();
      const activoTxt = (u.activo === false) ? "INACTIVO" : "ACTIVO";

      const roleOk = (rf === "ALL") ? true : (rol === rf);
      if(!roleOk) return false;

      if(!q) return true;

      const hay = [
        u.nombre || "",
        u.rut || "",
        u.email || "",
        rol,
        activoTxt,
        u.planFin || "",
        u.planTipo || ""
      ].join(" ").toLowerCase();

      return hay.includes(q);
    }).sort((a,b)=> (a.rol>b.rol?1:-1) || String(a.nombre||"").localeCompare(String(b.nombre||"")));
  }

  function refreshTable(){
    if(!tbody) return;

    const list = getFilteredUsers();
    tbody.innerHTML = "";

    for(const u of list){
      const rol = String(u.rol || "").toUpperCase();
      const activo = (u.activo !== false);

      const plan = planStatusObj(u.planFin);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${u.nombre || ""}</td>
        <td>${u.rut || ""}</td>
        <td><span class="pill">${rol}</span></td>
        <td>${activo ? "✅" : "⛔"}</td>
        <td>${plan.html}</td>
        <td style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn small ghost" data-act="${u.rut}">
            ${activo ? "Desactivar" : "Activar"}
          </button>

          ${rol === "SOCIO" ? `
            <button class="btn small" data-ren="${u.rut}">Renovar</button>
          ` : ``}
        </td>
      `;
      tbody.appendChild(tr);
    }

    // ✅ FIX REAL: toggle + guarda en Sheets + resync
    tbody.querySelectorAll("[data-act]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const rut = btn.getAttribute("data-act");
        const users = getUsers();
        const u = users.find(x=>x.rut===rut);
        if(!u) return;

        const activoActual = (u.activo !== false);
        u.activo = !activoActual;

        // optimista local
        setUsers(users);
        refreshKPIs();
        refreshTable();

        try{
          await apiPost("USERS", u);
          await syncDown();
          refreshKPIs();
          refreshTable();
          showMsg(msgUser, "✅ Estado actualizado en Sheets.", true);
        }catch(e){
          console.error(e);
          showMsg(msgUser, "❌ No se pudo guardar en Sheets. Revisa API/permisos.", false);
          await syncDown().catch(()=>{});
          refreshKPIs();
          refreshTable();
        }
      });
    });

    // ✅ Renovar plan
    tbody.querySelectorAll("[data-ren]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const rut = btn.getAttribute("data-ren");
        await renovarPlan(rut);
        refreshKPIs();
        refreshTable();
      });
    });
  }

  // crear usuario
  const createForm = document.getElementById("createUserForm");
  createForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      const newUser = registerUser({
        rut: $("#newRut").value,
        nombre: $("#newNombre").value,
        email: $("#newEmail").value,
        pass: $("#newPass").value,
        rol: $("#newRol").value
      });
      showMsg(msgUser, `✅ Usuario creado: ${newUser.nombre} (${newUser.rol})`, true);
      e.target.reset();

      await syncDown();
      refreshKPIs();
      refreshTable();
    }catch(err){
      showMsg(msgUser, err.message, false);
    }
  });

  // buscador
  searchInput?.addEventListener("input", refreshTable);
  roleFilter?.addEventListener("change", refreshTable);

  // botones top
  document.getElementById("btnLogout")?.addEventListener("click", ()=>{
    clearSession();
    window.location.href = "index.html";
  });

  document.getElementById("btnRutinas")?.addEventListener("click", ()=>{
    window.location.href = "rutinas.html";
  });

  refreshKPIs();
  refreshTable();
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

// ---------------- Ejecuta init por página ----------------
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex();
  if(page === "funcionario") initFuncionario();
});

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

// ✅ nuevo
window.renovarPlan = renovarPlan;

