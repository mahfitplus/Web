// ====== Helpers ======
const LS = {
  get(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch{ return fallback; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

function normalizeRut(rut){
  return String(rut || "").trim().toUpperCase();
}
function nowISO(){ return new Date().toISOString(); }

// ====== Storage ======
function getUsers(){ return LS.get("mahfit_users", []); }
function setUsers(users){ LS.set("mahfit_users", users); }

function getRutinas(){ return LS.get("mahfit_rutinas", []); }
function setRutinas(rutinas){ LS.set("mahfit_rutinas", rutinas); }

function setSession(user){
  LS.set("mahfit_session", { rut:user.rut, rol:user.rol, at: nowISO() });
}
function getSession(){ return LS.get("mahfit_session", null); }
function clearSession(){ localStorage.removeItem("mahfit_session"); }

// ====== Reset (por si hay datos viejos) ======
function resetAllData(){
  localStorage.removeItem("mahfit_users");
  localStorage.removeItem("mahfit_rutinas");
  localStorage.removeItem("mahfit_rutinas_v2");
  localStorage.removeItem("mahfit_session");
  seedIfEmpty(true);
}

// ====== Seed ======
function seedIfEmpty(force=false){
  const users = getUsers();
  if(users.length && !force) return;

  // Admin solicitado:
  // Usuario: ADMIN | Clave: 1234
  const seed = [
    {
      rut: "ADMIN",
      nombre: "Administrador MAH FIT",
      email: "admin@mahfit.cl",
      pass: "1234",
      rol: "FUNCIONARIO",
      activo: true,
      creadoEn: nowISO()
    }
  ];

  setUsers(seed);
  setRutinas([]);
  LS.set("mahfit_rutinas_v2", []);
}

// ====== Auth ======
function requireAuth(expectedRole){
  const s = getSession();
  if(!s){ window.location.href = "index.html"; return null; }

  const user = getUsers().find(u => u.rut === s.rut);
  if(!user || !user.activo){ clearSession(); window.location.href="index.html"; return null; }

  if(expectedRole && user.rol !== expectedRole){
    window.location.href = (user.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
    return null;
  }
  return user;
}

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
    activo:true,
    creadoEn: nowISO()
  };
  users.push(user);
  setUsers(users);
  return user;
}

function login({rut, pass}){
  rut = normalizeRut(rut);
  const user = getUsers().find(u => u.rut === rut && u.pass === String(pass));
  if(!user) throw new Error("Usuario/RUT o clave incorrecta.");
  if(!user.activo) throw new Error("Usuario inactivo. Contacta a administración.");
  setSession(user);
  return user;
}

// ====== Rutinas (texto simple, para que SIEMPRE se vea en socio) ======
function upsertRutina({rutSocio, titulo, detalle, creadoPorRut}){
  const rutSocioN = normalizeRut(rutSocio);
  const rutinas = getRutinas();
  const existing = rutinas.find(r => r.rutSocio === rutSocioN);

  if(existing){
    existing.titulo = titulo;
    existing.detalle = detalle;
    existing.creadoEn = nowISO();
    existing.creadoPorRut = creadoPorRut;
  }else{
    rutinas.push({
      id: crypto.randomUUID(),
      rutSocio: rutSocioN,
      titulo,
      detalle,
      creadoEn: nowISO(),
      creadoPorRut
    });
  }
  setRutinas(rutinas);
}

function rutinaDeSocio(rutSocio){
  const rutSocioN = normalizeRut(rutSocio);
  return getRutinas().find(r => r.rutSocio === rutSocioN) || null;
}

// ===== Rutinas V2 (estructura por días y ejercicios) =====
function getRutinasV2(){ return LS.get("mahfit_rutinas_v2", []); }
function setRutinasV2(v){ LS.set("mahfit_rutinas_v2", v); }

function upsertRutinaV2({rutSocio, routine, creadoPorRut}){
  const rutSocioN = normalizeRut(rutSocio);
  const list = getRutinasV2();
  const existing = list.find(x => x.rutSocio === rutSocioN);

  const payload = {
    rutSocio: rutSocioN,
    routine,
    creadoPorRut,
    actualizadoEn: nowISO()
  };

  if(existing){
    existing.routine = routine;
    existing.creadoPorRut = creadoPorRut;
    existing.actualizadoEn = payload.actualizadoEn;
  }else{
    list.push(payload);
  }
  setRutinasV2(list);
}

function rutinaV2DeSocio(rutSocio){
  const rutSocioN = normalizeRut(rutSocio);
  return getRutinasV2().find(x => x.rutSocio === rutSocioN) || null;
}

function formatRutinaV2ToText(routine, profesorNombre){
  const m = routine.meta;
  const c = m.cardio;

  let out = "";
  out += `NOMBRE: ${routine.socio.nombre} (${routine.socio.rut})\n`;
  out += `NIVEL: ${m.nivel}\n`;
  out += `FECHA: ${m.fecha}\n`;
  out += `OBJETIVO: ${m.objetivo}\n`;
  out += `PROFESOR: ${profesorNombre}\n\n`;
  out += `ENTRENOS/SEMANA: ${m.vecesSemana}\n`;
  out += `CARDIO: ${c.tipo} ${c.min} min | Frec: ${c.freq} veces/semana\n\n`;

  routine.dias.forEach((d)=>{
    out += `========================\n`;
    out += `${d.dia} | ENFOQUE: ${d.enfoque}\n`;
    out += `========================\n`;

    if(!d.ejercicios.length){
      out += `- (Sin ejercicios cargados)\n\n`;
      return;
    }

    d.ejercicios.forEach((e, i)=>{
      out += `${i+1}. [${e.musculo}] ${e.ejercicio} | Maq:${e.maq || "-"} | Series:${e.series || "-"} | Reps:${e.reps || "-"} | Carga:${e.carga || "-"} | Obs:${e.obs || "-"}\n`;
    });
    out += `\n`;
  });

  return out.trim();
}

// ====== UI helpers ======
function $(sel){ return document.querySelector(sel); }
function showMsg(el, msg, ok=false){
  el.textContent = msg;
  el.style.color = ok ? "#a7ffb3" : "#ffb0b0";
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ====== Boot ======
seedIfEmpty();

// ====== Index ======
function initIndex(){
  const loginForm = $("#loginForm");
  const msgLogin  = $("#msgLogin");

  const resetBtn = $("#resetBtn");
  if(resetBtn){
    resetBtn.addEventListener("click", ()=>{
      resetAllData();
      alert("Datos reiniciados. Admin = ADMIN / 1234");
      window.location.reload();
    });
  }

  const s = getSession();
  if(s){
    const u = getUsers().find(x => x.rut === s.rut);
    if(u){
      window.location.href = (u.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
      return;
    }
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try{
      const user = login({
        rut: $("#loginRut").value,
        pass: $("#loginPass").value
      });
      showMsg(msgLogin, "Ingreso correcto. Redirigiendo...", true);
      window.location.href = (user.rol === "FUNCIONARIO") ? "funcionario.html" : "socio.html";
    }catch(err){
      showMsg(msgLogin, err.message);
    }
  });
}

// ====== Socio ======
function initSocio(){
  const user = requireAuth("SOCIO");
  if(!user) return;

  $("#who").textContent = user.nombre;
  $("#roleBadge").textContent = "SOCIO";

  const r = rutinaDeSocio(user.rut);
  if(!r){
    $("#rutinaBox").innerHTML = `
      <div class="notice">
        <b>Plan de entrenamiento no asignado</b><br>
        Tienes un plan activo, pero aún no se te asigna una rutina específica.
      </div>
    `;
  }else{
    $("#rutinaBox").innerHTML = `
      <div class="notice">
        <b>${escapeHtml(r.titulo)}</b><br>
        <div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(r.detalle)}</div>
        <div class="hr"></div>
        <div style="font-size:12px;color:rgba(255,255,255,.70)">
          Actualizado: ${new Date(r.creadoEn).toLocaleString()}
        </div>
      </div>
    `;
  }

  $("#btnLogout").addEventListener("click", () => {
    clearSession();
    window.location.href = "index.html";
  });
}

// ====== Funcionario ======
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
    $("#kActivos").textContent = users.filter(u=>u.activo).length;
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
        <td>${escapeHtml(u.nombre)}</td>
        <td>${escapeHtml(u.rut)}</td>
        <td><span class="pill">${u.rol}</span></td>
        <td>${u.activo ? "✅" : "⛔"}</td>
        <td style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn small ghost" data-act="${u.rut}">
            ${u.activo ? "Desactivar" : "Activar"}
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
        u.activo = !u.activo;
        setUsers(users);
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

// ====== Init per page ======
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex();
  if(page === "socio") initSocio();
  if(page === "funcionario") initFuncionario();
});
