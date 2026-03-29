// ─── HK Remote Server ─────────────────────────────────────────────────────────
// Hostowany na Railway — działa jako publiczny serwer dla pokojówek
// Electron (recepcja) pushuje stan przez POST /api/update
// Pokojówki wchodzą przez GET /hk/:worker na telefonie
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const app = express();
app.use(express.json({ limit: "1mb" }));

const SECRET = process.env.HK_SECRET || "conrad2026";
const PORT   = process.env.PORT || 3000;

// Stan w pamięci
let _state = { date: null, assignments: {}, rooms: {} };

// ─── API dla Electron (recepcja) ─────────────────────────────────────────────

// Electron pushuje pełny stan
app.post("/api/update", (req, res) => {
  if (req.headers["x-secret"] !== SECRET) return res.status(403).json({ ok: false, error: "Unauthorized" });
  _state = req.body;
  res.json({ ok: true });
});

// Electron oznacza pokój jako pusty
app.post("/api/vacate", (req, res) => {
  if (req.headers["x-secret"] !== SECRET) return res.status(403).json({ ok: false, error: "Unauthorized" });
  const { room } = req.body;
  if (!_state.rooms[room]) _state.rooms[room] = { status: "W", vacated: false };
  _state.rooms[room].vacated = true;
  res.json({ ok: true });
});

// ─── API dla telefonów pracowników ───────────────────────────────────────────

app.get("/api/state", (req, res) => {
  res.json(_state);
});

app.get("/ping", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ─── Akcje pokojówek (start/done) ────────────────────────────────────────────

app.post("/hk/:worker/action", (req, res) => {
  const w   = decodeURIComponent(req.params.worker);
  const { action, room, extra } = req.body || {};
  if (!_state.rooms[room]) _state.rooms[room] = { worker: w, status: "W", vacated: false };
  const now = new Date().toISOString();
  if (action === "start") {
    _state.rooms[room].status    = "czyszczenie";
    _state.rooms[room].startedAt = now;
  } else if (action === "done") {
    _state.rooms[room].status = "czyste";
    _state.rooms[room].doneAt = now;
    if (extra && typeof extra === "object") _state.rooms[room].report = extra;
  }
  res.json({ ok: true });
});

// ─── Strona mobilna dla pokojówki ────────────────────────────────────────────

app.get("/hk/:worker", (req, res) => {
  const w = decodeURIComponent(req.params.worker);
  res.send(mobilePage(w));
});

// Strona główna — info
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HK Server</title></head>
<body style="font-family:sans-serif;background:#0d1117;color:#34d399;padding:40px;text-align:center">
<div style="font-size:64px">&#10003;</div><h2>HK Server działa</h2>
<p style="color:#8b949e">${new Date().toLocaleString("pl-PL")}</p>
</body></html>`);
});

// ─── Strona HTML dla telefonu ─────────────────────────────────────────────────

function mobilePage(workerName) {
  var wJson = JSON.stringify(workerName);
  return '<!DOCTYPE html>\n'
  + '<html lang="pl"><head>\n'
  + '<meta charset="UTF-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">\n'
  + '<meta name="mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<title>HK \u2022 ' + workerName + '</title>\n'
  + '<style>\n'
  + '*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}\n'
  + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1117;color:#e6edf3;min-height:100vh;overscroll-behavior:none}\n'
  + '.hdr{background:#161b22;padding:12px 16px;display:flex;align-items:center;gap:10px;border-bottom:2px solid #30363d;position:sticky;top:0;z-index:10}\n'
  + '.dot{width:9px;height:9px;border-radius:50%;background:#34d399;flex-shrink:0}\n'
  + '.dot.off{background:#f87171}\n'
  + '.hdr-name{font-size:17px;font-weight:800}\n'
  + '.hdr-sub{font-size:11px;color:#8b949e;margin-top:1px}\n'
  + '.rooms{padding:12px;display:flex;flex-direction:column;gap:10px}\n'
  + '.card{background:#161b22;border:2px solid #30363d;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:background .15s}\n'
  + '.card:active{background:#1a2030}\n'
  + '.card.vacated{border-color:#f59e0b;background:#1a1600}\n'
  + '.card.cleaning{border-color:#3b82f6;background:#0d1626}\n'
  + '.card.done{border-color:#34d399;background:#0d1a14}\n'
  + '.rno{font-size:42px;font-weight:900;letter-spacing:-2px;line-height:1;min-width:76px}\n'
  + '.rno.vacated{color:#f59e0b}.rno.cleaning{color:#3b82f6}.rno.done{color:#34d399}.rno.waiting{color:#3a3f48}\n'
  + '.card-info{flex:1}\n'
  + '.card-type{font-size:13px;font-weight:800;color:#8b949e;letter-spacing:.5px}\n'
  + '.card-status{font-size:12px;margin-top:3px;font-weight:600}\n'
  + '.card-status.s-wait{color:#484f58}\n'
  + '.card-status.s-open{color:#f59e0b}\n'
  + '.card-status.s-clean{color:#3b82f6}\n'
  + '.card-status.s-done{color:#34d399}\n'
  + '.card-arr{font-size:22px;color:#30363d;margin-left:auto}\n'
  + '.card-arr.vacated{color:#f59e0b}\n'
  + '.room-screen{display:none;flex-direction:column;min-height:100vh}\n'
  + '.room-screen.active{display:flex}\n'
  + '.rshdr{background:#161b22;padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:2px solid #30363d}\n'
  + '.rshdr-back{background:none;border:1px solid #30363d;color:#60a5fa;padding:7px 14px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}\n'
  + '.rshdr-title{font-size:20px;font-weight:900;flex:1;text-align:center}\n'
  + '.rshdr-type{font-size:13px;color:#8b949e;text-align:center;margin-top:2px}\n'
  + '.rs-body{padding:16px;flex:1;display:flex;flex-direction:column;gap:14px}\n'
  + '.rs-status{padding:12px 16px;border-radius:12px;font-size:14px;font-weight:700;text-align:center}\n'
  + '.rs-status.vacated{background:rgba(245,158,11,.12);color:#f59e0b;border:1.5px solid rgba(245,158,11,.4)}\n'
  + '.rs-status.cleaning{background:rgba(59,130,246,.12);color:#3b82f6;border:1.5px solid rgba(59,130,246,.4)}\n'
  + '.rs-status.waiting{background:rgba(72,79,88,.1);color:#8b949e;border:1.5px solid #30363d}\n'
  + '.rs-status.done{background:rgba(52,211,153,.12);color:#34d399;border:1.5px solid rgba(52,211,153,.4)}\n'
  + '.report-table{background:#161b22;border-radius:12px;overflow:hidden;border:1.5px solid #30363d}\n'
  + '.report-title{padding:10px 14px;font-size:13px;font-weight:800;color:#8b949e;border-bottom:1px solid #21262d;letter-spacing:.5px}\n'
  + '.report-row{display:flex;align-items:center;padding:11px 14px;border-bottom:1px solid #21262d;gap:10px}\n'
  + '.report-row:last-child{border-bottom:none}\n'
  + '.report-label{flex:1;font-size:14px;font-weight:600;color:#e6edf3}\n'
  + '.report-input{width:64px;padding:7px 10px;border-radius:8px;border:1.5px solid #30363d;background:#0d1117;color:#e6edf3;font-size:16px;font-weight:800;text-align:center;outline:none}\n'
  + '.report-input:focus{border-color:#3b82f6}\n'
  + '.report-notes{width:100%;padding:10px 12px;border-radius:10px;border:1.5px solid #30363d;background:#0d1117;color:#e6edf3;font-size:14px;resize:none;outline:none;font-family:inherit;margin-top:4px}\n'
  + '.report-notes:focus{border-color:#3b82f6}\n'
  + '.btn{display:block;width:100%;padding:17px;border-radius:12px;border:none;font-size:17px;font-weight:800;cursor:pointer;margin-top:4px}\n'
  + '.btn:active{opacity:.7}\n'
  + '.btn-start{background:#1d4ed8;color:#fff}\n'
  + '.btn-done{background:#059669;color:#fff}\n'
  + '.btn-disabled{background:#1e2430;color:#484f58;cursor:not-allowed}\n'
  + '.toast{position:fixed;bottom:24px;left:16px;right:16px;background:#1a1a2e;border:2px solid #f59e0b;color:#f59e0b;border-radius:14px;padding:14px 18px;font-size:15px;font-weight:700;z-index:100;text-align:center}\n'
  + '.sync{position:fixed;top:10px;right:12px;font-size:10px;color:#484f58;z-index:20}\n'
  + '.empty{text-align:center;padding:60px 24px;color:#484f58}\n'
  + '.empty-ic{font-size:52px;margin-bottom:12px}\n'
  + '</style></head>\n'
  + '<body>\n'
  + '<div id="listView">\n'
  + '<div class="hdr"><div class="dot" id="dot"></div><div><div class="hdr-name">' + workerName + '</div><div class="hdr-sub" id="dateLabel"></div></div></div>\n'
  + '<div id="sync" class="sync"></div>\n'
  + '<div class="rooms" id="rooms"><div class="empty"><div class="empty-ic">&#8987;</div><p>Pobieranie danych...</p></div></div>\n'
  + '</div>\n'
  + '<div id="roomView" class="room-screen">\n'
  + '<div class="rshdr">\n'
  + '  <button class="rshdr-back" onclick="goBack()">&#8592; Pow\u00f3t</button>\n'
  + '  <div style="flex:1;text-align:center"><div class="rshdr-title" id="rv-no">\u2014</div><div class="rshdr-type" id="rv-type">\u2014</div></div>\n'
  + '</div>\n'
  + '<div class="rs-body">\n'
  + '  <div id="rv-status" class="rs-status waiting">Czeka na wyjazd go\u015bcia</div>\n'
  + '  <div id="rv-report" class="report-table">\n'
  + '    <div class="report-title">RAPORT POKOJU</div>\n'
  + '    <div class="report-row"><span class="report-label">Po\u015bciel zmieniona</span><input class="report-input" id="r-posciel" type="number" min="0" value="0"></div>\n'
  + '    <div class="report-row"><span class="report-label">R\u0119czniki wymienione</span><input class="report-input" id="r-reczniki" type="number" min="0" value="0"></div>\n'
  + '    <div class="report-row"><span class="report-label">Dywaniki</span><input class="report-input" id="r-dywaniki" type="number" min="0" value="0"></div>\n'
  + '    <div class="report-row"><span class="report-label">Kosmetyki uzupe\u0142nione</span><input class="report-input" id="r-kosmetyki" type="number" min="0" value="0"></div>\n'
  + '    <div class="report-row"><span class="report-label">Sprz\u0105tanie \u0142azienki</span><select class="report-input" id="r-lazienka" style="width:80px"><option value="tak">Tak</option><option value="cz">Cz\u0119\u015b.</option><option value="nie">Nie</option></select></div>\n'
  + '    <div class="report-row" style="flex-direction:column;align-items:flex-start"><span class="report-label" style="margin-bottom:6px">Uwagi / usterki</span><textarea class="report-notes" id="r-uwagi" rows="2" placeholder="Wpisz uwagi..."></textarea></div>\n'
  + '  </div>\n'
  + '  <div id="rv-done-info" style="display:none;padding:12px 14px;background:rgba(52,211,153,.08);border:1.5px solid rgba(52,211,153,.3);border-radius:12px;font-size:13px;line-height:1.7"></div>\n'
  + '  <button id="rv-btn-start" class="btn btn-start" onclick="startCleaning()">Zaczynam sprz\u0105ta\u0107</button>\n'
  + '  <button id="rv-btn-done"  class="btn btn-done"  onclick="submitDone()" style="display:none">\u2713 Gotowe!</button>\n'
  + '</div></div>\n'
  + '<script>\n'
  + 'var W=' + wJson + ';\n'
  + 'var _allRooms=[];\n'
  + 'var _currentRoom=null;\n'
  + 'var lastVacated={};\n'
  + 'var toastT=null;\n'
  + 'function fmtTime(iso){if(!iso)return"";return new Date(iso).toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"});}\n'
  + 'function fmtDur(s,e){if(!s||!e)return"";var ms=new Date(e)-new Date(s);return Math.floor(ms/60000)+"min "+Math.floor((ms%60000)/1000)+"s";}\n'
  + 'function render(rooms){\n'
  + '  _allRooms=rooms;\n'
  + '  var c=document.getElementById("rooms");\n'
  + '  if(!rooms||!rooms.length){c.innerHTML=\'<div class="empty"><div class="empty-ic">&#10003;</div><p>Brak pok\u00f3i</p></div>\';return;}\n'
  + '  var html="";\n'
  + '  for(var i=0;i<rooms.length;i++){\n'
  + '    var r=rooms[i];\n'
  + '    var done=r.status==="czyste";\n'
  + '    var cleaning=r.status==="czyszczenie";\n'
  + '    var vacated=r.vacated&&r.status==="W";\n'
  + '    var cls="card"+(done?" done":cleaning?" cleaning":vacated?" vacated":"");\n'
  + '    var rnoCls="rno"+(done?" done":cleaning?" cleaning":vacated?" vacated":" waiting");\n'
  + '    var arr=vacated?"&#9654;":done?"&#10003;":"&#8250;";\n'
  + '    var arrCls=vacated?" vacated":"";\n'
  + '    html+="<div class=\\""+cls+"\\" onclick=\\"openRoom(\'"+r.no+"\')\\">";\n'
  + '    html+="<div class=\\""+rnoCls+"\\">"+r.no+"</div>";\n'
  + '    html+="<div class=\\"card-info\\"><div class=\\"card-type\\">"+(r.type||"")+"</div></div>";\n'
  + '    html+="<div class=\\"card-arr"+arrCls+"\\">"+arr+"</div>";\n'
  + '    html+="</div>";\n'
  + '  }\n'
  + '  c.innerHTML=html;\n'
  + '}\n'
  + 'function openRoom(no){\n'
  + '  var r=null;\n'
  + '  for(var i=0;i<_allRooms.length;i++){if(_allRooms[i].no===no){r=_allRooms[i];break;}}\n'
  + '  if(!r)return;\n'
  + '  _currentRoom=r;\n'
  + '  document.getElementById("listView").style.display="none";\n'
  + '  document.getElementById("roomView").classList.add("active");\n'
  + '  document.getElementById("rv-no").textContent="Pok\u00f3j "+r.no;\n'
  + '  document.getElementById("rv-type").textContent=r.type||"";\n'
  + '  var statusEl=document.getElementById("rv-status");\n'
  + '  statusEl.className="rs-status";\n'
  + '  if(r.status==="czyste"){statusEl.className+=" done";statusEl.textContent="\u2713 Pok\u00f3j wysprz\u0105tany \u2014 "+fmtDur(r.startedAt,r.doneAt);}\n'
  + '  else if(r.status==="czyszczenie"){statusEl.className+=" cleaning";statusEl.textContent="\ud83e\uddf9 Sprz\u0105tanie od "+fmtTime(r.startedAt);}\n'
  + '  else if(r.vacated){statusEl.className+=" vacated";statusEl.textContent="\ud83d\udd14 Go\u015b\u0107 wyjecha\u0142 \u2014 mo\u017cesz wchodzi\u0107!";}\n'
  + '  else{statusEl.className+=" waiting";statusEl.textContent="Czeka na wyjazd go\u015bcia";}\n'
  + '  var rpt=r.report||{};\n'
  + '  document.getElementById("r-posciel").value=rpt.posciel||0;\n'
  + '  document.getElementById("r-reczniki").value=rpt.reczniki||0;\n'
  + '  document.getElementById("r-dywaniki").value=rpt.dywaniki||0;\n'
  + '  document.getElementById("r-kosmetyki").value=rpt.kosmetyki||0;\n'
  + '  document.getElementById("r-lazienka").value=rpt.lazienka||"tak";\n'
  + '  document.getElementById("r-uwagi").value=rpt.uwagi||"";\n'
  + '  var btnS=document.getElementById("rv-btn-start");\n'
  + '  var btnD=document.getElementById("rv-btn-done");\n'
  + '  var doneInfo=document.getElementById("rv-done-info");\n'
  + '  doneInfo.style.display="none";\n'
  + '  if(r.status==="czyste"){\n'
  + '    btnS.style.display="none";btnD.style.display="none";\n'
  + '    var rptD=r.report||{};\n'
  + '    doneInfo.style.display="block";\n'
  + '    doneInfo.innerHTML="\u2713 Raport zapisany<br>Po\u015bciel: "+(rptD.posciel||0)+"&nbsp;&nbsp;R\u0119czniki: "+(rptD.reczniki||0)+"&nbsp;&nbsp;Kosmetyki: "+(rptD.kosmetyki||0)+(rptD.uwagi?"<br>Uwagi: "+rptD.uwagi:"");\n'
  + '  } else if(r.status==="czyszczenie"){\n'
  + '    btnS.style.display="none";btnD.style.display="block";\n'
  + '  } else if(r.vacated){\n'
  + '    btnS.style.display="block";btnD.style.display="none";\n'
  + '    btnS.className="btn btn-start";btnS.removeAttribute("disabled");\n'
  + '  } else {\n'
  + '    btnS.style.display="block";btnS.className="btn btn-disabled";btnS.setAttribute("disabled","");\n'
  + '    btnD.style.display="none";\n'
  + '  }\n'
  + '}\n'
  + 'function goBack(){\n'
  + '  _currentRoom=null;\n'
  + '  document.getElementById("listView").style.display="";\n'
  + '  document.getElementById("roomView").classList.remove("active");\n'
  + '}\n'
  + 'function getReport(){\n'
  + '  return{posciel:parseInt(document.getElementById("r-posciel").value)||0,reczniki:parseInt(document.getElementById("r-reczniki").value)||0,dywaniki:parseInt(document.getElementById("r-dywaniki").value)||0,kosmetyki:parseInt(document.getElementById("r-kosmetyki").value)||0,lazienka:document.getElementById("r-lazienka").value,uwagi:document.getElementById("r-uwagi").value.trim()};\n'
  + '}\n'
  + 'function startCleaning(){if(!_currentRoom)return;act("start",_currentRoom.no,null);}\n'
  + 'function submitDone(){if(!_currentRoom)return;act("done",_currentRoom.no,getReport());goBack();}\n'
  + 'function showToast(msg){clearTimeout(toastT);var old=document.querySelector(".toast");if(old)old.remove();var t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);toastT=setTimeout(function(){t.remove();},5000);}\n'
  + 'function act(action,room,extra){\n'
  + '  var body={action:action,room:room};\n'
  + '  if(extra!==null&&extra!==undefined)body.extra=extra;\n'
  + '  fetch("/hk/"+encodeURIComponent(W)+"/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json();}).then(function(){\n'
  + '    poll();\n'
  + '    if(_currentRoom&&_currentRoom.no===room){setTimeout(function(){for(var i=0;i<_allRooms.length;i++){if(_allRooms[i].no===room){openRoom(room);break;}}},400);}\n'
  + '  }).catch(function(){});\n'
  + '}\n'
  + 'function poll(){\n'
  + '  var dot=document.getElementById("dot");\n'
  + '  fetch("/api/state").then(function(r){return r.json();}).then(function(s){\n'
  + '    dot.className="dot";\n'
  + '    document.getElementById("sync").textContent=new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit",second:"2-digit"});\n'
  + '    var myRooms=(s.assignments[W]||[]).map(function(no){return Object.assign({no:no},s.rooms[no]||{status:"W",vacated:false});});\n'
  + '    myRooms.forEach(function(r){if(r.vacated&&r.status==="W"&&!lastVacated[r.no]){showToast("Pok\u00f3j "+r.no+" jest pusty!");lastVacated[r.no]=true;}});\n'
  + '    render(myRooms);\n'
  + '  }).catch(function(){dot.className="dot off";});\n'
  + '}\n'
  + 'document.getElementById("dateLabel").textContent=new Date().toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long"});\n'
  + 'poll();\n'
  + 'setInterval(poll,3000);\n'
  + '</script>\n'
  + '</body></html>';
}

app.listen(PORT, () => console.log(`[HK Server] Port ${PORT}`));
