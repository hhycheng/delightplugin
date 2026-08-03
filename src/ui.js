/* ui.js — the panel. Views, state, and messaging with code.js.
   Reads its data from window.PATTERNS, window.TOKENS, window.JOURNEYS,
   window.ANIMATED_ICONS. It never hardcodes a duration, a stage or a pattern. */

(function () {
"use strict";

var S = {
  view: "setup", prevView: null,
  apiKey: "", keyDraft: "", keyStatus: null, testing: false,
  frames: [], excluded: {},
  journey: Object.keys(window.JOURNEYS)[0],
  goals: [], remarks: "",
  map: null, mapping: false, mapMode: "", pending: null,
  stage: null, frameIdx: null, open: {},
  showHelp: false, corrections: 0
};

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function J() { return window.JOURNEYS[S.journey]; }
function stageById(id) {
  var m = J().stages.filter(function (s) { return s.id === id; });
  return m.length ? m[0] : J().stages[0];
}
function activeFrames() {
  return S.frames.filter(function (f, i) { return !S.excluded[i]; });
}
function post(msg) { parent.postMessage({ pluginMessage: msg }, "*"); }

/* ------------------------------------------------ messages from code.js */

window.onmessage = function (e) {
  var m = e.data.pluginMessage;
  if (!m) return;
  if (m.type === "selection") {
    if (S.view === "setup" || !S.map) {
      S.frames = m.frames; S.map = null; S.excluded = {}; render();
    } else {
      S.pending = m.frames;   // stash it; do not tear down a flow in progress
      render();
    }
  }
  if (m.type === "key") { S.apiKey = m.key || ""; render(); }
  if (m.type === "annotated") {
    var cp = $("cp");
    if (cp) {
      cp.textContent = m.ok ? "Placed" : "Could not place";
      setTimeout(function () { if ($("cp")) $("cp").textContent = "Place on canvas"; }, 1600);
    }
  }
};

/* ------------------------------------------------------------- mapping */

function runMapping() {
  var frames = activeFrames();
  S.mapping = true; render();

  function finish(res, mode) {
    S.map = res; S.mapping = false; S.mapMode = mode; render();
  }
  function fallback() {
    finish(window.ENGINE.mapByName(frames, J()), "name");
  }

  if (!S.apiKey) return fallback();

  window.CLAUDE.mapStages(frames, J(), S.remarks, S.apiKey)
    .then(function (res) {
      if (!res || !res.length) return fallback();
      finish(res, "claude");
    })
    .catch(fallback);
}

/* ------------------------------------------------------------ the curve */

function smoothPath(pts) {
  var n = pts.length, i;
  if (n < 2) return "";
  var h = [], d = [];
  for (i = 0; i < n - 1; i++) { h[i] = pts[i + 1].x - pts[i].x; d[i] = (pts[i + 1].y - pts[i].y) / h[i]; }
  var m = [d[0]];
  for (i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      var w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  m[n - 1] = d[n - 2];
  var path = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
  for (i = 0; i < n - 1; i++) {
    path += " C" + (pts[i].x + h[i] / 3).toFixed(1) + " " + (pts[i].y + m[i] * h[i] / 3).toFixed(1)
          + "," + (pts[i + 1].x - h[i] / 3).toFixed(1) + " " + (pts[i + 1].y - m[i + 1] * h[i] / 3).toFixed(1)
          + "," + pts[i + 1].x.toFixed(1) + " " + pts[i + 1].y.toFixed(1);
  }
  return path;
}

function curveSVG(highlight) {
  var st = J().stages, W = 292, H = 108, padX = 30, top = 16, bot = 78;
  var pts = st.map(function (s, i) {
    return { s: s, x: padX + i * ((W - padX - 12) / Math.max(1, st.length - 1)), y: bot - s.h * (bot - top) };
  });
  var hi = pts.reduce(function (a, b) { return b.s.h > a.s.h ? b : a; });
  var lo = pts.reduce(function (a, b) { return b.s.h < a.s.h ? b : a; });
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto" role="img" '
    + 'aria-label="Motion volume across ' + esc(J().name) + ', peaking at ' + esc(hi.s.id) + '">'
    + '<defs><marker id="ar" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto">'
    + '<path d="M1.5 1.5L6.5 4L1.5 6.5" fill="none" stroke="var(--line-2)" stroke-width="1.2" '
    + 'stroke-linecap="round" stroke-linejoin="round"/></marker></defs>'
    + '<line x1="16" y1="' + bot + '" x2="16" y2="' + (top - 4) + '" stroke="var(--line-2)" marker-end="url(#ar)"/>'
    + '<text x="10" y="' + ((top + bot) / 2) + '" font-size="8" fill="var(--ink-3)" text-anchor="middle" '
    + 'transform="rotate(-90 10 ' + ((top + bot) / 2) + ')">Motion Volume</text>'
    + '<path d="' + smoothPath(pts) + '" fill="none" stroke="var(--line-2)" stroke-width="1.5"/>'
    + '<line x1="' + hi.x + '" y1="' + hi.y + '" x2="' + hi.x + '" y2="' + bot + '" stroke="var(--aia-line)" stroke-dasharray="2 2"/>'
    + '<line x1="' + lo.x + '" y1="' + lo.y + '" x2="' + lo.x + '" y2="' + bot + '" stroke="var(--line-2)" stroke-dasharray="2 2"/>'
    + '<text x="' + hi.x + '" y="' + (hi.y - 6) + '" font-size="8" fill="var(--aia)" text-anchor="middle">Loudest</text>'
    + '<text x="' + lo.x + '" y="' + (lo.y - 6) + '" font-size="8" fill="var(--ink-3)" text-anchor="middle">Quietest</text>'
    + pts.map(function (p) {
        var on = highlight === p.s.id;
        return '<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (on ? 5 : 3) + '" fill="'
          + (on ? "var(--aia)" : p.s.lead ? "var(--aia)" : "var(--ink-3)") + '"/>'
          + '<text x="' + p.x + '" y="' + (bot + 12) + '" font-size="8" text-anchor="middle" fill="'
          + (on ? "var(--aia)" : "var(--ink-3)") + '">' + esc(p.s.id) + '</text>';
      }).join("")
    + '</svg>';
}

/* ------------------------------------------------------------- prompts */

function promptOne(a, frameName) {
  if (a.lib) return "Use " + a.lib.icon + " from the Qi icon library for " + a.el.n
    + " on " + frameName + ". " + a.lib.note + " Do not build this animation by hand.";
  if (a.pid === "none") return "Leave " + a.el.n + " on " + frameName + " unanimated. " + a.note;
  var p = a.p, T = window.TOKENS;
  var d = p.tokens.filter(function (t) { return t.indexOf("duration-") === 0; })[0];
  var e = p.tokens.filter(function (t) { return t.indexOf("easing-") === 0; })[0];
  var ms = p.ms || (d ? T[d].ms : null);
  var L = ["Animate " + a.el.n + " on " + frameName + ".", p.dials.Amplitude + ".",
    (ms ? ms + "ms" : "Continuous loop, 2200ms per cycle") + ", " + (e ? T[e].cubic : "linear") + "."];
  if (p.tokens.indexOf("stagger-tight") > -1) L.push((p.stagger || 60) + "ms between siblings.");
  L.push("Trigger on this layer only. Do not animate the frame.");
  if (p.never) L.push(p.never);
  return L.join(" ");
}

/* --------------------------------------------------------------- views */

var V = {};

function pendingBanner() {
  if (!S.pending) return '';
  return '<div class="flag bad" style="margin-bottom:10px"><b>Selection changed</b>'
    + 'You are still working on the previous journey. '
    + '<button class="link" id="reload">Start again with the new selection</button></div>';
}

function render() {
  var b = $("body"), f = $("foot");
  b.scrollTop = 0;
  V[S.view](b, f);
  if (S.pending && S.view !== "setup" && S.view !== "settings") {
    b.insertAdjacentHTML("afterbegin", pendingBanner());
    var r = $("reload");
    if (r) r.onclick = function () {
      S.frames = S.pending; S.pending = null; S.map = null; S.excluded = {};
      S.stage = null; S.frameIdx = null; S.view = "setup"; render();
    };
  }
  var g = $("gear");
  g.style.display = (S.view === "settings") ? "none" : "";
  g.onclick = function () {
    if (S.view !== "settings") { S.prevView = S.view; S.view = "settings"; render(); }
  };
}

/* ---- setup ---- */
V.setup = function (b, f) {
  $("ttl").textContent = "Delight Motion"; $("stp").textContent = "Setup";
  var live = activeFrames().length;

  if (!S.frames.length) {
    b.innerHTML = '<h3>Select some frames</h3>'
      + '<p class="lede">Select the frames in a journey, in the order the user moves through them. '
      + 'Selecting a section picks up every frame inside it.</p>';
    f.innerHTML = ''; return;
  }

  b.innerHTML =
    '<h3>Set up the journey</h3>'
    + '<p class="lede">' + live + ' of ' + S.frames.length + ' frames included.</p>'
    + '<p class="q">Which journey is this?</p>'
    + '<select id="jr" style="margin-bottom:12px">'
    + Object.keys(window.JOURNEYS).map(function (k) {
        return '<option value="' + k + '"' + (k === S.journey ? ' selected' : '') + '>'
          + esc(window.JOURNEYS[k].name) + '</option>'; }).join("")
    + '</select>'
    + '<p class="q">What is the user doing?</p>'
    + '<textarea id="rm" rows="2" placeholder="Booking a doctor with the AIA assistant">' + esc(S.remarks) + '</textarea>'
    + '<p class="note" style="margin-top:4px">One line. Used to match frames to stages.</p>'
    + '<p class="q" style="margin-top:12px">How should someone feel at the end?</p>'
    + '<p class="note" style="margin-bottom:6px">Pick as many as apply.</p>'
    + window.GOALS.map(function (g) {
        return '<button class="opt" data-g="' + g.v + '" aria-pressed="' + (S.goals.indexOf(g.v) > -1) + '">'
          + esc(g.l) + '<small>' + esc(g.sub) + '</small></button>'; }).join("")
    + '<div class="sec">Frames in this journey</div>'
    + '<p class="note" style="margin-bottom:6px">Uncheck anything that is not a step: '
    + 'filter panels, component variants, alternate branches.</p>'
    + S.frames.map(function (fr, i) {
        return '<div class="frow"><label style="flex:1;display:flex;gap:7px;align-items:center;cursor:pointer">'
          + '<input type="checkbox" data-x="' + i + '"' + (S.excluded[i] ? '' : ' checked') + '>'
          + '<span class="nm"' + (S.excluded[i] ? ' style="color:var(--ink-3);text-decoration:line-through"' : '')
          + ' title="' + esc(fr.name) + '">' + esc(fr.name) + '</span></label>'
          + '<span class="note">' + fr.els.length + '</span></div>'; }).join("");

  Array.prototype.forEach.call(b.querySelectorAll(".opt"), function (o) {
    o.onclick = function () {
      var i = S.goals.indexOf(o.dataset.g);
      if (i > -1) S.goals.splice(i, 1); else S.goals.push(o.dataset.g);
      render();
    };
  });
  Array.prototype.forEach.call(b.querySelectorAll("[data-x]"), function (c) {
    c.onchange = function () { S.excluded[c.dataset.x] = !c.checked; render(); };
  });
  $("jr").onchange = function (e) { S.journey = e.target.value; S.map = null; S.stage = null; };
  $("rm").oninput = function (e) { S.remarks = e.target.value; };

  var ready = S.goals.length && live >= 2;
  f.innerHTML = '<button class="primary" style="flex:1" id="nx"' + (ready ? '' : ' disabled') + '>'
    + (live < 2 ? 'Include at least 2 frames' : 'Map the journey') + '</button>';
  if (ready) $("nx").onclick = function () { S.view = "curve"; runMapping(); };
};

/* ---- curve ---- */
V.curve = function (b, f) {
  $("ttl").textContent = J().name; $("stp").textContent = "Step 1 of 3";
  if (S.mapping) {
    b.innerHTML = '<h3>Mapping your journey</h3><p class="lede"><span class="spin"></span> '
      + (S.apiKey ? 'Claude is reading your frame names and placing each one on a stage.'
                  : 'Matching frame names to stages.') + '</p>';
    f.innerHTML = ''; return;
  }
  var frames = activeFrames();
  var st = J().stages;
  var unsure = S.map.filter(function (m) { return !m.sure; }).length;

  b.innerHTML =
    '<h3>Review the curve</h3>'
    + '<p class="lede">Where each frame sits, and how loud motion should be there. '
    + (S.mapMode === "claude" ? 'Matched by Claude.'
        : 'Matched by name. Add a key in settings for better guesses on unclear names.') + '</p>'
    + curveSVG(null)
    + '<button class="link" id="hp" style="margin:4px 0 8px">'
    + (S.showHelp ? 'Hide' : 'What is Motion Volume?') + '</button>'
    + (S.showHelp ? helpBlock() : '')
    + (unsure ? '<div class="flag bad"><b>' + unsure + ' frame' + (unsure > 1 ? 's' : '')
        + ' not certain</b>Open the dropdown to confirm or change it.</div>' : '')
    + S.map.map(function (m) {
        var fr = frames[m.i];
        if (!fr) return '';
        return '<div class="frow"><span class="nm" title="' + esc(fr.name) + '">' + esc(fr.name) + '</span>'
          + (m.sure ? '' : '<span class="guess" title="' + esc(m.why) + '">Guessed</span>')
          + '<select data-i="' + m.i + '">'
          + st.map(function (s) { return '<option' + (s.id === m.stage ? ' selected' : '') + '>'
              + esc(s.id) + '</option>'; }).join("")
          + '</select></div>'; }).join("")
    + namingHint()
    + (S.corrections ? '<p class="note" style="margin-top:8px">' + S.corrections
        + ' correction' + (S.corrections > 1 ? 's' : '') + ' logged.</p>' : '');

  $("hp").onclick = function () { S.showHelp = !S.showHelp; render(); };
  Array.prototype.forEach.call(b.querySelectorAll("select"), function (sel) {
    function confirmRow() {
      var i = parseInt(sel.dataset.i, 10);
      var rec = S.map.filter(function (m) { return m.i === i; })[0];
      if (rec.stage !== sel.value) S.corrections++;
      rec.stage = sel.value; rec.sure = true; render();
    }
    sel.onchange = confirmRow;
    sel.onblur = confirmRow;
  });

  f.innerHTML = '<button id="bk">Back</button><button class="primary" style="flex:1" id="nx">Confirm map</button>';
  $("bk").onclick = function () { S.view = "setup"; render(); };
  $("nx").onclick = function () { S.view = "stage"; render(); };
};

function helpBlock() {
  var rows = [
    ["Amplitude",    "How much changes: position, size, opacity, rotation", 92],
    ["Duration",     "How long it takes",                                   64],
    ["Character",    "How it speeds up and slows",                          76],
    ["Choreography", "How many things move, and in what order",             50]
  ];
  return '<div class="help">'
    + '<b>Motion Volume</b> is how much a moment moves overall. Four things set it:'
    + '<div class="dials-x">'
    + rows.map(function (r) {
        return '<div class="dx-row">'
          + '<div class="dx-label">' + r[0] + '</div>'
          + '<div class="dx-track"><div class="dx-fill" style="width:' + r[2] + '%"></div></div>'
          + '<div class="dx-sub">' + r[1] + '</div>'
          + '</div>'; }).join("")
    + '</div>'
    + '<p style="margin:0 0 10px">A moment with all four turned up asks for attention. '
    + 'With all four turned down, it does its job and gets out of the way.</p>'
    + '<b>Reading the curve</b>'
    + '<p style="margin:4px 0 10px">Insurance journeys open with a greeting, run quiet while the '
    + 'user is working, then peak once at the point they commit. That shape holds across journeys.</p>'
    + '<p style="margin:0">The heights are relative to this journey only. The peak here is not as '
    + 'loud as the peak in a rewards flow.</p></div>';
}

function namingHint() {
  return '<div class="help" style="margin-top:12px"><b>Frame names decide the mapping</b>'
    + '<div style="display:flex;gap:8px;margin-top:7px">'
    + '<div style="flex:1"><div style="font-size:9px;color:var(--ok);margin-bottom:3px">Works</div>'
    + '<div class="chip-code ok">06 Confirmation</div></div>'
    + '<div style="flex:1"><div style="font-size:9px;color:var(--warn);margin-bottom:3px">Gets guessed</div>'
    + '<div class="chip-code warn">Book doctor</div></div></div>'
    + '<p class="note" style="margin-top:6px">Repeated names are resolved by position, which is '
    + 'often wrong. Number them.</p></div>';
}

/* ---- stage ---- */
V.stage = function (b, f) {
  $("ttl").textContent = J().name; $("stp").textContent = "Step 2 of 3";
  var st = J().stages, frames = activeFrames();
  var lead = st.filter(function (s) { return s.lead; })[0];

  b.innerHTML =
    '<h3>Which stage are you working on?</h3>'
    + '<p class="lede">Motion is generated for every element in that stage.</p>'
    + curveSVG(S.stage)
    + '<div class="rec" style="margin-top:8px">Start with <b>' + esc(lead.id) + '</b>. '
    + 'It is the loudest point in this journey and the one worth getting right first.</div>'
    + st.map(function (s) {
        var mine = S.map.filter(function (m) { return m.stage === s.id; });
        var count = mine.reduce(function (n, m) { return n + (frames[m.i] ? frames[m.i].els.length : 0); }, 0);
        var hi = Math.max.apply(null, st.map(function (x) { return x.h; }));
        var lo = Math.min.apply(null, st.map(function (x) { return x.h; }));
        var lvl = s.h === hi ? 'Loudest' : s.h === lo ? 'Quietest' : 'Building';
        return '<button class="opt" data-s="' + esc(s.id) + '" aria-pressed="' + (S.stage === s.id) + '"'
          + (mine.length ? '' : ' disabled') + '>'
          + '<span style="display:flex;justify-content:space-between;gap:6px">'
          + '<span>' + esc(s.id) + '</span>'
          + '<span class="lvl' + (s.lead ? ' peak' : '') + '">' + lvl + '</span></span>'
          + '<small>' + (mine.length ? mine.length + ' frame' + (mine.length > 1 ? 's' : '') + ', ' + count + ' elements'
              : 'no frames here') + '</small></button>'; }).join("");

  Array.prototype.forEach.call(b.querySelectorAll(".opt"), function (o) {
    if (o.disabled) return;
    o.onclick = function () { S.stage = o.dataset.s; S.frameIdx = null; render(); };
  });
  f.innerHTML = '<button id="bk">Back</button><button class="primary" style="flex:1" id="nx"'
    + (S.stage ? '' : ' disabled') + '>Generate motion</button>';
  $("bk").onclick = function () { S.view = "curve"; render(); };
  if (S.stage) $("nx").onclick = function () {
    var mine = S.map.filter(function (m) { return m.stage === S.stage; });
    S.frameIdx = mine[0].i; S.open = {}; S.view = "out"; render();
  };
};

/* ---- output ---- */
var TESTS = [
  { k: "nat", l: "Natural",    p: "feels real",  n: "Nothing here needs to imitate a physical object." },
  { k: "fun", l: "Functional", p: "does a job",  n: "Not carrying information on its own." },
  { k: "exp", l: "Expressive", p: "right tone",  n: "Neutral by design. Not a focal moment." }
];

V.out = function (b, f) {
  var st = stageById(S.stage), frames = activeFrames();
  var mine = S.map.filter(function (m) { return m.stage === S.stage; });
  var fr = frames[S.frameIdx];
  $("ttl").textContent = S.stage; $("stp").textContent = "Step 3 of 3";
  if (!fr) {
    b.innerHTML = '<h3>That frame is no longer in the selection</h3>'
      + '<p class="lede">Go back and pick a stage again.</p>';
    f.innerHTML = '<button style="flex:1" id="bk">Back</button>';
    $("bk").onclick = function () { S.view = "stage"; render(); };
    return;
  }
  var anns = window.ENGINE.annotate(fr, st);
  var moving = anns.filter(function (a) { return a.pid !== "none"; }).length;
  var T = window.TOKENS;

  b.innerHTML =
    (mine.length > 1
      ? '<div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap">'
        + mine.map(function (m) {
            return '<button data-f="' + m.i + '" class="' + (m.i === S.frameIdx ? 'primary' : '') + '" '
              + 'style="font-size:10px;padding:5px 8px">' + esc(frames[m.i].name) + '</button>'; }).join("")
        + '</div>' : '')
    + '<h3>' + esc(fr.name) + '</h3>'
    + '<p class="lede">' + moving + ' of ' + anns.length + ' elements move. ' + esc(st.plain)
    + ', so this stage stays ' + (st.lead ? 'at the peak' : 'quiet') + '.</p>'
    + '<p class="note" style="margin-bottom:8px">Open an element to see its spec and copy its prompt.</p>'
    + anns.map(function (a, i) {
        var open = !!S.open[i], p = a.p;
        var stag = p.tokens.indexOf("stagger-tight") > -1;
        return '<div class="ann' + (a.pid === "none" ? ' mute' : '') + '">'
          + '<div class="ann-h" data-o="' + i + '"><span class="en">' + esc(a.el.n) + '</span>'
          + '<span class="pt">' + (a.lib ? 'Use icon' : esc(p.name)) + '</span></div>'
          + (open ? '<div class="ann-b">'
              + (a.lib ? '<div class="flag good" style="margin-bottom:8px"><b>Already in the icon library</b>'
                  + '<code>' + esc(a.lib.icon) + '</code>. ' + esc(a.lib.note) + '</div>' : '')
              + '<p style="color:var(--ink-2);margin-bottom:8px">' + esc(p.plain) + '</p>'
              + '<div class="dial">'
              + Object.keys(p.dials).map(function (k) {
                  return '<span>' + esc(k) + '</span><span>' + esc(p.dials[k]) + '</span>'; }).join("")
              + '</div>'
              + (p.tokens.length ? p.tokens.map(function (t) {
                  var tk = T[t];
                  var shown = (tk.ms && t.indexOf("duration-") === 0 && p.ms) ? p.ms + "ms"
                            : (tk.ms && t === "stagger-tight" && p.stagger) ? p.stagger + "ms"
                            : (tk.ms ? tk.ms + "ms" : tk.cubic);
                  return '<div class="kv"><code>' + esc(t) + '</code><span>' + shown
                    + (tk.qi ? '' : '<span class="new">new</span>') + '</span></div>'; }).join("") : '')
              + '<div class="pvbox" id="pv' + i + '">'
              + Array.apply(null, { length: stag ? 4 : 1 }).map(function () {
                  return '<div class="' + (stag ? "bar" : "sq") + '"></div>'; }).join("")
              + '</div>'
              + '<button class="link" data-p="' + i + '" style="margin-bottom:8px">Play again</button>'
              + '<p class="note" style="margin:0 0 10px">Why this one: ' + esc(a.note) + '</p>'
              + '<div class="sec" style="margin:0 0 6px">Motion Principles</div>'
              + TESTS.map(function (t) {
                  var v = p.why[t.k];
                  return '<p style="font-size:10px;line-height:1.55;margin-bottom:5px;color:'
                    + (v ? 'var(--ink-2)' : 'var(--ink-3)') + '"><b style="color:var(--ink)">' + t.l + '</b> '
                    + '<span style="color:var(--ink-3)">' + t.p + '</span><br>' + esc(v || t.n) + '</p>'; }).join("")
              + '<button data-c="' + i + '" style="width:100%;margin-top:8px">Copy prompt for this element</button>'
              + '</div>' : '')
          + '</div>'; }).join("");

  function play(i) {
    var a = anns[i], p = a.p, box = $("pv" + i);
    if (!box) return;
    var dTok = p.tokens.filter(function (t) { return t.indexOf("duration-") === 0; })[0];
    var eTok = p.tokens.filter(function (t) { return t.indexOf("easing-") === 0; })[0];
    var d = p.ms || (dTok ? T[dTok].ms : 1400);
    var c = eTok ? T[eTok].cubic : "linear";
    var stag = p.tokens.indexOf("stagger-tight") > -1;
    var gap = p.stagger || 60;
    var from = { t: "none", o: "1" };
    if (a.pid === "cascade") from = { t: "translateY(12px)", o: "0" };
    else if (a.pid === "settle") from = { t: "scale(.92)", o: "1", mid: "scale(1.04)" };
    else if (a.pid === "surface-rise") from = { t: "translateY(46px)", o: "1" };
    else if (a.pid === "single-rise") from = { t: "translateY(16px)", o: "0" };
    else if (a.pid === "tap-response") from = { t: "scale(.97)", o: "1" };
    else if (a.pid === "progressive-reveal") from = { t: "none", o: "0" };
    else if (a.pid === "ambient-loop") from = { t: "none", o: ".25" };
    else if (a.pid === "stroke-in") from = { t: "scaleX(0)", o: "1" };
    else if (a.pid === "recede") from = { t: "none", o: "1", to: { t: "translateY(8px)", o: ".4" } };
    else if (a.pid === "container-transform") from = { t: "translateX(-24px) scale(.85)", o: "1" };
    else if (a.pid === "none") from = { t: "none", o: "1", still: true };

    Array.prototype.forEach.call(box.children, function (el, k) {
      el.style.transition = "none";
      el.style.transformOrigin = a.pid === "stroke-in" ? "left center" : "center";
      el.style.transform = from.t; el.style.opacity = from.o;
      void el.offsetWidth;
      if (from.still) return;
      setTimeout(function () {
        el.style.transition = "transform " + d + "ms " + c + ", opacity " + d + "ms " + c;
        if (from.to) { el.style.transform = from.to.t; el.style.opacity = from.to.o; }
        else if (from.mid) {
          el.style.transform = from.mid;
          setTimeout(function () { el.style.transform = "none"; }, d * 0.55);
        } else { el.style.transform = "none"; el.style.opacity = "1"; }
      }, (stag ? k * gap : 0) + 60);
    });
  }

  Array.prototype.forEach.call(b.querySelectorAll("[data-p]"), function (x) {
    x.onclick = function (ev) { ev.stopPropagation(); play(parseInt(x.dataset.p, 10)); };
  });
  Object.keys(S.open).forEach(function (k) {
    if (S.open[k]) setTimeout(function () { play(parseInt(k, 10)); }, 140);
  });
  Array.prototype.forEach.call(b.querySelectorAll("[data-c]"), function (x) {
    x.onclick = function (ev) {
      ev.stopPropagation();
      var a = anns[parseInt(x.dataset.c, 10)];
      navigator.clipboard.writeText(promptOne(a, fr.name)).then(function () {
        x.textContent = "Copied";
        setTimeout(function () { x.textContent = "Copy prompt for this element"; }, 1200);
      }).catch(function () {});
    };
  });
  Array.prototype.forEach.call(b.querySelectorAll("[data-f]"), function (x) {
    x.onclick = function () { S.frameIdx = parseInt(x.dataset.f, 10); S.open = {}; render(); };
  });
  Array.prototype.forEach.call(b.querySelectorAll("[data-o]"), function (x) {
    x.onclick = function () { var i = x.dataset.o; S.open[i] = !S.open[i]; render(); };
  });

  f.innerHTML = '<button id="bk">Back</button><button class="primary" style="flex:1" id="cp">Place on canvas</button>';
  $("bk").onclick = function () { S.view = "stage"; render(); };
  $("cp").onclick = function () {
    post({ type: "annotate", job: {
      frameId: fr.id, stage: S.stage, lead: !!st.lead,
      items: anns.map(function (a) {
        return {
          element: a.el.n,
          pattern: a.lib ? ("Use " + a.lib.icon) : a.p.name,
          detail: a.lib ? a.lib.note : a.p.plain,
          tokens: a.p.tokens.length ? a.p.tokens.join("  ·  ") : ""
        };
      })
    }});
    $("cp").textContent = "Placing…";
  };
};

/* ---- settings ---- */
function maskKey(k) { return k ? k.slice(0, 7) + "..." + k.slice(-4) : ""; }

V.settings = function (b, f) {
  $("ttl").textContent = "Settings"; $("stp").textContent = "";
  var has = !!S.apiKey;
  b.innerHTML =
    '<h3>Claude API key</h3>'
    + '<p class="lede">Optional. With a key, frames are matched to stages by Claude. '
    + 'Without one, they are matched by name.</p>'
    + (has
      ? '<div class="flag good"><b>Key saved</b><code>' + esc(maskKey(S.apiKey)) + '</code></div>'
      : '<div class="flag neutral"><b>No key saved</b>Name matching is on. Everything works, '
        + 'but repeated or generic frame names get guessed.</div>')
    + '<p class="q" style="margin-top:12px">' + (has ? 'Replace key' : 'Paste your key') + '</p>'
    + '<input id="kf" type="password" placeholder="sk-ant-..." value="' + esc(S.keyDraft) + '" '
    + 'class="keyfield" autocomplete="off">'
    + '<div style="display:flex;gap:5px;margin-top:6px">'
    + '<button id="sv" style="flex:1"' + (S.keyDraft ? '' : ' disabled') + '>Save and test</button>'
    + (has ? '<button id="rm">Remove</button>' : '') + '</div>'
    + (S.testing ? '<p class="note" style="margin-top:8px"><span class="spin"></span> Testing the key…</p>' : '')
    + (S.keyStatus && !S.testing
        ? '<div class="flag ' + (S.keyStatus.ok ? 'good' : 'bad') + '" style="margin-top:8px">'
          + esc(S.keyStatus.msg) + '</div>' : '')
    + '<div class="sec">Where to get one</div>'
    + '<ol class="steps"><li>Sign in at platform.claude.com</li>'
    + '<li>Open API keys from the menu under your organisation name</li>'
    + '<li>Create key, then copy it. It is only shown once.</li></ol>'
    + '<p class="note" style="margin-top:8px">Separate from a Claude.ai subscription. '
    + 'New accounts get free credits, enough for a few thousand mappings. Uses '
    + esc(window.CLAUDE.model) + ', the cheapest tier.</p>'
    + '<div class="sec">Where it is stored</div>'
    + '<p class="note">Saved to this machine only, using Figma client storage. Never written into the '
    + 'plugin file and never shared with anyone else who installs it. Only frame names and stage names '
    + 'are sent to the API. Frame contents are not.</p>';

  var kf = $("kf");
  kf.oninput = function () { S.keyDraft = kf.value; S.keyStatus = null; render(); };
  if ($("sv")) $("sv").onclick = function () {
    S.testing = true; render();
    var k = S.keyDraft.trim();
    window.CLAUDE.testKey(k).then(function (r) {
      S.keyStatus = r; S.testing = false;
      if (r.ok) { S.apiKey = k; S.keyDraft = ""; post({ type: "save-key", key: k }); }
      render();
    });
  };
  if ($("rm")) $("rm").onclick = function () {
    S.apiKey = ""; S.keyStatus = null; post({ type: "save-key", key: "" }); render();
  };

  f.innerHTML = '<button style="flex:1" id="bk">Done</button>';
  $("bk").onclick = function () { S.view = S.prevView || "setup"; render(); };
};

render();
post({ type: "ready" });

})();
