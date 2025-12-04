/* =========================================================
   BatFlow — Fully Cleaned JS (no dialogs, top-bar notify)
   ========================================================= */

"use strict";

/* ---------- Commands ---------- */
const COMMANDS = [
  { id:"echoOff", label:"@echo off", desc:"Disable echoing", icon:null, fields:[] },
  { id:"echo", label:"echo", desc:"Print text", icon:null, fields:[{k:"text",label:"Text"}] },
  { id:"rem", label:"rem", desc:"Comment", icon:null, fields:[{k:"text",label:"Comment"}] },
  { id:"setp", label:"set /p", desc:"Prompt user", icon:null, fields:[{k:"name",label:"Variable"},{k:"prompt",label:"Prompt"}] },
  { id:"set", label:"set VAR=", desc:"Set variable", icon:null, fields:[{k:"name",label:"Name"},{k:"value",label:"Value"}] },
  { id:"ifEq", label:"if /I", desc:"Comparison", icon:null, fields:[{k:"name",label:"Variable"},{k:"val",label:"Value"},{k:"cmd",label:"Then command"}] },
  { id:"choice", label:"choice", desc:"Prompt with options", icon:null, fields:[{k:"opts",label:"Options"},{k:"prompt",label:"Prompt"}] },
  { id:"pause", label:"pause", desc:"Pause script", icon:null, fields:[] },
  { id:"copy", label:"copy", desc:"Copy file", icon:null, fields:[{k:"src",label:"Source"},{k:"dst",label:"Destination"}] },
  { id:"move", label:"move", desc:"Move file", icon:null, fields:[{k:"src",label:"Source"},{k:"dst",label:"Destination"}] },
  { id:"del", label:"del", desc:"Delete file", icon:null, fields:[{k:"path",label:"Path"}] },
  { id:"mkdir", label:"mkdir", desc:"Make directory", icon:null, fields:[{k:"dir",label:"Directory"}] },
  { id:"rmdir", label:"rmdir /s /q", desc:"Remove directory", icon:null, fields:[{k:"dir",label:"Directory"}] },
  { id:"start", label:"start", desc:"Start program/URL", icon:null, fields:[{k:"target",label:"Target"}] },
  { id:"call", label:"call", desc:"Call another .bat", icon:null, fields:[{k:"file",label:"File"}] },
  { id:"exit", label:"exit /b", desc:"Exit script", icon:null, fields:[{k:"code",label:"Exit code"}] },
  { id:"title", label:"title", desc:"Set console title", icon:null, fields:[{k:"text",label:"Title"}] },
  { id:"cls", label:"cls", desc:"Clear screen", icon:null, fields:[] },
  { id:"ping", label:"ping", desc:"Ping address", icon:null, fields:[{k:"addr",label:"Address"},{k:"count",label:"Count"}] },
  { id:"powershell", label:"powershell", desc:"PowerShell command", icon:null, fields:[{k:"cmd",label:"Command"}] }
];

/* ---------- Presets ---------- */
const PRESETS = {
  helloWorld:{
    name:"hello-world",
    steps:[
      {type:"command",cmdId:"echoOff",params:{}},
      {type:"command",cmdId:"echo",params:{text:"Hello world!"}},
      {type:"command",cmdId:"pause",params:{}}
    ]
  },
  echoInput:{
    name:"echo-input",
    steps:[
      {type:"command",cmdId:"echoOff",params:{}},
      {type:"command",cmdId:"setp",params:{name:"TXT",prompt:"Enter text:"}},
      {type:"command",cmdId:"echo",params:{text:"%TXT%"}}
    ]
  },
  copyFile:{
    name:"copy-file",
    steps:[
      {type:"command",cmdId:"echoOff",params:{}},
      {type:"command",cmdId:"setp",params:{name:"SRC",prompt:"Source:"}},
      {type:"command",cmdId:"setp",params:{name:"DST",prompt:"Destination:"}},
      {type:"command",cmdId:"copy",params:{src:"%SRC%",dst:"%DST%"}}
    ]
  },
  askName:{
    name:"ask-name",
    steps:[
      {type:"command",cmdId:"echoOff",params:{}},
      {type:"command",cmdId:"setp",params:{name:"NAME",prompt:"Your name?"}},
      {type:"command",cmdId:"echo",params:{text:"Hello %NAME%!"}}
    ]
  }
};

/* ---------- State ---------- */
let steps = [];
let history = [];
const HISTORY_LIMIT = 60;
const STORAGE_KEY = "batflow_autosave_v1";

/* ---------- DOM ---------- */
const commandsEl = document.getElementById("commands");
const workflowEl = document.getElementById("workflow");
const previewEl = document.getElementById("preview");
const stepCountEl = document.getElementById("stepCount");
const projectNameEl = document.getElementById("projectName");
const autosaveToggle = document.getElementById("autosaveToggle");

/* ======================================================================
   NOTIFICATION BAR (STYLE B — TOP, FLAT, INFOBAR-LIKE)
   ====================================================================== */
function showNotification(type = "info", msg = "", timeout = 2600) {
  const existing = document.querySelector(".bf-notification");
  if (existing) existing.remove();

  const bar = document.createElement("div");
  bar.className = "bf-notification";

  let bg = "#f3f4f6", bd = "1px solid #e2e3e4", fg = "#111";
  if (type === "success"){ bg="#ecf9ec"; bd="1px solid #c6e6c6"; fg="#0f601f"; }
  if (type === "error"){ bg="#fff2f2"; bd="1px solid #f4cccc"; fg="#900"; }
  if (type === "warn"){ bg="#fff9e6"; bd="1px solid #f1e3b3"; fg="#7a5b00"; }

  Object.assign(bar.style,{
    position:"fixed", top:"12px", left:"12px", right:"12px",
    padding:"10px 14px",
    background:bg, border:bd, color:fg,
    borderRadius:"6px",
    boxShadow:"0 8px 16px rgba(0,0,0,0.08)",
    fontSize:"13px",
    display:"flex", alignItems:"center", gap:"10px",
    zIndex:10000,
    opacity:"0", transform:"translateY(-6px)",
    transition:"opacity .18s, transform .18s"
  });

  const icon = document.createElement("div");
  icon.textContent = (type==="success")?"✓":(type==="error")?"✖":(type==="warn")?"!":"i";
  icon.style.fontWeight="700";
  bar.appendChild(icon);

  const text = document.createElement("div");
  text.textContent = msg;
  bar.appendChild(text);

  const close = document.createElement("button");
  close.textContent = "Close";
  close.className = "btn";
  close.onclick = () => {
    bar.style.opacity="0";
    bar.style.transform="translateY(-6px)";
    setTimeout(()=>bar.remove(),180);
  };
  bar.appendChild(close);

  document.body.appendChild(bar);
  requestAnimationFrame(()=> {
    bar.style.opacity="1";
    bar.style.transform="translateY(0)";
  });

  if (timeout > 0) {
    setTimeout(() => {
      if (bar.parentElement) {
        bar.style.opacity="0";
        bar.style.transform="translateY(-6px)";
        setTimeout(()=>bar.remove(),180);
      }
    }, timeout);
  }
}

/* ======================================================================
   HELPERS
   ====================================================================== */

/* History */
function pushHistory(){
  history.push(JSON.stringify(steps));
  if (history.length > HISTORY_LIMIT) history.shift();
}
function undo(){
  if (history.length < 2){
    showNotification("info","Nothing to undo.");
    return;
  }
  history.pop();
  const prev = history.pop();
  steps = JSON.parse(prev);
  pushHistory();
  render();
  showNotification("info","Undid last action.");
}

/* File download helper */
function downloadFile(name, text){
  const blob = new Blob([text],{type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ======================================================================
   COMMANDS LIST
   ====================================================================== */
function buildCommands(){
  commandsEl.innerHTML = "";

  COMMANDS.forEach(c=>{
    const tile = document.createElement("div");
    tile.className = "cmd-tile";
    tile.onclick = () => addStep(c.id);

    const icon = document.createElement("div");
    icon.className = "icon-placeholder";
    icon.textContent = c.icon ? "" : c.label.slice(0,2);

    const meta = document.createElement("div");
    meta.style.flex="1";
    meta.innerHTML = `
      <div style="font-weight:700">${c.label}</div>
      <div style="font-size:12px;color:rgba(0,0,0,0.58);margin-top:4px">${c.desc}</div>
    `;

    tile.appendChild(icon);
    tile.appendChild(meta);
    commandsEl.appendChild(tile);
  });
}

/* ======================================================================
   STEPS
   ====================================================================== */
function ensureEchoOff(){
  if (steps.length === 0 || steps[0].cmdId !== "echoOff") {
    steps.unshift({type:"command",cmdId:"echoOff",params:{}});
  }
}

function addStep(cmdId){
  const c = COMMANDS.find(x=>x.id===cmdId);
  const params = {};
  c.fields.forEach(f=> params[f.k] = "" );
  steps.push({type:"command",cmdId,params});
  pushHistory();
  render();
  showNotification("info",`${c.label} added.`);
}

function removeStepImmediate(i){
  const removed = steps.splice(i,1)[0];
  pushHistory();
  render();
  showNotification("info",`Removed: ${removed.cmdId}`);
}

/* Drag reorder helpers */
function reorder(from,to){
  if (from === to) return;
  if (to < 0) to = 0;
  if (to >= steps.length) to = steps.length - 1;
  const item = steps.splice(from,1)[0];
  steps.splice(to,0,item);
  pushHistory();
  render();
}
function moveStep(i,to){ reorder(i,to); }

/* ======================================================================
   RENDER
   ====================================================================== */
function renderLine(s){
  const p = s.params || {};
  switch(s.cmdId){
    case "echoOff": return "@echo off";
    case "echo": return `echo ${p.text||""}`;
    case "rem": return `rem ${p.text||""}`;
    case "setp": return `set /p ${p.name||"VAR"}=${p.prompt||""}`;
    case "set": return `set ${p.name||"VAR"}=${p.value||""}`;
    case "ifEq": return `if /I "%${p.name}%"=="${p.val}" ${p.cmd||""}`;
    case "choice": return `choice /C ${p.opts||"YN"} /M "${p.prompt||""}"`;
    case "pause": return "pause";
    case "copy": return `copy "${p.src||""}" "${p.dst||""}"`;
    case "move": return `move "${p.src||""}" "${p.dst||""}"`;
    case "del": return `del /f /q "${p.path||""}"`;
    case "mkdir": return `mkdir "${p.dir||""}"`;
    case "rmdir": return `rmdir /s /q "${p.dir||""}"`;
    case "start": return `start "" "${p.target||""}"`;
    case "call": return `call "${p.file||""}"`;
    case "exit": return `exit /b ${p.code||0}`;
    case "title": return `title ${p.text||""}`;
    case "cls": return "cls";
    case "ping": return `ping ${p.addr||"127.0.0.1"} -n ${p.count||4}`;
    case "powershell": return `powershell -command "${p.cmd||""}"`;
    default: return "";
  }
}

function updatePreview(){
  previewEl.textContent = steps.map(renderLine).join("\r\n") + "\r\n";
}

function render(){
  ensureEchoOff();
  workflowEl.innerHTML = "";
  stepCountEl.textContent = steps.length;

  steps.forEach((s,i)=>{
    const row = document.createElement("div");
    row.className = "step-row";
    row.dataset.index = i;
    row.draggable = true;

    /* Drag events */
    row.addEventListener("dragstart", e=>{
      e.dataTransfer.setData("text/plain", i);
      row.style.opacity = "0.5";
    });
    row.addEventListener("dragend", ()=> row.style.opacity="1");
    row.addEventListener("dragover", e=> e.preventDefault());
    row.addEventListener("drop", e=>{
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = Number(row.dataset.index);
      reorder(from,to);
    });

    /* Handle */
    const handle = document.createElement("div");
    handle.className="handle";
    handle.textContent="≡";
    row.appendChild(handle);

    /* Icon */
    const cmd = COMMANDS.find(c=>c.id===s.cmdId);
    const icon = document.createElement("div");
    icon.className = "icon-placeholder";
    icon.textContent = cmd.icon ? "" : cmd.label.slice(0,2);
    row.appendChild(icon);

    /* Meta */
    const meta = document.createElement("div");
    meta.className = "step-meta";
    meta.style.flex="1";

    meta.innerHTML = `<div style="font-weight:700">${cmd.label}</div>`;

    const fw = document.createElement("div");
    fw.style.marginTop="6px";
    fw.style.display="flex";
    fw.style.gap="8px";
    fw.style.flexWrap="wrap";

    if (cmd.fields.length > 0){
      cmd.fields.forEach(f=>{
        const inp = document.createElement("input");
        inp.placeholder = f.label;
        inp.value = s.params[f.k] ?? "";
        inp.oninput = (e)=>{ s.params[f.k]=e.target.value; updatePreview(); };
        inp.style.padding="6px";
        inp.style.border="1px solid rgba(0,0,0,0.12)";
        inp.style.borderRadius="6px";
        fw.appendChild(inp);
      });
    } else {
      const note=document.createElement("div");
      note.style.fontSize="12px";
      note.style.color="rgba(0,0,0,0.6)";
      note.textContent = cmd.desc;
      fw.appendChild(note);
    }

    meta.appendChild(fw);

    const linePreview = document.createElement("div");
    linePreview.className="small";
    linePreview.style.marginTop="8px";
    linePreview.style.color="rgba(0,0,0,0.65)";
    linePreview.textContent = renderLine(s);
    meta.appendChild(linePreview);
    row.appendChild(meta);

    /* Actions */
    const actions = document.createElement("div");
    actions.style.display="flex";
    actions.style.flexDirection="column";
    actions.style.gap="6px";
    actions.style.alignItems="flex-end";

    const up=document.createElement("button");
    up.className="btn";
    up.textContent="↑";
    up.onclick=()=>moveStep(i,i-1);

    const down=document.createElement("button");
    down.className="btn";
    down.textContent="↓";
    down.onclick=()=>moveStep(i,i+1);

    const del=document.createElement("button");
    del.className="btn";
    del.textContent="✖";
    del.onclick=()=>removeStepImmediate(i);

    actions.append(up,down,del);
    row.appendChild(actions);

    workflowEl.appendChild(row);
  });

  updatePreview();
  if (autosaveToggle.checked) saveToStorage();
}

/* ======================================================================
   SAVE / LOAD / EXPORT
   ====================================================================== */
function exportBAT(){
  updatePreview();
  const name = (projectNameEl.value || "script") + ".bat";
  downloadFile(name, previewEl.textContent);
  showNotification("success",`Exported ${name}`);
}
function saveJSON(){
  const name = (projectNameEl.value || "project") + ".json";
  const payload = {
    name: projectNameEl.value || "",
    createdAt: new Date().toISOString(),
    steps
  };
  downloadFile(name, JSON.stringify(payload,null,2));
  showNotification("success",`Saved ${name}`);
}

function loadJSON(file){
  const reader = new FileReader();
  reader.onload = e=>{
    try {
      const obj = JSON.parse(e.target.result);
      steps = obj.steps || [];
      projectNameEl.value = obj.name || "";
      pushHistory();
      render();
      showNotification("success","Project loaded");
    } catch(err){
      showNotification("error","Failed to load JSON");
    }
  };
  reader.readAsText(file);
}

/* ======================================================================
   AUTOSAVE STORAGE
   ====================================================================== */
function saveToStorage(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: projectNameEl.value || "",
      steps,
      savedAt: new Date().toISOString()
    }));
  }catch(e){}
}
function loadFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    projectNameEl.value = obj.name || "";
    steps = obj.steps || [];
    pushHistory();
    render();
    showNotification("info","Autosave restored");
    return true;
  }catch(e){
    return false;
  }
}

/* ======================================================================
   WIRING — must be called after DOM loads
   ====================================================================== */
function wireEvents(){

  document.getElementById("saveJsonBtn").onclick = saveJSON;
  document.getElementById("exportBatBtn").onclick = exportBAT;

  document.getElementById("copyPreviewBtn").onclick = async ()=>{
    try{
      await navigator.clipboard.writeText(previewEl.textContent);
      showNotification("success","Copied to clipboard");
    }catch{
      showNotification("error","Clipboard failed");
    }
  };

  document.getElementById("exportPreviewBtn").onclick = exportBAT;

  document.getElementById("loadJsonInput").onchange = e=>{
    const f = e.target.files[0];
    if (f) loadJSON(f);
    e.target.value = "";
  };

  document.getElementById("undoBtn").onclick = undo;

  document.getElementById("clearBtn").onclick = ()=>{
    steps = [];
    steps = [{type:"command",cmdId:"echoOff",params:{}}];
    pushHistory();
    render();
    showNotification("info","Workflow cleared");
  };

  document.getElementById("loadPresetBtn").onclick = ()=>{
    const key = document.getElementById("presetSelect").value;
    if (!key){
      showNotification("info","Pick a preset first");
      return;
    }
    if (PRESETS[key]){
      steps = JSON.parse(JSON.stringify(PRESETS[key].steps));
      projectNameEl.value = PRESETS[key].name;
      pushHistory();
      render();
      showNotification("success",`Preset "${PRESETS[key].name}" loaded`);
    }
  };

  autosaveToggle.onchange = ()=>{
    if (autosaveToggle.checked){
      saveToStorage();
      showNotification("info","Autosave enabled");
    } else {
      showNotification("info","Autosave disabled");
    }
  };
}
/* =========================================================
   MOBILE DRAG SUPPORT (iOS + Android)
   ========================================================= */

function enableMobileDrag() {
  let draggingEl = null;
  let startY = 0;
  let startIndex = 0;

  workflowEl.querySelectorAll(".step-row").forEach(row => {
    
    // Disable browser scrolling during drag
    row.addEventListener("touchstart", e => {
      if (!e.target.closest(".handle")) return; // only start drag on handle
      draggingEl = row;
      startY = e.touches[0].clientY;
      startIndex = Number(row.dataset.index);
      row.style.opacity = "0.4";
      e.preventDefault();
    }, { passive: false });

    row.addEventListener("touchmove", e => {
      if (!draggingEl) return;

      const currentY = e.touches[0].clientY;
      const delta = currentY - startY;

      // calculate which index we are over
      const rows = [...workflowEl.querySelectorAll(".step-row")];
      rows.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (currentY > mid) {
          item.style.borderTop = "";
          item.style.borderBottom = "3px solid #3c7fb1";
        } else {
          item.style.borderBottom = "";
          item.style.borderTop = "3px solid #3c7fb1";
        }
      });

      e.preventDefault();
    }, { passive: false });

    row.addEventListener("touchend", e => {
      if (!draggingEl) return;

      draggingEl.style.opacity = "1";

      const touchY = e.changedTouches[0].clientY;

      const rows = [...workflowEl.querySelectorAll(".step-row")];
      let targetIndex = startIndex;

      rows.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        item.style.borderTop = "";
        item.style.borderBottom = "";
        if (touchY > mid) targetIndex = i;
      });

      reorder(startIndex, targetIndex);

      draggingEl = null;
      e.preventDefault();
    });
  });
}

/* Call after each render() */
const oldRender = render;
render = function() {
  oldRender();
  enableMobileDrag();
};

/* ======================================================================
   INIT
   ====================================================================== */
function init(){
  buildCommands();
  steps = [{type:"command",cmdId:"echoOff",params:{}}];
  pushHistory();
  render();

  // Autosave exists?
  const maybe = localStorage.getItem(STORAGE_KEY);
  if (maybe){
    showNotification("info","Autosave found. Toggle Autosave to restore.");
  }

  wireEvents();
}

init();
