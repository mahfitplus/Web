// ========= MAH FIT BACKEND =========
const API_URL = "https://script.google.com/macros/s/AKfycbyyK5YEKZzywrLK9dWiiKhApulJtmY4usSTM7DdZxuUnyw0BwqtDRVRvZe2aZjny9Xl8A/exec";

const LS={get:(k,d)=>JSON.parse(localStorage.getItem(k))??d,set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
const now=()=>new Date().toISOString();
const norm=r=>String(r||"").trim().toUpperCase();

async function apiGet(r){return (await fetch(`${API_URL}?resource=${r}`)).json();}
async function apiPost(r,d){return (await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({resource:r,data:d})})).json();}

async function seed(){const u=await apiGet("USERS");if(!u.users.some(x=>x.rut==="ADMIN"))await apiPost("USERS",{rut:"ADMIN",nombre:"ADMIN",pass:"1234",rol:"FUNCIONARIO",activo:true,creadoEn:now()});}

async function login(r,p){const u=(await apiGet("USERS")).users.find(x=>norm(x.rut)===norm(r)&&x.pass===p);if(!u)throw"Login incorrecto";LS.set("ses",{rut:u.rut,rol:u.rol});return u;}
function logout(){localStorage.clear();location.href="index.html";}
async function auth(role){const s=LS.get("ses");if(!s)return location.href="index.html";const u=(await apiGet("USERS")).users.find(x=>x.rut===s.rut);if(!u||u.rol!==role)location.href="index.html";return u;}

document.addEventListener("DOMContentLoaded",async()=>{
  const page=document.body.dataset.page;
  await seed();

  if(page==="index"){
    document.getElementById("loginForm").onsubmit=async e=>{
      e.preventDefault();
      try{
        const u=await login(loginRut.value,loginPass.value);
        location.href=u.rol==="FUNCIONARIO"?"funcionario.html":"socio.html";
      }catch(err){msgLogin.textContent=err;}
    };
  }

  if(page==="funcionario"){
    const me=await auth("FUNCIONARIO");
    who.textContent=me.nombre;
    createUserForm.onsubmit=async e=>{
      e.preventDefault();
      await apiPost("USERS",{rut:newRut.value,nombre:newNombre.value,email:newEmail.value,pass:newPass.value,rol:newRol.value,activo:true,creadoEn:now()});
      location.reload();
    };
    btnLogout.onclick=logout;
  }

  if(page==="socio"){
    const me=await auth("SOCIO");
    who.textContent=me.nombre;
    const r=(await apiGet("RUTINAS_TXT")).rutinas_txt.find(x=>x.rutSocio===me.rut);
    rutinaBox.innerHTML=r?`<pre>${r.detalle}</pre>`:"Sin rutina asignada";
    btnLogout.onclick=logout;
  }
});


