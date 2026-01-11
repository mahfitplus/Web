/* =========================================================
   MAH FIT - app.js (MINIMO / SIN TOCAR HTML)
   - Mantiene tu "esencia": mismos IDs, mismos flujos
   - Agrega backend (Google Sheets Apps Script)
   - Deja funciones SINCRÓNICAS para no romper tus páginas
   - Soporta requireAuth("ROL") y requireAuth(["A","B"])
   - + Indicador de conexión (dbDot/dbText) 🟢🔴⚪
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbywHS6N9c4rZQZ5yKQ7d6P7vH2rjEw0s6xgqJv3g9g2V1E9oWb8KjZ8Q8w9A0bB1/exec";

/* ------------------ Helpers DOM ------------------ */
const $ = (sel)=> document.querySelector(sel);

function showMsg(el, text, ok=true){
  if(!el) return;
  el.textContent = text;
  el.classList.remove("ok","err");
  el.classList.add(ok ? "ok" : "err");
  el.style.display = "block";
}

/* ------------------ Indicador DB (si existe en HTML) ------------------ */
function setDbStatus(state){
  const dot = $("#dbDot");
  const txt = $("#dbText");
  if(!dot || !txt) return;

  dot.classList.remove("connected","error","local");
  if(state === "connected"){
    dot.classList.add("connected");
    txt.textContent = "Conectado";
  }else if(state === "local"){
    dot.classList.add("local");
    txt.textContent = "Modo local";
  }else{
    dot.classList.add("error");
    txt.textContent = "Error";
  }
}

/* ------------------ Storage ------------------ */
function getUsers(){
  try{ return JSON.parse(localStorage.getItem("mahfit_users") || "[]"); }
  catch{ return []; }
}
function setUsers(users){
  localStorage.setItem("mahfit_users", JSON.stringify(users || []));
}
function getSession(){
  try{ return JSON.parse(localStorage.getItem("mahfit_session") || "null"); }
  catch{ return null; }
}
function setSession(session){
  localStorage.setItem("mahfit_session", JSON.stringify(session));
}
function clearSession(){
  localStorage.removeItem("mahfit_session");
}

/* ------------------ Auth ------------------ */
function requireAuth(minRole){
  const s = getSession();
  if(!s || !s.user){
    location.href = "index.html";
    return null;
  }

  const order = { "SOCIO": 1, "FUNCIONARIO": 2, "ADMIN": 3 };
  const need = Array.isArray(minRole)
    ? Math.max(...minRole.map(r=>order[r]||0))
    : (order[minRole] || 1);
  const have = order[s.user.rol] || 0;

  if(have < need){
    alert("No tienes permisos para acceder aquí.");
    location.href = "index.html";
    return null;
  }

  if(s.user.activo === false){
    alert("Usuario desactivado. Contacta a administración.");
    clearSession();
    location.href = "index.html";
    return null;
  }
  return s.user;
}

function logout(){
  clearSession();
  location.href = "index.html";
}

/* ------------------ Backend (Apps Script) ------------------ */
async function apiGet(action){
  const url = `${API_URL}?action=${encodeURIComponent(action)}`;
  const r = await fetch(url, { method:"GET" });
  if(!r.ok) throw new Error(`GET ${action} -> ${r.status}`);
  return await r.json();
}

async function apiPost(action, payload){
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ action, payload })
  });
  if(!r.ok) throw new Error(`POST ${action} -> ${r.status}`);
  return await r.json();
}

/* ------------------ Login ------------------ */
function normalizeRut(rut){
  return (rut||"").trim().toUpperCase().replace(/\s+/g,"");
}

function findUserByRutOrEmailOrAdmin(userInput){
  const users = getUsers();
  const x = normalizeRut(userInput);
  if(!x) return null;

  if(x === "ADMIN") return users.find(u=>u.rut==="ADMIN") || null;

  let u = users.find(u=>normalizeRut(u.rut)===x);
  if(u) return u;

  u = users.find(u=> (u.email||"").trim().toLowerCase() === x.toLowerCase());
  return u || null;
}

function login(rutOrEmail, pass){
  const u = findUserByRutOrEmailOrAdmin(rutOrEmail);
  if(!u) return { ok:false, msg:"Usuario no encontrado" };
  if(u.activo === false) return { ok:false, msg:"Usuario desactivado" };
  if((u.pass||"") !== (pass||"")) return { ok:false, msg:"Contraseña incorrecta" };

  setSession({ user: u, ts: Date.now() });
  return { ok:true, user:u };
}

/* ------------------ Users CRUD ------------------ */
function ensureDefaultAdmin(){
  const users = getUsers();
  const hasAdmin = users.some(u=>u.rol==="ADMIN");
  if(hasAdmin) return;

  users.push({
    rut: "ADMIN",
    nombre: "Administrador MAH FIT",
    email: "",
    pass: "admin",
    rol: "ADMIN",
    activo: true
  });
  setUsers(users);
}

function validateUserPayload(p){
  const rut = normalizeRut(p.rut);
  const nombre = (p.nombre||"").trim();
  const email = (p.email||"").trim().toLowerCase();
  const pass = (p.pass||"").trim();
  const rol = (p.rol||"").trim().toUpperCase();

  if(!rut) throw new Error("Debes ingresar RUT/Usuario");
  if(!nombre) throw new Error("Debes ingresar nombre");
  if(!pass) throw new Error("Debes ingresar contraseña");
  if(!["SOCIO","FUNCIONARIO","ADMIN"].includes(rol)) throw new Error("Rol inválido");

  return { rut, nombre, email, pass, rol };
}

function registerUser(payload){
  const users = getUsers();
  const p = validateUserPayload(payload);

  if(users.some(u=>normalizeRut(u.rut)===p.rut)){
    throw new Error("Ya existe un usuario con ese RUT/Usuario");
  }

  const newUser = { ...p, activo: true };
  users.push(newUser);
  setUsers(users);

  apiPost("USERS", newUser).catch(console.error);

  return newUser;
}

/* ------------------ SyncDown ------------------ */
async function syncDownUsers(){
  const data = await apiGet("SYNC_USERS");
  if(Array.isArray(data.users)){
    setUsers(data.users);
  }
  return data;
}

/* ------------------ Página: index.html ------------------ */
function initIndex(){
  ensureDefaultAdmin();

  const form = $("#loginForm");
  if(!form) return;

  const msg = $("#msgLogin");

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      try{ await syncDownUsers(); }catch(err){ console.warn("SyncDown falló:", err); }

      const rut = $("#loginRut").value;
      const pass = $("#loginPass").value;

      const res = login(rut, pass);
      if(!res.ok){
        showMsg(msg, res.msg, false);
        return;
      }

      showMsg(msg, `Bienvenido ${res.user.nombre}`, true);

      if(res.user.rol === "SOCIO"){
        location.href = "socio.html";
      }else{
        location.href = "funcionario.html";
      }
    }catch(err){
      console.error(err);
      showMsg(msg, "Error al iniciar sesión. Revisa consola.", false);
    }
  });

  const resetBtn = $("#resetBtn");
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

/* ------------------ Página: funcionario.html ------------------ */
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
    const users = getUsers()
      .slice()
      .sort((a,b)=> (a.rol>b.rol?1:-1) || a.nombre.localeCompare(b.nombre));

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
          <button type="button" class="btn small ghost" data-act="${u.rut}">
            ${u.activo === false ? "Activar" : "Desactivar"}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    // ✅ FIX ROBUSTO: un solo listener aunque se re-renderice
    if(!tbody.__mahfitBound){
      tbody.__mahfitBound = true;
      tbody.addEventListener("click", (e)=>{
        const btn = e.target.closest("[data-act]");
        if(!btn) return;

        const rut = btn.getAttribute("data-act");
        const usersNow = getUsers();
        const u = usersNow.find(x=>x.rut===rut);
        if(!u) return;

        // ✅ toggle correcto (antes estaba malo)
        u.activo = (u.activo === false) ? true : false;

        setUsers(usersNow);
        apiPost("USERS", u).catch(console.error);

        refreshTable();
        refreshKPIs();
      });
    }
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
      console.error(err);
      showMsg(msgUser, err.message || "Error creando usuario", false);
    }
  });

  // logout
  $("#btnLogout")?.addEventListener("click", logout);

  // boot
  (async ()=>{
    try{
      ensureDefaultAdmin();

      try{
        await syncDownUsers();
        setDbStatus("connected");
      }catch(err){
        console.warn("No se pudo sincronizar desde backend:", err);
        setDbStatus("local");
      }

      refreshTable();
      refreshKPIs();
    }catch(e){
      console.error("BOOT ERROR:", e);
      setDbStatus("error");
    }finally{
      if(window.__mahfitReleaseDOMContentLoaded) window.__mahfitReleaseDOMContentLoaded();
    }
  })();
}

/* ------------------ Ejecuta init por página ------------------ */
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex();
  if(page === "funcionario") initFuncionario();
});
