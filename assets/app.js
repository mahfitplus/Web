<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MAH FIT | Rutinas</title>
  <link rel="stylesheet" href="styles.css"/>

  <style>
    :root{
      --bg0:#0a0e14;
      --bg1:#0f1623;
      --card:#121b2a;
      --line:rgba(255,255,255,.10);
      --txt:rgba(255,255,255,.88);
      --mut:rgba(255,255,255,.65);
      --ok:#2bd576;
      --bad:#ff5a67;
      --pri:#7c5cff;
      --pri2:#23a6ff;
      --chip:#1a2538;
      --shadow:0 10px 30px rgba(0,0,0,.35);
      --radius:16px;
    }
    body{
      margin:0;
      background:linear-gradient(180deg,var(--bg0),var(--bg1));
      color:var(--txt);
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      min-height:100vh;
    }
    .wrap{
      max-width:1200px;
      margin:0 auto;
      padding:18px;
    }
    .topbar{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      padding:14px 16px;
      background:rgba(255,255,255,.04);
      border:1px solid var(--line);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      backdrop-filter: blur(8px);
    }
    .brand{ display:flex; align-items:center; gap:10px; }
    .logo{
      width:38px;height:38px;
      border-radius:12px;
      background:linear-gradient(135deg,var(--pri),var(--pri2));
      box-shadow:0 8px 18px rgba(124,92,255,.25);
    }
    h1{ margin:0; font-size:18px; letter-spacing:.4px; }
    .pill{
      padding:6px 10px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid var(--line);
      color:var(--mut);
      font-size:12px;
    }
    .grid{
      display:grid;
      grid-template-columns: 420px 1fr;
      gap:16px;
      margin-top:16px;
    }
    @media (max-width: 980px){
      .grid{ grid-template-columns: 1fr; }
    }
    .card{
      background:rgba(255,255,255,.04);
      border:1px solid var(--line);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      padding:14px;
    }
    .card h2{
      margin:0 0 10px 0;
      font-size:14px;
      color:rgba(255,255,255,.92);
      letter-spacing:.4px;
    }
    .row{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      margin-bottom:10px;
    }
    label{
      font-size:12px;
      color:var(--mut);
      display:block;
      margin-bottom:4px;
    }
    input, select, textarea{
      width:100%;
      padding:10px 12px;
      border-radius:12px;
      border:1px solid var(--line);
      background:rgba(0,0,0,.20);
      color:var(--txt);
      outline:none;
    }
    textarea{ min-height:90px; resize:vertical; }
    .col{ flex:1; min-width:160px; }
    .btn{
      border:none;
      cursor:pointer;
      border-radius:12px;
      padding:10px 12px;
      color:#fff;
      font-weight:600;
      background:linear-gradient(135deg,var(--pri),var(--pri2));
      box-shadow:0 10px 20px rgba(35,166,255,.15);
      transition:transform .06s ease;
    }
    .btn:active{ transform:scale(.98); }
    .btn.ghost{
      background:rgba(255,255,255,.06);
      border:1px solid var(--line);
      box-shadow:none;
      color:rgba(255,255,255,.85);
    }
    .btn.danger{
      background:rgba(255,90,103,.12);
      border:1px solid rgba(255,90,103,.35);
      color:#ffd8dc;
      box-shadow:none;
    }
    .btn.small{ padding:7px 10px; border-radius:10px; font-size:12px; }
    .hr{
      height:1px;
      background:var(--line);
      margin:10px 0;
    }
    .notice{
      padding:10px 12px;
      border-radius:12px;
      background:rgba(255,255,255,.05);
      border:1px dashed rgba(255,255,255,.14);
      color:rgba(255,255,255,.75);
      font-size:12px;
    }
    .daysArea{ display:flex; flex-direction:column; gap:12px; }
    .dayCard{
      background:rgba(0,0,0,.18);
      border:1px solid var(--line);
      border-radius:var(--radius);
      padding:12px;
      position:relative;
    }
    .dayHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:10px;
    }
    .dayTitle{
      display:flex;
      align-items:center;
      gap:10px;
      font-weight:700;
      letter-spacing:.3px;
    }
    .dayBadges{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .chip{
      background:rgba(255,255,255,.06);
      border:1px solid var(--line);
      color:rgba(255,255,255,.78);
      padding:4px 8px;
      border-radius:999px;
      font-size:11px;
    }
    .chip.on{
      background:rgba(43,213,118,.14);
      border-color:rgba(43,213,118,.35);
      color:#d9ffe9;
    }
    .focusGrid{
      display:grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap:10px;
      padding:10px;
      border-radius:14px;
      background:rgba(255,255,255,.03);
      border:1px solid var(--line);
      margin-bottom:12px;
    }
    @media (max-width: 980px){
      .focusGrid{ grid-template-columns: repeat(3, 1fr); }
    }
    .focusItem{
      display:flex;
      align-items:center;
      gap:8px;
      font-size:12px;
      color:rgba(255,255,255,.78);
      user-select:none;
    }
    .focusItem input{ width:auto; }
    table{
      width:100%;
      border-collapse:separate;
      border-spacing:0 8px;
      font-size:12px;
    }
    th{
      color:rgba(255,255,255,.55);
      font-weight:600;
      text-align:left;
      padding:0 8px;
      font-size:11px;
    }
    td{
      padding:10px 8px;
      background:rgba(255,255,255,.03);
      border-top:1px solid var(--line);
      border-bottom:1px solid var(--line);
    }
    td:first-child{
      border-left:1px solid var(--line);
      border-top-left-radius:14px;
      border-bottom-left-radius:14px;
    }
    td:last-child{
      border-right:1px solid var(--line);
      border-top-right-radius:14px;
      border-bottom-right-radius:14px;
    }
    .tblInput{
      width:100%;
      padding:8px 10px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.10);
      background:rgba(0,0,0,.15);
      color:rgba(255,255,255,.88);
      outline:none;
      font-size:12px;
    }
    .tblSmall{ max-width:90px; }
    .tblMid{ max-width:130px; }
    .tblBig{ min-width:160px; }
    .rightCol{ display:flex; flex-direction:column; gap:16px; }
    .preview{
      display:none;
      margin-top:12px;
      padding:12px;
      border-radius:16px;
      border:1px solid var(--line);
      background:rgba(0,0,0,.22);
      white-space:pre-wrap;
      color:rgba(255,255,255,.84);
      font-size:12px;
      line-height:1.45;
    }
    .footerBtns{ display:flex; gap:10px; flex-wrap:wrap; }

    .lastCard{
      background:rgba(0,0,0,.20);
      border:1px solid var(--line);
      border-radius:16px;
      padding:12px;
    }
    .lastHead{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:10px;
    }
    .lastTitle{ font-weight:800; letter-spacing:.2px; }
    .pills{ display:flex; gap:8px; flex-wrap:wrap; }
    .pillMini{
      font-size:12px;
      padding:6px 10px;
      border-radius:999px;
      background:rgba(255,255,255,.06);
      border:1px solid var(--line);
      color:rgba(255,255,255,.86);
    }
    .mutedLine{
      color:rgba(255,255,255,.72);
      font-size:12px;
      margin-top:6px;
      line-height:1.35;
    }

    .modal{
      position:fixed;
      inset:0;
      display:none;
      align-items:center;
      justify-content:center;
      background:rgba(0,0,0,.55);
      z-index:9999;
      padding:18px;
    }
    .modalBox{
      width:min(980px, 100%);
      max-height:85vh;
      overflow:auto;
      background:rgba(10,14,20,.95);
      border:1px solid var(--line);
      border-radius:18px;
      box-shadow:0 20px 60px rgba(0,0,0,.50);
      padding:14px;
    }
    .modalTop{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:10px;
      margin-bottom:12px;
    }
    .modalTitle{
      font-weight:900;
      letter-spacing:.3px;
    }
    .socPreviewCard{
      background:rgba(255,255,255,.03);
      border:1px solid var(--line);
      border-radius:16px;
      padding:12px;
      margin-bottom:12px;
    }
    .socMeta{
      display:flex;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap;
      font-size:12px;
      color:rgba(255,255,255,.78);
    }
    .socMeta b{ color:rgba(255,255,255,.92); }
    .collapseDay{
      border:1px solid var(--line);
      border-radius:16px;
      background:rgba(0,0,0,.18);
      margin-bottom:10px;
      overflow:hidden;
    }
    .collapseHead{
      padding:10px 12px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      cursor:pointer;
    }
    .collapseBody{
      display:none;
      padding:10px 12px 12px;
      border-top:1px solid var(--line);
    }
    .exList{
      display:flex;
      flex-direction:column;
      gap:8px;
      margin-top:8px;
    }
    .exItem{
      background:rgba(255,255,255,.03);
      border:1px solid var(--line);
      border-radius:14px;
      padding:10px;
      font-size:12px;
      color:rgba(255,255,255,.84);
    }
    .exItem b{ color:#fff; }
  </style>
</head>

<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand">
        <div class="logo"></div>
        <div>
          <h1>Constructor de Rutinas</h1>
          <div class="pill">MAH FIT · Guardado Online (Sheets)</div>
        </div>
      </div>
      <div class="row" style="margin:0">
        <div class="row" style="margin:0; align-items:center;">
          <div class="db-badge" title="Estado de conexión" style="margin-right:8px;">
            <span id="dbDot" class="db-dot connecting"></span>
            <span id="dbText">Conectando…</span>
          </div>
        </div>

        <button class="btn ghost small" id="btnVolver">Volver</button>
        <button class="btn danger small" id="btnLogout">Salir</button>
      </div>
    </div>

    <div class="grid">
      <!-- Left -->
      <div class="card">
        <h2>Datos de la Rutina</h2>

        <div class="row">
          <div class="col">
            <label>Socio</label>
            <input id="socioSearch" placeholder="Buscar socio por nombre o RUT..." />
          </div>
        </div>

        <div class="row">
          <div class="col">
            <label>Selecciona Socio</label>
            <select id="socioSelect"></select>
          </div>
        </div>

        <div class="row">
          <div class="col">
            <label>Nivel</label>
            <select id="nivel">
              <option value="Principiante">Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
          </div>
          <div class="col">
            <label>Objetivo</label>
            <select id="objetivo">
              <option value="Hipertrofia">Hipertrofia</option>
              <option value="Fuerza">Fuerza</option>
              <option value="Pérdida de grasa">Pérdida de grasa</option>
              <option value="Rendimiento">Rendimiento</option>
            </select>
          </div>
        </div>

        <div class="row">
          <div class="col">
            <label>Fecha (opcional)</label>
            <input id="fecha" placeholder="Ej: 2026-01-10" />
          </div>
        </div>

        <div class="row">
          <div class="col">
            <label>Notas (opcional)</label>
            <textarea id="notas" placeholder="Indicaciones generales, técnica, RIR, etc."></textarea>
          </div>
        </div>

        <div class="hr"></div>

        <h2>Agregar Días</h2>
        <div class="row">
          <div class="col" style="max-width:120px">
            <label>Día</label>
            <select id="dayPicker">
              <option value="1">Día 1</option>
              <option value="2">Día 2</option>
              <option value="3">Día 3</option>
              <option value="4">Día 4</option>
              <option value="5">Día 5</option>
              <option value="6">Día 6</option>
              <option value="7">Día 7</option>
            </select>
          </div>
          <div class="col" style="max-width:180px; align-self:flex-end;">
            <button class="btn" id="btnAddDay">Agregar día</button>
          </div>
        </div>

        <div class="notice">
          <b>Tip:</b> define el <b>Enfoque</b> por día (músculos principales) y agrega ejercicios con series/reps/carga/descanso.
        </div>

        <div class="hr"></div>

        <h2>Acciones</h2>

        <div class="footerBtns">
          <button class="btn" id="btnGuardar">Guardar Rutina</button>
          <button class="btn ghost" id="btnVista">Vista Socio</button>
        </div>

        <div class="hr"></div>

        <h2>Plantillas</h2>

        <div class="row">
          <div class="col">
            <label>Buscar Plantilla</label>
            <input id="tplSearch" placeholder="Ej: Hipertrofia 4 días..." />
          </div>
        </div>

        <div class="row">
          <div class="col">
            <label>Selecciona Plantilla</label>
            <select id="tplSelect"></select>
          </div>
        </div>

        <div class="footerBtns">
          <button class="btn ghost" id="btnCargarPlantilla">Cargar Plantilla</button>
          <button class="btn" id="btnGuardarPlantilla">Guardar como Plantilla</button>
        </div>

        <p id="msg" style="margin:10px 0 0 0; font-size:12px; color:rgba(255,255,255,.75)"></p>
        <div class="preview" id="previewBox"></div>

        <div class="hr"></div>

        <h2>Última rutina encontrada</h2>
        <div class="lastCard" id="lastRoutineBox">
          <div class="mutedLine">Selecciona un socio para ver su última rutina.</div>
        </div>
      </div>

      <!-- Right -->
      <div class="rightCol">
        <div class="card">
          <h2>Días de entrenamiento</h2>
          <div class="daysArea" id="daysContainer"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Vista Socio -->
  <div class="modal" id="vistaModal">
    <div class="modalBox">
      <div class="modalTop">
        <div class="modalTitle">Vista Socio</div>
        <button class="btn ghost small" id="btnCerrarVista">Cerrar</button>
      </div>
      <div id="vistaContenido"></div>
    </div>
  </div>

  <script src="assets/app.js"></script>

  <script>
    function $(sel){ return document.querySelector(sel); }
    function showMsg(el, msg, ok=false){
      if(!el) return;
      el.textContent = msg;
      el.style.color = ok ? "#a7ffb3" : "#ffb0b0";
    }
    function nowISO(){ return new Date().toISOString(); }

    // ✅ UUID seguro (evita el error rojo si no existe crypto.randomUUID)
    function uid(){
      try{
        if(window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
      }catch{}
      return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
    }

    // ==========================================================
    // Base ejercicios
    // ==========================================================
    const EXERCISE_DB = {"Pectoral":["Press banca inclinada Smith","Press banca Smith","Press banca plano (barra)","Press banca plano (mancuernas)","Press banca plano (discos)","Press banca inclinado (barra)","Press banca inclinado (mancuernas)","Press banca declinado (barra)","Press banca declinado (mancuernas)","Press banca con agarre estrecho","Press banca en máquina","Press banca en máquina inclinada","Press banca en máquina declinada","Press banca en polea","Press banca en multipower","Press banca en multipower inclinado","Press banca en multipower declinado","Press en máquina hammer","Press en máquina hammer inclinado","Press en máquina hammer declinado","Press en máquina convergente","Press en máquina convergente inclinado","Press en máquina convergente declinado","Press en máquina plate loaded","Press en máquina plate loaded inclinado","Press en máquina plate loaded declinado","Aperturas en máquina (pec deck)","Aperturas en polea alta","Aperturas en polea media","Aperturas en polea baja","Aperturas con mancuernas banco plano","Aperturas con mancuernas banco inclinado","Aperturas con mancuernas banco declinado","Pullover con mancuerna","Pullover en polea","Fondos en paralelas","Fondos asistidos","Cruce de poleas","Cruce de poleas inclinado","Cruce de poleas declinado","Flexiones de brazo (push ups)","Flexiones con lastre","Flexiones en TRX","Flexiones inclinadas","Flexiones declinadas","Press de pecho con banda","Press de pecho en landmine","Squeeze press (mancuernas)"],"Hombros":["Press militar (barra)","Press militar (mancuernas)","Press militar en máquina","Press militar Smith","Press Arnold","Elevaciones laterales (mancuernas)","Elevaciones laterales en polea","Elevaciones laterales en máquina","Elevaciones frontales (barra)","Elevaciones frontales (mancuernas)","Elevaciones frontales en polea","Elevaciones frontales con disco","Pájaros (posteriores)","Pájaros en máquina","Pájaros en polea","Face pull","Remo al mentón (barra)","Remo al mentón (mancuernas)","Remo al mentón en polea","Press tras nuca (barra)","Press tras nuca Smith","Elevaciones laterales sentado","Elevaciones laterales inclinado","Elevaciones laterales con banda","Elevaciones frontales alternadas","Elevaciones frontales con cuerda","Press militar unilateral","Press militar en landmine","Press militar con banda","Y-raise","T-raise","W-raise","Rotación externa con banda","Rotación externa en polea","Rotación interna en polea","Rotación interna con banda","Elevación posterior en banco inclinado","Elevación posterior con mancuernas","Elevación posterior con polea","Encogimiento de hombros","Farmer walk","Carrera del granjero","Caminata del oso"],"Trapecio":["Encogimientos con barra","Encogimientos con mancuernas","Encogimientos en máquina Smith","Encogimientos en máquina","Encogimientos en polea","Face pull","Remo al mentón (barra)"],"Dorsales":["Jalón al pecho (polea)","Jalón al pecho agarre cerrado","Jalón al pecho agarre neutro","Jalón al pecho agarre supino","Jalón tras nuca","Dominadas pronas","Dominadas supinas","Dominadas neutras","Dominadas asistidas","Remo en polea baja","Remo en polea baja agarre cerrado","Remo en polea baja agarre neutro","Remo con barra","Remo con mancuernas","Remo con T-bar","Remo en máquina","Remo en máquina hammer","Pulldown con brazos rectos","Pullover en polea","Pullover en máquina","Remo unilateral en polea","Remo unilateral en máquina"],"Espalda":["Remo con barra","Remo con barra pendlay","Remo con mancuernas","Remo con T-bar","Remo en polea baja","Remo en máquina","Remo en máquina hammer","Remo sentado con cable","Remo a una mano con mancuerna","Remo a una mano en polea","Remo invertido","Peso muerto","Peso muerto rumano","Peso muerto sumo","Buenos días","Hip hinge","Face pull","Remo al mentón","Encogimientos","Dominadas","Jalón al pecho"],"Lumbares":["Hiperextensiones","Hiperextensiones en banco romano","Buenos días","Peso muerto","Peso muerto rumano","Superman","Bird-dog","Puente glúteo","Plancha","Good morning con banda","Extensión lumbar en máquina"],"Bíceps":["Curl con barra","Curl con mancuernas","Curl alternado","Curl martillo","Curl concentrado","Curl en banco inclinado","Curl spider","Curl predicador","Curl predicador en máquina","Curl en polea baja","Curl en polea con cuerda","Curl en polea con barra recta","Curl en polea con barra EZ","Curl en polea unilateral","Curl 21","Curl Zottman","Curl con banda","Curl con barra EZ","Curl en máquina","Curl tipo martillo en polea","Curl reverso","Curl de arrastre","Dominadas supinas","Chin ups","Curl en TRX","Curl en banco Scott","Curl Scott con barra EZ","Curl Scott con mancuernas","Curl en cable alto","Curl tipo bayesian","Curl en polea posterior","Curl con barra olímpica","Curl con barra W","Curl isométrico","Curl en máquina hammer","Curl en máquina convergente","Curl con mancuerna tipo crossbody","Curl en polea con agarre neutro","Curl sentado","Curl de pie"],"Tríceps":["Extensión en polea alta (barra)","Extensión en polea alta (cuerda)","Extensión en polea alta (unilateral)","Fondos en paralelas","Fondos asistidos","Press banca agarre estrecho","Press francés (barra)","Press francés (mancuernas)","Extensión por encima de la cabeza (mancuerna)","Extensión por encima de la cabeza (polea)","Patada de tríceps (mancuerna)","Patada de tríceps (polea)","Extensión en banco (skull crushers)","Extensión en banco inclinado","Extensión en máquina","Extensión en máquina hammer","Extensión en polea con barra V","Extensión en polea con barra recta","Extensión en polea con barra EZ","Extensión en polea con cuerda doble","Extensión en polea inversa","Press cerrado en multipower","Press cerrado con mancuernas","Flexiones diamante","Flexiones cerradas","Extensión con banda","Dips en banco","Dips en banco con peso","Press militar agarre cerrado","Extensión unilateral por encima (mancuerna)","Extensión unilateral en polea alta","Extensión en polea alta sentado","Pressdown con agarre supino","Pressdown con agarre neutro","Kickback en banco","Extensión en TRX","Press francés en polea","Extensión a 45°","Extensión con cuerda por encima"],"Antebrazos":["Curl de muñeca (barra)","Curl de muñeca (mancuernas)","Curl de muñeca en polea","Curl reverso (barra)","Curl reverso (mancuernas)","Extensión de muñeca","Pronación con mancuerna","Supinación con mancuerna","Farmer walk","Agarre con toalla","Agarre en barra","Pinch grip","Rodillo de antebrazo","Martillo en polea"],"Abdominales/Core":["Crunch","Crunch en máquina","Crunch en polea","Crunch bicicleta","Crunch inverso","Elevación de piernas","Elevación de piernas colgado","Elevación de rodillas","Plancha","Plancha lateral","Plancha con toques","Plancha con elevación","Russian twist","Woodchopper (polea)","Pallof press","Ab wheel","Rollout con barra","Mountain climbers","Dead bug","Hollow hold","V-ups","Sit-ups","Sit-ups con peso","Toe touches","Flutter kicks","Scissor kicks","Superman","Bird-dog","Hip thrust hold","Puente glúteo","Rotación de tronco","Encogimientos","Encogimientos en banco declinado","Encogimientos con cable","Encogimientos con pelota","Crunch con pelota","Side bends","Oblicuos en polea","Oblicuos con mancuerna","Plank walk","Bear crawl","Farmer carry","Suitcase carry","Dragon flag","L-sit","Pike","Leg raises en banco","Leg raises en paralelas","Bicicleta en el suelo","Crunch isométrico","Vacuum","Cable crunch","Reverse crunch en banco","Toe-to-bar","Knee-to-elbow","Side plank dips","Twist con barra","Twist con disco","Rotaciones con banda","Rotaciones en máquina"],"Cuádriceps":["Sentadilla","Sentadilla smith","Sentadilla frontal","Sentadilla goblet","Sentadilla hack","Sentadilla búlgara","Sentadilla sumo","Prensa de piernas","Prensa inclinada","Prensa horizontal","Prensa unilateral","Extensión de piernas","Extensión de piernas unilateral","Zancadas","Zancadas caminando","Zancadas estáticas","Step-up","Sissy squat","Sentadilla en multipower","Sentadilla en jaula","Sentadilla con pausa","Sentadilla profunda","Sentadilla a caja","Wall sit","Leg press con pies bajos","Leg press con pies juntos","Split squat","Hack squat máquina","Hack squat libre","Sentadilla con banda","Sentadilla con mancuernas","Sentadilla con barra","Sentadilla con disco","Sentadilla con kettlebell","Sentadilla en landmine","Sentadilla tempo","Sentadilla 1 y 1/4","Zancada lateral","Zancada inversa","Zancada en multipower","Extensión de piernas con banda","Pistol squat","Pistol asistido","Prensa con pies altos (mixto)","Sentadilla en máquina","Sentadilla en máquina convergente","Step-down","Reverse step-up","Leg extension isométrico","Sentadilla con salto","Box jump","Saltos al cajón","Drop jump","Jump squat","Skater jumps","Sentadilla isométrica","Sentadilla con TRX","Sentadilla con polea","Sentadilla con barra safety"],"Isquiotibiales":["Peso muerto rumano","Peso muerto a piernas rígidas","Curl femoral acostado","Curl femoral sentado","Curl femoral de pie","Curl femoral unilateral","Buenos días","Hip hinge","Puente glúteo (mixto)","Hip thrust (mixto)","Nordic curl","Glute ham raise","Kettlebell swing","Cable pull-through","Peso muerto sumo (mixto)","Curl femoral con fitball","Curl femoral con banda","Peso muerto con mancuernas","Peso muerto con barra","RDL unilateral","Good morning con banda","Curl femoral en máquina","Curl femoral en polea","Curl femoral deslizante","Back extension (mixto)","Reverse hyper","Leg curl isométrico","RDL con pausa","Buenos días con barra","Peso muerto desde bloques","Curl femoral con toalla"],"Glúteos":["Hip thrust","Hip thrust smith","Hip thrust con banda","Puente glúteo","Patada de glúteo en polea","Patada de glúteo en máquina","Abducción de cadera en máquina","Abducción con banda","Sentadilla sumo","Peso muerto sumo","Peso muerto rumano (mixto)","Zancada inversa","Zancada caminando (mixto)","Step-up","Sentadilla búlgara (mixto)","Pull-through en polea","Kettlebell swing","Frog pumps","Fire hydrants","Donkey kicks","Clamshell","Monster walk","Side walk con banda","Kickback unilateral en polea","Hip thrust unilateral","Puente glúteo unilateral","Peso muerto unilateral","Sentadilla a caja (mixto)","Good morning (mixto)","Back extension (mixto)","Reverse hyper","Abducción acostado","Abducción en polea baja","Elevación de cadera","Extensión de cadera en máquina","Cable kickback","Hip airplane","Curtsy lunge","Sentadilla sumo con mancuerna","Hip thrust con pausa","Puente glúteo con pausa"],"Aductores/Abductores":["Aducción de cadera en máquina","Aducción con banda","Aducción en polea","Aducción acostado","Aducción en fitball","Copenhagen plank","Aducción isométrica","Abducción de cadera en máquina","Abducción con banda","Abducción en polea"],"Pantorrillas":["Elevación de talones de pie","Elevación de talones sentado","Elevación de talones en prensa","Elevación de talones unilateral","Elevación de talones en smith","Elevación de talones en máquina","Donkey calf raise","Calf raise con mancuernas","Calf raise con barra","Calf raise en escalón","Saltos de pantorrilla","Pliometría de tobillo","Farmer walk en puntas","Jump rope","Tibialis raise","Elevación de punta (tibial anterior)"],"Cardio":["Trotadora","Caminadora","Eliptica","Bicicleta","Bicicleta estática","Remo","Escaladora","Stepper","HIIT","Sprints","Cuerda","Air bike","Assault bike","Spinning","Caminata inclinada","Caminata rápida","Trote suave","Trote continuo","Ciclismo","Natación","Boxeo","Shadow boxing","Saco de boxeo","Battle ropes","Circuito","Burpees"]};
    const MUSCLES = Object.keys(EXERCISE_DB);

    function dayCardTemplate(dayNum){
      return `
        <div class="dayCard" data-day="${dayNum}">
          <div class="dayHead">
            <div class="dayTitle">
              <span>DÍA ${dayNum}</span>
              <div class="dayBadges" id="badges-${dayNum}">
                <span class="chip">Enfocado</span>
              </div>
            </div>
            <div class="row" style="margin:0">
              <button class="btn ghost small" data-addex="${dayNum}">+ Ejercicio</button>
              <button class="btn danger small" data-removeday="${dayNum}">Quitar Día</button>
            </div>
          </div>

          <div class="notice" style="margin-bottom:10px">
            <b>Enfocado</b><br/>
            Selecciona uno o más músculos para el enfoque del día.
          </div>

          <div class="focusGrid" id="focus-${dayNum}">
            ${MUSCLES.map(m => `
              <label class="focusItem">
                <input type="checkbox" data-focus="${dayNum}" value="${m}"/>
                <span>${m}</span>
              </label>
            `).join("")}
          </div>

          <table>
            <thead>
              <tr>
                <th>MÚSCULO</th>
                <th>EJERCICIO</th>
                <th>N° MAQ/VAR</th>
                <th>OBS.</th>
                <th>SERIES</th>
                <th>REPS</th>
                <th>CARGA</th>
                <th>DESCANSO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody id="tbody-${dayNum}"></tbody>
          </table>
        </div>
      `;
    }

    function rowTemplate(dayNum){
      const muscleOptions = MUSCLES.map(m => `<option value="${m}">${m}</option>`).join("");
      return `
        <tr>
          <td>
            <select class="tblInput tblBig" data-muscle="${dayNum}">
              ${muscleOptions}
            </select>
          </td>
          <td>
            <input class="tblInput tblBig" list="dl-${dayNum}" placeholder="Escribe o elige" data-ex="${dayNum}"/>
            <datalist id="dl-${dayNum}"></datalist>
          </td>
          <td><input class="tblInput tblSmall" placeholder="N° maq / variante" data-maq="${dayNum}"/></td>
          <td><input class="tblInput tblMid" placeholder="Técnica / tempo / RIR.." data-obs="${dayNum}"/></td>
          <td><input class="tblInput tblSmall" placeholder="3" data-series="${dayNum}"/></td>
          <td><input class="tblInput tblSmall" placeholder="8-12" data-reps="${dayNum}"/></td>
          <td><input class="tblInput tblSmall" placeholder="kg" data-carga="${dayNum}"/></td>
          <td><input class="tblInput tblSmall" placeholder="Ej: 1:30" data-desc="${dayNum}"/></td>
          <td><button class="btn ghost small" data-delrow="${dayNum}">Quitar</button></td>
        </tr>
      `;
    }

    function updateDatalist(dayNum, muscle){
      const dl = document.getElementById(`dl-${dayNum}`);
      if(!dl) return;
      dl.innerHTML = (EXERCISE_DB[muscle] || []).map(ex => `<option value="${ex}"></option>`).join("");
    }

    function updateFocusBadges(dayNum){
      const box = document.getElementById(`badges-${dayNum}`);
      const checked = [...document.querySelectorAll(`input[data-focus="${dayNum}"]:checked`)].map(x=>x.value);
      if(!box) return;

      if(checked.length === 0){
        box.innerHTML = `<span class="chip">Enfocado</span>`;
        return;
      }
      box.innerHTML = checked.map(m=>`<span class="chip on">${m}</span>`).join("");
    }

    function wireDayActions(){
      document.querySelectorAll("[data-addex]").forEach(btn=>{
        btn.onclick = ()=>{
          const d = btn.getAttribute("data-addex");
          document.querySelector(`#tbody-${d}`).insertAdjacentHTML("beforeend", rowTemplate(d));
          wireRowActions(d);
        };
      });

      document.querySelectorAll("[data-removeday]").forEach(btn=>{
        btn.onclick = ()=>{
          const d = btn.getAttribute("data-removeday");
          const card = document.querySelector(`.dayCard[data-day="${d}"]`);
          if(card) card.remove();
          addedDays.delete(String(d));
        };
      });

      document.querySelectorAll("input[data-focus]").forEach(ch=>{
        ch.onchange = ()=>{
          const d = ch.getAttribute("data-focus");
          updateFocusBadges(d);
        };
      });
    }

    function wireRowActions(dayNum){
      document.querySelectorAll(`[data-delrow="${dayNum}"]`).forEach(btn=>{
        btn.onclick = ()=>{
          btn.closest("tr")?.remove();
        };
      });

      document.querySelectorAll(`select[data-muscle="${dayNum}"]`).forEach(sel=>{
        sel.onchange = ()=> updateDatalist(dayNum, sel.value);
        updateDatalist(dayNum, sel.value);
      });
    }

    function collectRoutine(){
      const socioVal = $("#socioSelect").value;
      const socio = getUsers().find(u=>String(u.rut) === String(socioVal));
      if(!socio) throw new Error("Selecciona un socio válido.");

      const meta = {
        nivel: $("#nivel").value,
        objetivo: $("#objetivo").value,
        fecha: $("#fecha").value || "",
        notas: $("#notas").value || ""
      };

      const dias = [];
      document.querySelectorAll(".dayCard").forEach(card=>{
        const d = card.getAttribute("data-day");
        const enfoque = [...document.querySelectorAll(`input[data-focus="${d}"]:checked`)].map(x=>x.value);

        const ejercicios = [];
        const tbody = document.getElementById(`tbody-${d}`);
        [...tbody.querySelectorAll("tr")].forEach(tr=>{
          const musculo = tr.querySelector(`select[data-muscle="${d}"]`)?.value || "";
          const ejercicio = tr.querySelector(`input[data-ex="${d}"]`)?.value || "";
          const maq = tr.querySelector(`input[data-maq="${d}"]`)?.value || "";
          const obs = tr.querySelector(`input[data-obs="${d}"]`)?.value || "";
          const series = tr.querySelector(`input[data-series="${d}"]`)?.value || "";
          const reps = tr.querySelector(`input[data-reps="${d}"]`)?.value || "";
          const carga = tr.querySelector(`input[data-carga="${d}"]`)?.value || "";
          const descanso = tr.querySelector(`input[data-desc="${d}"]`)?.value || "";

          if(musculo && ejercicio){
            ejercicios.push({ musculo, ejercicio, maq, obs, series, reps, carga, descanso });
          }
        });

        dias.push({ dia:`Día ${d}`, enfoque, ejercicios });
      });

      if(dias.length === 0) throw new Error("Debes agregar al menos 1 día.");

      return {
        socio: { rut: socio.rut, nombre: socio.nombre },
        meta,
        dias
      };
    }

    function formatRutinaText(routine, profName){
      let out = "";
      out += `RUTINA DE ENTRENAMIENTO\n`;
      out += `Socio: ${routine.socio.nombre} (${routine.socio.rut})\n`;
      out += `Nivel: ${routine.meta.nivel}\n`;
      out += `Objetivo: ${routine.meta.objetivo}\n`;
      if(routine.meta.fecha) out += `Fecha: ${routine.meta.fecha}\n`;
      if(routine.meta.notas) out += `Notas: ${routine.meta.notas}\n`;
      out += `Profesor: ${profName}\n`;
      out += `\n==============================\n\n`;

      routine.dias.forEach(day=>{
        out += `${day.dia}\n`;
        if(day.enfoque?.length) out += `Enfoque: ${day.enfoque.join(" + ")}\n`;
        out += `\n`;
        day.ejercicios.forEach((e, i)=>{
          out += `${i+1}. ${e.musculo} - ${e.ejercicio} | Series: ${e.series} | Reps: ${e.reps} | Carga: ${e.carga} | Desc: ${e.descanso}\n`;
          if(e.maq) out += `   Maq/Var: ${e.maq}\n`;
          if(e.obs) out += `   Obs: ${e.obs}\n`;
        });
        out += `\n------------------------------\n\n`;
      });

      return out;
    }

    function showLastRoutineBoxPretty(lastV2){
      const box = $("#lastRoutineBox");
      if(!lastV2){
        box.innerHTML = `<div class="mutedLine">Este socio no tiene rutina guardada aún.</div>`;
        return;
      }

      const r = lastV2.routine || lastV2;
      const m = r.meta || {};
      const dias = Array.isArray(r.dias) ? r.dias.length : 0;
      const actualizado = lastV2.actualizadoEn || lastV2.creadoEn || "";

      box.innerHTML = `
        <div class="lastHead">
          <div class="lastTitle">Última rutina encontrada</div>
          <div class="pills">
            <span class="pillMini">Nivel: <b>${m.nivel || "-"}</b></span>
            <span class="pillMini">Días: <b>${dias}</b></span>
          </div>
        </div>

        <div class="mutedLine"><b>Últ. Modificación:</b> ${actualizado ? new Date(actualizado).toLocaleString() : "-"}</div>
        <div class="mutedLine"><b>Objetivo:</b> ${m.objetivo || "-"}</div>

        <div style="margin-top:10px">
          <button class="btn" id="btnCargarUltima">Cargar para editar</button>
        </div>
      `;

      $("#btnCargarUltima").onclick = ()=>{
        try{
          loadRoutineIntoBuilder(r);
          showMsg($("#msg"), "✅ Rutina cargada. Puedes editar y volver a guardar.", true);
        }catch(err){
          showMsg($("#msg"), err.message, false);
        }
      };
    }

    function clearBuilderDays(){
      $("#daysContainer").innerHTML = "";
      addedDays.clear();
    }

    function extractDayNumber(dayLabel){
      const m = String(dayLabel || "").match(/\d+/);
      return m ? String(m[0]) : "1";
    }

    function addDayIfNotExists(dayNum){
      if(addedDays.has(String(dayNum))) return;
      $("#daysContainer").insertAdjacentHTML("beforeend", dayCardTemplate(dayNum));
      addedDays.add(String(dayNum));
      wireDayActions();
      updateFocusBadges(dayNum);
    }

    function loadRoutineIntoBuilder(routine){
      $("#nivel").value = routine.meta?.nivel || "Principiante";
      $("#objetivo").value = routine.meta?.objetivo || "Hipertrofia";
      $("#fecha").value = routine.meta?.fecha || "";
      $("#notas").value = routine.meta?.notas || "";

      clearBuilderDays();

      const dias = Array.isArray(routine.dias) ? routine.dias : [];
      if(dias.length === 0){
        $("#dayPicker").value = "1";
        $("#btnAddDay").click();
        return;
      }

      dias.forEach(day=>{
        const dayNum = extractDayNumber(day.dia);
        addDayIfNotExists(dayNum);

        const enfoqueArr = Array.isArray(day.enfoque) ? day.enfoque : [];
        enfoqueArr.forEach(m=>{
          const cb = document.querySelector(`input[data-focus="${dayNum}"][value="${m}"]`);
          if(cb) cb.checked = true;
        });
        updateFocusBadges(dayNum);

        const tbody = document.getElementById(`tbody-${dayNum}`);
        tbody.innerHTML = "";

        (day.ejercicios || []).forEach(ex=>{
          tbody.insertAdjacentHTML("beforeend", rowTemplate(dayNum));
          wireRowActions(dayNum);

          const tr = tbody.querySelector("tr:last-child");
          if(!tr) return;

          const selM = tr.querySelector(`select[data-muscle="${dayNum}"]`);
          const inEx = tr.querySelector(`input[data-ex="${dayNum}"]`);
          const inMaq = tr.querySelector(`input[data-maq="${dayNum}"]`);
          const inObs = tr.querySelector(`input[data-obs="${dayNum}"]`);
          const inSeries = tr.querySelector(`input[data-series="${dayNum}"]`);
          const inReps = tr.querySelector(`input[data-reps="${dayNum}"]`);
          const inCarga = tr.querySelector(`input[data-carga="${dayNum}"]`);
          const inDesc = tr.querySelector(`input[data-desc="${dayNum}"]`);

          if(selM){
            selM.value = ex.musculo || selM.value;
            updateDatalist(dayNum, selM.value);
          }
          if(inEx) inEx.value = ex.ejercicio || "";
          if(inMaq) inMaq.value = ex.maq || "";
          if(inObs) inObs.value = ex.obs || "";
          if(inSeries) inSeries.value = ex.series || "";
          if(inReps) inReps.value = ex.reps || "";
          if(inCarga) inCarga.value = ex.carga || "";
          if(inDesc) inDesc.value = ex.descanso || "";
        });
      });
    }

    function renderVistaSocio(routine, profesorNombre){
      const cont = $("#vistaContenido");
      const m = routine.meta || {};
      const dias = routine.dias || [];

      cont.innerHTML = `
        <div class="socPreviewCard">
          <div class="socMeta">
            <div><b>Socio:</b> ${routine.socio?.nombre || "-"} (${routine.socio?.rut || "-"})</div>
            <div><b>Nivel:</b> ${m.nivel || "-"}</div>
            <div><b>Objetivo:</b> ${m.objetivo || "-"}</div>
            <div><b>Fecha:</b> ${m.fecha || "-"}</div>
          </div>
          ${m.notas ? `<div class="mutedLine" style="margin-top:10px"><b>Notas:</b> ${m.notas}</div>` : ``}
          <div class="mutedLine" style="margin-top:8px"><b>Profesor:</b> ${profesorNombre || "-"}</div>
        </div>

        ${dias.map((d, idx)=>`
          <div class="collapseDay" data-cday="${idx}">
            <div class="collapseHead">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <b style="letter-spacing:.2px">${d.dia || `Día ${idx+1}`}</b>
                ${(d.enfoque||[]).map(x=>`<span class="chip on">${x}</span>`).join("")}
                ${(d.enfoque||[]).length===0 ? `<span class="chip">Sin enfoque</span>` : ``}
              </div>
              <span style="opacity:.8">Abrir/Cerrar</span>
            </div>
            <div class="collapseBody" id="cbody-${idx}">
              ${
                (d.ejercicios||[]).length === 0
                ? `<div class="mutedLine">No hay ejercicios cargados para este día.</div>`
                : `<div class="exList">
                    ${(d.ejercicios||[]).map((e,i)=>`
                      <div class="exItem">
                        <b>${i+1}. ${e.ejercicio || "-"}</b> — <span style="opacity:.85">${e.musculo || "-"}</span><br/>
                        <span style="opacity:.85">
                          Series: <b>${e.series||"-"}</b> · Reps: <b>${e.reps||"-"}</b> · Carga: <b>${e.carga||"-"}</b> · Descanso: <b>${e.descanso||"-"}</b>
                        </span>
                        ${e.maq ? `<div style="opacity:.78;margin-top:6px">Maq/Var: ${e.maq}</div>` : ``}
                        ${e.obs ? `<div style="opacity:.78;margin-top:6px">Obs: ${e.obs}</div>` : ``}
                      </div>
                    `).join("")}
                  </div>`
              }
            </div>
          </div>
        `).join("")}
      `;

      cont.querySelectorAll(".collapseDay").forEach(cd=>{
        const idx = cd.getAttribute("data-cday");
        const head = cd.querySelector(".collapseHead");
        const body = cd.querySelector(`#cbody-${idx}`);
        head.onclick = ()=> body.style.display = (body.style.display === "block") ? "none" : "block";
      });
    }

    function openVistaModal(){ $("#vistaModal").style.display = "flex"; }
    function closeVistaModal(){ $("#vistaModal").style.display = "none"; }

    function filterSocios(q){
      q = String(q||"").toLowerCase().trim();
      const users = getUsers().filter(u=>{
        const rol = String(u.rol || u.role || "").toUpperCase().trim();
        const activo = (u.activo === false) ? false : true;
        return rol === "SOCIO" && activo;
      });
      if(!q) return users;
      return users.filter(u =>
        (u.nombre||"").toLowerCase().includes(q) ||
        (u.rut||"").toLowerCase().includes(q)
      );
    }

    async function preloadCoreData(){
      if(typeof window.preloadCoreData === "function"){
        try{ await window.preloadCoreData(); return; }catch(e){ console.warn(e); }
      }
      if(typeof window.syncDown === "function"){
        try{ await window.syncDown(); return; }catch(e){ console.warn(e); }
      }
      try{
        if(typeof window.apiGet === "function" && typeof window.setUsers === "function"){
          const u = await apiGet("USERS");
          const list = (u.users || []).map(x=>({
            rut: String(x.rut||"").trim().toUpperCase(),
            nombre: x.nombre || "",
            email: x.email || "",
            pass: String(x.pass || ""),
            rol: x.rol ?? x.role ?? "SOCIO",
            activo: (x.activo === false) ? false : true,
            creadoEn: x.creadoEn || ""
          }));
          setUsers(list);
        }
      }catch(e){
        console.warn("No pude precargar USERS.", e);
      }
    }

    // ✅ Guardado REAL (await) para evitar "error rojo" silencioso
    async function saveRutinaV2Online({rutSocio, routine, creadoPorRut}){
      const payload = {
        rutSocio: String(rutSocio||"").trim().toUpperCase(),
        routine_json: JSON.stringify(routine),
        creadoPorRut: String(creadoPorRut||"").trim().toUpperCase(),
        actualizadoEn: nowISO()
      };
      await apiPost("RUTINAS_V2", payload);

      // cache local
      const list = getRutinasV2();
      const idx = list.findIndex(x => String(x.rutSocio||"").toUpperCase() === payload.rutSocio);
      const localObj = {
        rutSocio: payload.rutSocio,
        routine,
        creadoPorRut: payload.creadoPorRut,
        actualizadoEn: payload.actualizadoEn
      };
      if(idx >= 0) list[idx] = localObj; else list.push(localObj);
      setRutinasV2(list);
    }

    async function saveRutinaTxtOnline({rutSocio, titulo, detalle, creadoPorRut}){
      const payload = {
        rutSocio: String(rutSocio||"").trim().toUpperCase(),
        titulo: titulo || "",
        detalle: detalle || "",
        creadoPorRut: String(creadoPorRut||"").trim().toUpperCase(),
        creadoEn: nowISO()
      };
      await apiPost("RUTINAS_TXT", payload);

      // cache local (1 por socio)
      const rutinas = getRutinas();
      const idx = rutinas.findIndex(r => String(r.rutSocio||"").toUpperCase() === payload.rutSocio);
      const localObj = { id: (idx>=0 ? rutinas[idx].id : uid()), ...payload };
      if(idx >= 0) rutinas[idx] = localObj; else rutinas.push(localObj);
      setRutinas(rutinas);
    }

    const addedDays = new Set();

    document.addEventListener("DOMContentLoaded", async ()=>{
      let me = requireAuth("FUNCIONARIO");
      if(!me) return;

      await preloadCoreData();

      $("#btnVolver").onclick = ()=> window.location.href = "funcionario.html";
      $("#btnLogout").onclick = ()=>{
        localStorage.removeItem("mahfit_session");
        window.location.href = "index.html";
      };

      $("#btnCerrarVista").onclick = closeVistaModal;
      $("#vistaModal").addEventListener("click", (e)=>{
        if(e.target.id === "vistaModal") closeVistaModal();
      });

      const socioSelect = $("#socioSelect");
      const search = $("#socioSearch");

      function renderSocios(list){
        const current = socioSelect.value || "";
        socioSelect.innerHTML = "";
        list.forEach(u=>{
          const opt = document.createElement("option");
          opt.value = u.rut;
          opt.textContent = `${u.nombre} (${u.rut})`;
          socioSelect.appendChild(opt);
        });
        if(current && [...socioSelect.options].some(o=>o.value===current)){
          socioSelect.value = current;
        }
      }

      renderSocios(filterSocios(""));

      search.addEventListener("input", ()=> renderSocios(filterSocios(search.value)));
      search.addEventListener("keydown", (e)=>{ if(e.key==="Enter") e.preventDefault(); });

      socioSelect.addEventListener("change", ()=>{
        const rut = socioSelect.value;
        const last = rutinaV2DeSocio(rut);
        showLastRoutineBoxPretty(last);
      });

      $("#btnAddDay").onclick = ()=>{
        const d = String($("#dayPicker").value);
        if(addedDays.has(d)){
          showMsg($("#msg"), `⚠️ Día ${d} ya está agregado.`, false);
          return;
        }
        $("#daysContainer").insertAdjacentHTML("beforeend", dayCardTemplate(d));
        addedDays.add(d);
        wireDayActions();
        updateFocusBadges(d);
        showMsg($("#msg"), `Agregado: Día ${d}`, true);
      };

      $("#dayPicker").value = "1";
      $("#btnAddDay").click();

      setTimeout(()=>{
        const rut = socioSelect.value;
        if(rut){
          const last = rutinaV2DeSocio(rut);
          showLastRoutineBoxPretty(last);
        }
      }, 150);

      // ✅ GUARDAR RUTINA (FIX REAL)
      $("#btnGuardar").onclick = async ()=>{
        const msgEl = $("#msg");
        try{
          showMsg(msgEl, "Guardando rutina…", true);

          const routine = collectRoutine();
          const rutinaId = uid();

          // 1) ITEMS (histórico) -> ahora SÍ esperamos
          await apiPost("RUTINAS_ITEMS", {
            rutinaId,
            routine,
            profesorRut: me.rut,
            profesorNombre: me.nombre
          });

          // 2) V2 (por socio) -> await real
          await saveRutinaV2Online({
            rutSocio: routine.socio.rut,
            routine,
            creadoPorRut: me.rut
          });

          // 3) TXT legacy -> await real
          const txt = formatRutinaText(routine, me.nombre);
          await saveRutinaTxtOnline({
            rutSocio: routine.socio.rut,
            titulo: `Rutina ${routine.meta.nivel} (${routine.dias.length} días)`,
            detalle: txt,
            creadoPorRut: me.rut
          });

          // (Opcional) refrescar desde Sheets para asegurar
          if(typeof syncDown === "function"){
            try{ await syncDown(); }catch(e){ console.warn("syncDown falló:", e); }
          }

          const last = rutinaV2DeSocio(routine.socio.rut);
          showLastRoutineBoxPretty(last);

          showMsg(msgEl, "✅ Rutina guardada. El socio ya la puede ver en su panel.", true);
        }catch(err){
          console.error(err);
          const msg = (err && err.message) ? err.message : String(err);
          showMsg(msgEl, "⛔ Error al guardar: " + msg, false);
        }
      };

      $("#btnVista").onclick = ()=>{
        try{
          const routine = collectRoutine();
          renderVistaSocio(routine, me.nombre);
          openVistaModal();
        }catch(err){
          showMsg($("#msg"), err.message, false);
        }
      };

      // Plantillas (igual que antes)
      const tplSearch = $("#tplSearch");
      const tplSelect = $("#tplSelect");
      let plantillasCache = [];

      function normalizeTplJson(x){
        if(!x) return null;
        if(typeof x === "string"){
          try{ return JSON.parse(x); }catch{ return null; }
        }
        return x;
      }

      function plantillaToOptionText(p){
        const n = p.nombrePlantilla || "Plantilla sin nombre";
        const niv = p.nivel || "-";
        const obj = p.objetivo || "-";
        const d = p.dias || "-";
        const vis = (String(p.visibility || "").toUpperCase() === "PUBLICA") ? "🌍" : "🔒";
        return `${vis} ${n} · ${obj} · ${niv} · ${d} días`;
      }

      function renderPlantillas(q){
        q = String(q||"").toLowerCase().trim();
        const list = !q ? plantillasCache : plantillasCache.filter(p =>
          String(p.nombrePlantilla||"").toLowerCase().includes(q) ||
          String(p.objetivo||"").toLowerCase().includes(q) ||
          String(p.nivel||"").toLowerCase().includes(q)
        );

        const current = tplSelect.value || "";
        tplSelect.innerHTML = "";

        list.forEach(p=>{
          const opt = document.createElement("option");
          opt.value = p.templateId;
          opt.textContent = plantillaToOptionText(p);
          tplSelect.appendChild(opt);
        });

        if(current && [...tplSelect.options].some(o=>o.value === current)){
          tplSelect.value = current;
        }
      }

      async function cargarPlantillasDesdeSheets(){
        try{
          const resp = await apiGet("PLANTILLAS_V2");
          const rows = (resp && resp.plantillas_v2) ? resp.plantillas_v2 : [];

          const myRut = String(me.rut || "").trim().toUpperCase();
          plantillasCache = rows.filter(p=>{
            const vis = String(p.visibility||"").toUpperCase();
            const owner = String(p.ownerRut||"").trim().toUpperCase();
            return vis === "PUBLICA" || owner === myRut;
          }).map(p=>{
            return {
              templateId: p.templateId || p.id || uid(),
              nombrePlantilla: p.nombrePlantilla || p.nombre || "",
              nivel: p.nivel || "",
              objetivo: p.objetivo || "",
              dias: Number(p.dias || 0),
              visibility: p.visibility || "PRIVADA",
              ownerRut: p.ownerRut || "",
              ownerNombre: p.ownerNombre || "",
              template_json: p.template_json ?? p.template ?? null,
              creadoEn: p.creadoEn || "",
              actualizadoEn: p.actualizadoEn || ""
            };
          });

          renderPlantillas("");
        }catch(e){
          console.error(e);
          showMsg($("#msg"), "⚠️ No pude cargar plantillas (revisa API / permisos).", false);
        }
      }

      tplSearch?.addEventListener("input", ()=> renderPlantillas(tplSearch.value));

      $("#btnCargarPlantilla").onclick = ()=>{
        try{
          const id = tplSelect.value;
          const tpl = plantillasCache.find(p => String(p.templateId) === String(id));
          if(!tpl) throw new Error("Selecciona una plantilla válida.");

          const tplRoutine = normalizeTplJson(tpl.template_json);
          if(!tplRoutine) throw new Error("La plantilla no tiene template_json válido.");

          loadRoutineIntoBuilder({
            meta: tplRoutine.meta || {},
            dias: tplRoutine.dias || []
          });

          showMsg($("#msg"), "📋 Plantilla cargada. Ahora puedes editar y guardar al socio.", true);
        }catch(err){
          showMsg($("#msg"), err.message, false);
        }
      };

      $("#btnGuardarPlantilla").onclick = async ()=>{
        try{
          const r = collectRoutine();
          const nombre = prompt("Nombre de la plantilla:", `${r.meta.objetivo} ${r.dias.length} días · ${r.meta.nivel}`) || "";
          if(!nombre.trim()) throw new Error("Debes colocar un nombre de plantilla.");

          const vis = (prompt('Visibilidad: escribe "PUBLICA" o "PRIVADA"', "PRIVADA") || "PRIVADA").trim().toUpperCase();
          const visibility = (vis === "PUBLICA") ? "PUBLICA" : "PRIVADA";

          const templateRoutine = { meta: r.meta, dias: r.dias };

          await apiPost("PLANTILLAS_V2", {
            templateId: uid(),
            nombrePlantilla: nombre.trim(),
            nivel: r.meta.nivel,
            objetivo: r.meta.objetivo,
            dias: r.dias.length,
            visibility,
            ownerRut: String(me.rut||"").trim().toUpperCase(),
            ownerNombre: me.nombre || "",
            template_json: JSON.stringify(templateRoutine),
            creadoEn: nowISO(),
            actualizadoEn: nowISO()
          });

          showMsg($("#msg"), "✅ Plantilla guardada. Recargando lista…", true);
          await cargarPlantillasDesdeSheets();
        }catch(err){
          showMsg($("#msg"), err.message, false);
        }
      };

      await cargarPlantillasDesdeSheets();
    });
  </script>
</body>
</html>
