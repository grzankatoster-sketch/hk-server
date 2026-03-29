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
  const { action, room } = req.body || {};
  if (!_state.rooms[room]) _state.rooms[room] = { worker: w, status: "W", vacated: false };
  const now = new Date().toISOString();
  if (action === "start") {
    _state.rooms[room].status    = "czyszczenie";
    _state.rooms[room].startedAt = now;
  } else if (action === "done") {
    _state.rooms[room].status = "czyste";
    _state.rooms[room].doneAt = now;
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
  + '<html lang="pl">\n'
  + '<head>\n'
  + '<meta charset="UTF-8">\n'
  + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">\n'
  + '<meta name="mobile-web-app-capable" content="yes">\n'
  + '<meta name="apple-mobile-web-app-capable" content="yes">\n'
  + '<title>HK \u2022 ' + workerName + '</title>\n'
  + '<style>\n'
  + '*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}\n'
  + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d1117;color:#e6edf3;min-height:100vh;overscroll-behavior:none}\n'
  + '.hdr{background:#161b22;padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:2px solid #30363d;position:sticky;top:0;z-index:10}\n'
  + '.dot{width:10px;height:10px;border-radius:50%;background:#34d399;flex-shrink:0}\n'
  + '.dot.off{background:#f87171}\n'
  + '.hdr-name{font-size:18px;font-weight:800;line-height:1}\n'
  + '.hdr-sub{font-size:12px;color:#8b949e;margin-top:2px}\n'
  + '.rooms{padding:14px;display:flex;flex-direction:column;gap:12px}\n'
  + '.card{background:#161b22;border:2px solid #30363d;border-radius:16px;padding:16px}\n'
  + '.card.vacated{border-color:#f59e0b;background:#1a1600}\n'
  + '.card.cleaning{border-color:#3b82f6;background:#0d1626}\n'
  + '.card.done{border-color:#34d399;background:#0d1a14}\n'
  + '.card-top{display:flex;align-items:center;gap:12px;margin-bottom:8px}\n'
  + '.rno{font-size:38px;font-weight:900;letter-spacing:-1px;line-height:1;min-width:72px}\n'
  + '.rno.vacated{color:#f59e0b}.rno.cleaning{color:#3b82f6}.rno.done{color:#34d399}.rno.waiting{color:#484f58}\n'
  + '.badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;text-transform:uppercase}\n'
  + '.badge-wait{background:rgba(72,79,88,.2);color:#8b949e;border:1px solid #30363d}\n'
  + '.badge-open{background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.4)}\n'
  + '.badge-clean{background:rgba(59,130,246,.15);color:#3b82f6;border:1px solid rgba(59,130,246,.4)}\n'
  + '.badge-done{background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.4)}\n'
  + '.notif{background:rgba(245,158,11,.1);border:1.5px solid rgba(245,158,11,.4);border-radius:10px;padding:10px 14px;color:#f59e0b;font-size:14px;font-weight:700;margin-bottom:8px}\n'
  + '.dur{font-size:13px;font-weight:700;color:#34d399;margin-top:4px}\n'
  + '.tinfo{font-size:11px;color:#635e57;margin-top:4px}\n'
  + '.btn{display:block;width:100%;margin-top:12px;padding:16px;border-radius:12px;border:none;font-size:17px;font-weight:800;cursor:pointer}\n'
  + '.btn:active{opacity:.7}\n'
  + '.btn-start{background:#1d4ed8;color:#fff}\n'
  + '.btn-done{background:#059669;color:#fff}\n'
  + '.empty{text-align:center;padding:60px 24px;color:#484f58}\n'
  + '.empty-ic{font-size:52px;margin-bottom:12px}\n'
  + '.toast{position:fixed;bottom:24px;left:16px;right:16px;background:#1a1a2e;border:2px solid #f59e0b;color:#f59e0b;border-radius:14px;padding:14px 18px;font-size:15px;font-weight:700;z-index:100;text-align:center}\n'
  + '.sync{position:fixed;top:12px;right:14px;font-size:10px;color:#484f58}\n'
  + '</style>\n'
  + '</head>\n'
  + '<body>\n'
  + '<div class="hdr"><div class="dot" id="dot"></div><div><div class="hdr-name">' + workerName + '</div><div class="hdr-sub" id="dateLabel"></div></div></div>\n'
  + '<div id="sync" class="sync"></div>\n'
  + '<div class="rooms" id="rooms"><div class="empty"><div class="empty-ic">&#8987;</div><p>Pobieranie danych...</p></div></div>\n'
  + '<script>\n'
  + 'var W=' + wJson + ';\n'
  + 'var lastVacated={};\n'
  + 'var toastT=null;\n'
  + 'function fmtTime(iso){if(!iso)return"";var d=new Date(iso);return d.toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit"});}\n'
  + 'function fmtDur(s,e){if(!s||!e)return"";var ms=new Date(e)-new Date(s);var m=Math.floor(ms/60000);var sc=Math.floor((ms%60000)/1000);return m+"min "+sc+"s";}\n'
  + 'function render(rooms){\n'
  + '  var c=document.getElementById("rooms");\n'
  + '  if(!rooms||!rooms.length){c.innerHTML=\'<div class="empty"><div class="empty-ic">&#10003;</div><p>Brak przydzielonych pokoi</p></div>\';return;}\n'
  + '  var html="";\n'
  + '  for(var i=0;i<rooms.length;i++){\n'
  + '    var r=rooms[i];\n'
  + '    var done=r.status==="czyste";\n'
  + '    var cleaning=r.status==="czyszczenie";\n'
  + '    var vacated=r.vacated&&r.status==="W";\n'
  + '    var cardCls="card"+(done?" done":cleaning?" cleaning":vacated?" vacated":"");\n'
  + '    var rnoCls="rno"+(done?" done":cleaning?" cleaning":vacated?" vacated":" waiting");\n'
  + '    var badge=done?"&#10003; Czyste":cleaning?"&#129529; W trakcie":vacated?"&#128276; Mo\\u017Cesz wej\\u015B\\u0107":"Czeka na wyjazd";\n'
  + '    var badgeCls=done?"badge-done":cleaning?"badge-clean":vacated?"badge-open":"badge-wait";\n'
  + '    var notif=vacated?"<div class=\\"notif\\">&#128276; Pok\\u00F3j pusty \\u2014 mo\\u017Cesz wchodzi\\u0107!</div>":"";\n'
  + '    var tinfo=(r.startedAt&&!done)?"<div class=\\"tinfo\\">Start: "+fmtTime(r.startedAt)+"</div>":"";\n'
  + '    var dur=done?"<div class=\\"dur\\">&#8987; "+fmtDur(r.startedAt,r.doneAt)+"</div>":"";\n'
  + '    var btnS=vacated?"<button class=\\"btn btn-start\\" onclick=\\"act(\'start\',\'"+r.no+"\')\\">Zaczynam sprz\\u0105ta\\u0107</button>":"";\n'
  + '    var btnD=cleaning?"<button class=\\"btn btn-done\\" onclick=\\"act(\'done\',\'"+r.no+"\')\\">&#10003; Gotowe!</button>":"";\n'
  + '    html+="<div class=\\""+cardCls+"\\"><div class=\\"card-top\\"><div class=\\""+rnoCls+"\\">"+r.no+"</div><span class=\\"badge "+badgeCls+"\\">"+badge+"</span></div>"+notif+tinfo+dur+btnS+btnD+"</div>";\n'
  + '  }\n'
  + '  c.innerHTML=html;\n'
  + '}\n'
  + 'function showToast(msg){clearTimeout(toastT);var old=document.querySelector(".toast");if(old)old.remove();var t=document.createElement("div");t.className="toast";t.textContent=msg;document.body.appendChild(t);toastT=setTimeout(function(){t.remove();},5000);}\n'
  + 'function act(action,room){\n'
  + '  fetch("/hk/"+encodeURIComponent(W)+"/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:action,room:room})}).then(poll).catch(function(){});\n'
  + '}\n'
  + 'function poll(){\n'
  + '  var dot=document.getElementById("dot");\n'
  + '  fetch("/api/state").then(function(r){return r.json();}).then(function(s){\n'
  + '    dot.className="dot";\n'
  + '    document.getElementById("sync").textContent="'+new Date().toLocaleTimeString("pl-PL")+'".split("").map(function(){return""}).join("")+new Date().toLocaleTimeString("pl-PL");\n'
  + '    document.getElementById("sync").textContent=new Date().toLocaleTimeString("pl-PL",{hour:"2-digit",minute:"2-digit",second:"2-digit"});\n'
  + '    var myRooms=(s.assignments[W]||[]).map(function(no){return Object.assign({no:no},s.rooms[no]||{status:"W",vacated:false});});\n'
  + '    myRooms.forEach(function(r){\n'
  + '      if(r.vacated&&r.status==="W"&&!lastVacated[r.no]){\n'
  + '        showToast("Pok\\u00F3j "+r.no+" jest pusty \\u2014 mo\\u017Cesz wchodzi\\u0107!");\n'
  + '        lastVacated[r.no]=true;\n'
  + '      }\n'
  + '    });\n'
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
