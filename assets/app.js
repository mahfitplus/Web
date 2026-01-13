/* =========================================================
   MAH FIT - app.js (CORE UNIFICADO)
   - Refleja planInicio / planFin correctamente
   - Cache + Sync real con Sheets
   - Funciona igual en cualquier dispositivo
   ========================================================= */

const API_URL = "https://script.google.com/macros/s/AKfycbwvVYMWWSMdX31lO8fOUfsETb6yVDwq6g27uEsUNdkhTkEFH3M592pENr57FvBh6KxY/exec";

/* ---------------- LOCAL STORAGE ---------------- */
const LS = {
  get(k, f){ try{return JSON.parse(localStorage.getItem(k)) ?? f}catch{return f} },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)) },
  del(k){ localStorage.removeItem(k) }
};

const norm = v => String(v||"").trim();
const normRut = v => norm(v).toUpperCase();

/* ---------------- DB STATUS ---------------- */
function setDbStatus(s){
  const d=document.getElementById("dbDot");
  const t=document.getElementById("dbText");
  if(!d||!t) return;
  d.className="db-dot";
  if(s==="connected"){ d.classList.add("connected"); t.textContent="Conectado"; }
  else if(s==="error"){ d.classList.add("error"); t.textContent="Sin conexión"; }
  else { d.classList.add("connecting"); t.textContent="Conectando…"; }
}

/* ---------------- API ---------------- */
async function apiGet(r){
  const res = await fetch(`${API_URL}?resource=${encodeURIComponent(r)}`);
  const j = await res.json();
  if(!j.ok) throw j;
  return j;
}
async function apiPost(r,d){
  const res = await fetch(API_URL,{
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify({resource:r,data:d})
  });
  const j = await res.json();
  if(!j.ok) throw j;
  return j;
}

/* ---------------- CACHE ---------------- */
const getUsers = ()=>LS.get("mahfit_users",[]);
const setUsers = v=>LS.set("mahfit_users",v);

/* ---------------- SYNC DOWN ---------------- */
async function syncDown(){
  const r = await apiGet("USERS");
  const users = (r.users||[]).map(x=>({
    rut: normRut(x.rut),
    nombre: x.nombre||"",
    email: x.email||"",
    pass: String(x.pass||""),
    rol: x.rol||x.role||"SOCIO",
    activo: x.activo !== false,
    creadoEn: x.creadoEn||"",
    planTipo: x.planTipo||x.PlanTipo||"",
    planInicio: x.planInicio||x.PlanInicio||x.plan_inicio||"",
    planFin: x.planFin||x.PlanFin||x.plan_fin||""
  }));
  setUsers(users);
}

/* ---------------- SESSION ---------------- */
function setSession(u){ LS.set("mahfit_session",{rut:u.rut,rol:u.rol}) }
function getSession(){ return LS.get("mahfit_session",null) }
function clearSession(){ LS.del("mahfit_session") }

/* ---------------- AUTH ---------------- */
function requireAuth(role){
  const s=getSession();
  if(!s){ location.href="index.html"; return null; }
  const u=getUsers().find(x=>x.rut===s.rut);
  if(!u || !u.activo){ clearSession(); location.href="index.html"; return null; }
  if(role && u.rol!==role && role!=="ANY"){
    location.href = u.rol==="FUNCIONARIO"?"funcionario.html":"socio.html";
    return null;
  }
  return u;
}

/* ---------------- PLAN HELPERS ---------------- */
function planStatus(u){
  if(!u.planFin) return {html:"<span class='muted'>Sin plan</span>"};
  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const fin=new Date(u.planFin); fin.setHours(0,0,0,0);
  const d=Math.ceil((fin-hoy)/86400000);
  const txt=fin.toLocaleDateString("es-CL");

  if(d<0) return {html:`<b style="color:#ff5a67">Vencido</b> <span class="muted">(${txt})</span>`};
  if(d===0) return {html:`<b style="color:#ffd36e">Vence hoy</b> <span class="muted">(${txt})</span>`};
  if(d<=5) return {html:`<b style="color:#ffd36e">Quedan ${d} días</b> <span class="muted">(${txt})</span>`};
  return {html:`<b style="color:#2bd576">Quedan ${d} días</b> <span class="muted">(${txt})</span>`};
}

/* ---------------- FUNCIONARIO ---------------- */
function initFuncionario(){
  const me=requireAuth("FUNCIONARIO");
  if(!me) return;

  document.getElementById("who").textContent=me.nombre;
  document.getElementById("roleBadge").textContent="FUNCIONARIO";

  const tbody=document.getElementById("usersTbody");

  function render(){
    tbody.innerHTML="";
    getUsers().forEach(u=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${u.nombre}</td>
        <td>${u.rut}</td>
        <td><span class="pill">${u.rol}</span></td>
        <td>${u.activo?"✅":"⛔"}</td>
        <td>${planStatus(u).html}</td>
        <td>${u.rol==="SOCIO"?`<button class="btn small">Renovar</button>`:""}</td>`;
      tbody.appendChild(tr);
    });
  }

  render();
}

/* ---------------- INDEX ---------------- */
function initIndex(){
  const f=document.getElementById("loginForm");
  f?.addEventListener("submit",e=>{
    e.preventDefault();
    const r=normRut(loginRut.value);
    const p=loginPass.value;
    const u=getUsers().find(x=>x.rut===r && x.pass===p);
    if(!u) return msgLogin.textContent="Credenciales incorrectas";
    setSession(u);
    location.href=u.rol==="FUNCIONARIO"?"funcionario.html":"socio.html";
  });
}

/* ---------------- BOOT ---------------- */
(async()=>{
  setDbStatus("connecting");
  try{
    await syncDown();
    setDbStatus("connected");
  }catch(e){
    console.error(e);
    setDbStatus("error");
  }
})();

document.addEventListener("DOMContentLoaded",()=>{
  const p=document.body.dataset.page;
  if(p==="index") initIndex();
  if(p==="funcionario") initFuncionario();
});

window.getUsers=getUsers;


