/* engine.js — all the rules. No model calls happen in this file.
   If you want to change how the plugin decides something, it is in here.
   If you want to change what it decides between, that is in src/data. */

(function () {
"use strict";

var ORDER = ["Welcome","Find","Act","Confirm","Complete"];

/* ---------------------------------------------------------------- curve
   Two parabolas meeting at the trough, easing down to a floor after the
   peak. Generated rather than typed, so adding a stage cannot break the
   shape. Both ends sit high, which is what makes it read as a U. */
var SHAPE = { open:.88, trough:"Find", peak:"Confirm", floor:.82 };

function heights(){
  var ti = ORDER.indexOf(SHAPE.trough), pi = ORDER.indexOf(SHAPE.peak), n = ORDER.length;
  return ORDER.map(function (id, i) {
    if (i <= ti) { var t = ti === 0 ? 0 : i / ti; return SHAPE.open * (1-t) * (1-t); }
    if (i <= pi) { var u = (i-ti) / (pi-ti); return u * u; }
    var v = (i-pi) / Math.max(1, n-1-pi);
    return 1 - (1-SHAPE.floor) * (v*v);
  });
}

/* The curve height, 0 to 1, converted to a motion volume target.
   Volume runs 4 to 13. The constants below map the curve onto the range
   the pattern library actually occupies: quietest pattern 5, loudest 10.
   If you add patterns outside that range, retune these two numbers. */
var VOL_FLOOR = 5, VOL_SPAN = 6;   // library runs 5 (Orbit) to 11 (Pop Then Trim)
function targetFor(stage){
  return Math.round(VOL_FLOOR + heights()[ORDER.indexOf(stage)] * VOL_SPAN);
}

/* -------------------------------------------------------------- volume */
var VOL_MAX = { a:3, d:4, c:3, o:3 };
function volumeOf(p){ return { a:p.v.a, d:p.v.d, c:p.v.c, o:p.v.o, total:p.v.a+p.v.d+p.v.c+p.v.o }; }

/* ----------------------------------------------------------- diagnosis
   Points accumulate per stage. Highest wins. Every rule records why, and
   that reason is what the designer reads. If you add a rule, write the
   reason too. Weights: a name match is 4, strong content evidence is 3-4,
   weaker content evidence is 2. */
function diagnose(fr){
  var ev = [], sc = {}, n = (fr.name||"").toLowerCase();
  ORDER.forEach(function(s){ sc[s] = 0; });
  function add(s,p,w){ sc[s] += p; if (w) ev.push({ s:s, w:w }); }

  if (/welcome|home|intro|start|landing|how can i help/.test(n))
    add("Welcome",4,"The frame name points at an opening.");
  if (/find|search|filter|browse|select|upload|input|compose|receipt|attach|form/.test(n))
    add("Find",4,"The frame name points at searching or entering something.");
  if (/review|choose|book|detail|summary|check|act|option/.test(n))
    add("Act",4,"The frame name points at choosing or reviewing.");
  if (/confirm|success|booked|submitted|approved/.test(n))
    add("Confirm",4,"The frame name points at a confirmation.");
  if (/complete|done|next|thank|track|status/.test(n))
    add("Complete",4,"The frame name points at the journey closing.");
  if (/think|process|load|calculat|waiting/.test(n))
    add("Act",3,"The frame name points at work in progress, which sits inside Act.");

  var tick=false, loop=false, list=false, btns=0, big=false, late=false;
  (fr.els||[]).forEach(function(e){
    if (e.f.completes) tick = true;
    if (e.f.loading) loop = true;
    if (e.sib >= 3) list = true;
    if (e.f.tap) btns++;
    if (e.f.late) late = true;
    if (e.w >= 360 || e.h >= 280) big = true;
    if (e.f.confirms) add("Find",2,"An attachment is being confirmed.");
  });
  if (tick && btns >= 1) add("Confirm",4,"A completion mark sits next to a single primary button.");
  else if (tick)         add("Confirm",2,"There is a completion mark on this frame.");
  if (loop)              add("Act",3,"Something is looping, so work is in progress.");
  if (loop && list)      add("Act",2,"A repeating list next to a loop reads as a progress sequence.");
  if (big && btns>=1 && !tick) add("Find",2,"A large surface with a button reads as input.");
  if (list && !loop && !tick)  add("Act",2,"A repeating list with no loop reads as options to choose from.");
  if (late)              add("Complete",3,"A follow-up link suggests the journey is closing.");

  var best = ORDER[0], top = -1, sec = -1;
  ORDER.forEach(function(k){
    if (sc[k] > top) { sec = top; top = sc[k]; best = k; }
    else if (sc[k] > sec) sec = sc[k];
  });
  /* Confident only when the winner is strong AND clear of the runner-up.
     Below either threshold the plugin asks rather than asserts. */
  return { stage:best, sure: top >= 5 && (top-sec) >= 3, score:top, gap:top-sec,
           evidence: ev.filter(function(e){ return e.s === best; }).map(function(e){ return e.w; }) };
}

/* ------------------------------------------------------------ grouping
   Layers sharing a name stem move together, so they are presented as one
   decision. Four rows called "Detail row" are one entry, not four. */
function groups(fr){
  var out = [], seen = {};
  (fr.els||[]).forEach(function(el){
    var stem = el.n.toLowerCase().replace(/[\s_-]*\d+$/,"").trim();
    if (el.sib >= 2) { if (seen[stem]) return; seen[stem] = 1;
      out.push({ key:stem, label:el.n, count:el.sib, el:el }); }
    else out.push({ key:el.n, label:el.n, count:1, el:el });
  });
  return out;
}

function kindOf(el){
  if (el.f.tap) return "tap";
  if (el.f.loading) return "loading";
  if (el.f.leaves) return "leaving";
  if (el.sib >= 2) return "list";
  if (el.t === "icon") return "icon";
  if (el.w >= 360 || el.h >= 280) return "surface";
  if (el.t === "text") return "text";
  return "single";
}

function libFor(name){
  var L = window.LIB_ICONS;
  for (var i=0;i<L.length;i++) if (L[i].match.test(name)) return L[i];
  return null;
}
function hasStroke(svg){ return /stroke\s*=\s*"(?!none)/.test(svg||""); }
function hasPart(svg, part){
  if (!svg || !part) return false;
  return svg.toLowerCase().indexOf(String(part).toLowerCase()) > -1;
}

/* ------------------------------------------------------------- options
   Icons draw from the verb library, everything else from the patterns.
   Filtered by what the element can actually support, then ordered by how
   close each one sits to what the curve asks for at this stage. */
function optionsFor(g, stage){
  var t = targetFor(stage);
  var el = g.el;

  if (el.t === "icon") {
    var lib = libFor(el.n);
    if (lib) return { lib:lib, ids:[], target:t, icon:true };

    var V = window.VERBS, svg = el.svg || "";
    var ids = Object.keys(V).filter(function(k){
      var vb = V[k];
      var needs = vb.needs ? [].concat(vb.needs) : [];
      if (needs.indexOf("stroke") > -1 && !hasStroke(svg)) return false;
      if (needs.indexOf("second-part") > -1 && (el.parts || 0) < 2) return false;
      if (needs.indexOf("in-progress") > -1 && !el.f.loading) return false;
      /* Some gestures belong to one kind of journey only. Emit and Lift are
         reward motion; using them on a claim is the thing the framework
         exists to prevent. */
      if (vb.onlyIn && vb.onlyIn.indexOf(window.JOURNEY_KIND || "standard") === -1) return false;
      return true;
    });
    ids.sort(function(x,y){
      return Math.abs(volumeOf(V[x]).total - t) - Math.abs(volumeOf(V[y]).total - t);
    });
    return { ids: ids.slice(0,3), target:t, icon:true };
  }

  var P = window.PAT;
  var pids = (window.STAGES[stage].opts[kindOf(el)] || ["quiet-fade"]).slice();
  pids.sort(function(x,y){
    return Math.abs(volumeOf(P[x]).total - t) - Math.abs(volumeOf(P[y]).total - t);
  });
  return { ids:pids, target:t, icon:false };
}

function motionOf(id){ return window.VERBS[id] || window.PAT[id]; }

/* The one motion that stands out. The plugin decides this, it is not a
   control. Nothing stands out at Find or Complete. */
/* The one motion that stands out. The plugin decides this; it is not a
   control. Nothing stands out at Find or Complete. A candidate has to be
   genuinely significant: a completion mark, an icon, or a text layer clearly
   larger than the others. Falling through to "any single element" was how an
   arbitrary line of text ended up leading a Confirmation. */
function mainMotionOf(fr, stage){
  if (stage === "Find" || stage === "Complete") return null;
  var gs = groups(fr), i;

  for (i=0;i<gs.length;i++) if (gs[i].el.f.completes) return gs[i].key;
  if (stage !== "Confirm" && stage !== "Welcome") return null;
  for (i=0;i<gs.length;i++) if (gs[i].el.t === "icon" && gs[i].count === 1) return gs[i].key;

  /* A text layer only counts if it is at least half again the height of the
     next largest text on the frame. Otherwise nothing leads. */
  var texts = gs.filter(function(g){ return g.el.t === "text" && g.count === 1; })
                .sort(function(a,b){ return b.el.h - a.el.h; });
  if (texts.length >= 2 && texts[0].el.h >= texts[1].el.h * 1.5) return texts[0].key;
  if (texts.length === 1 && gs.length > 1) return texts[0].key;
  return null;
}

/* Conditional notes, triggered by what is on this frame. */
function foundOn(fr){
  return (window.FOUND || []).filter(function(r){ return r.test(fr); });
}

/* ------------------------------------------------------------- prompts */
/* Icon prompts list the sequence, because these gestures are compound.
   A single line cannot describe the success check. */
function verbPrompt(vb, g, frameName, isMain){
  var EASt = window.EAS;
  var L = ["Animate " + g.label + " on " + frameName + ".", vb.plain, ""];
  vb.parts.forEach(function (pt) {
    L.push("- " + pt.part + ": " + pt.track.toLowerCase().replace(/_/g, " ")
      + " from " + pt.from + " to " + pt.to
      + ", starting at " + pt.at + "ms over " + pt.ms + "ms, "
      + EASt[pt.e || vb.e].c + " (" + (pt.e || vb.e) + ").");
  });
  L.push("");
  if (vb.loops) L.push("Loop the whole gesture on a " + window.DUR["duration-loop"].ms
    + "ms cycle, holding still for the remainder.");
  if (vb.st) L.push("Offset each part by " + vb.st + "ms (stagger-parts).");
  if (vb.seenIn) L.push("Matches the " + vb.seenIn + " icon already in the Qi library.");
  L.push("Animate inside this icon only. Do not animate the frame or the layers beside it.");
  if (vb.never) L.push(vb.never);
  if (isMain) L.push("This is the main motion on this frame. Nothing else should compete with it.");
  return L.join("\n");
}

function promptFor(id, g, frameName, isMain){
  if (window.VERBS[id]) return verbPrompt(window.VERBS[id], g, frameName, isMain);
  var p = motionOf(id), DURt = window.DUR, EASt = window.EAS;
  var d = p.tokens.filter(function(t){ return DURt[t] && t.indexOf("duration-") === 0; })[0];
  var L = ["Animate " + g.label + (g.count>1 ? " (all "+g.count+")" : "") + " on " + frameName + ".",
           p.plain];
  L.push((p.ms >= 2000 ? "Continuous loop, "+p.ms+"ms per cycle" : p.ms+"ms"+(d?" ("+d+")":""))
    + ", " + EASt[p.e].c + " (" + p.e + ").");
  if (p.st) L.push(p.st + "ms between siblings (stagger-tight).");
  if (p.qi) L.push("Matches the Qi " + p.qi + " transition.");
  L.push("Trigger on this layer only. Do not animate the frame or add a page transition.");
  if (p.never) L.push(p.never);
  if (isMain) L.push("This is the main motion on this frame. Nothing else should compete with it.");
  return L.join(" ");
}

function easingSpec(name){
  var EASt = window.EAS;
  var m = /cubic-bezier\(([^)]+)\)/.exec(EASt[name].c);
  if (!m) return { type: "LINEAR" };
  var n = m[1].split(",").map(Number);
  return { type: "CUSTOM_CUBIC_BEZIER",
           easingFunctionCubicBezier: { x1:n[0], y1:n[1], x2:n[2], y2:n[3] } };
}

/* A verb is a sequence of tracks, so it returns several. Durations in SECONDS. */
function verbKeyframes(vb){
  var total = vb.loops ? window.DUR["duration-loop"].ms
            : vb.parts.reduce(function(m,p){ return Math.max(m, p.at + p.ms); }, 0);
  return {
    compound: true,
    loops: !!vb.loops,
    durationSeconds: total / 1000,
    tracks: vb.parts.map(function (pt) {
      return {
        part: pt.part,
        track: pt.track,
        durationSeconds: pt.ms / 1000,
        keyframes: [
          { timelinePosition: pt.at / 1000, value: pt.from },
          { timelinePosition: (pt.at + pt.ms) / 1000, value: pt.to,
            easing: easingSpec(pt.e || vb.e) }
        ]
      };
    })
  };
}

/* Figma Motion keyframes for a chosen motion. Durations are in SECONDS. */
function keyframesFor(id){
  if (window.VERBS[id]) return verbKeyframes(window.VERBS[id]);
  var p = motionOf(id), EASt = window.EAS;
  var secs = p.ms / 1000;
  var m = /cubic-bezier\(([^)]+)\)/.exec(EASt[p.e].c);
  var ease = m
    ? { type:"CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: (function(){
        var n = m[1].split(",").map(Number);
        return { x1:n[0], y1:n[1], x2:n[2], y2:n[3] };
      })() }
    : { type:"LINEAR" };

  var track = window.VERBS[id] ? window.VERBS[id].track : null;
  if (!track) {
    if (/cascade|group-fade|single-rise|sheet-rise/.test(id)) track = "TRANSLATION_Y";
    else if (/settle|tap-response/.test(id)) track = "SCALE";
    else track = "OPACITY";
  }
  var from = 0, to = 0;
  if (track === "TRANSLATION_Y") { from = id === "sheet-rise" ? 320 : id === "single-rise" ? 16 : 12; to = 0; }
  else if (track === "SCALE")    { from = id === "tap-response" ? 0.97 : 0.92; to = 1; }
  else if (track === "ROTATION") { from = -30; to = 0; }
  else                           { from = 0; to = 1; }

  return { compound:false, track:track, durationSeconds:secs, stagger: p.st ? p.st/1000 : 0,
           keyframes:[ { timelinePosition:0, value:from },
                       { timelinePosition:secs, value:to, easing:ease } ] };
}

window.ENGINE = {
  ORDER: ORDER, SHAPE: SHAPE, VOL_MAX: VOL_MAX,
  heights: heights, targetFor: targetFor, volumeOf: volumeOf,
  diagnose: diagnose, groups: groups, kindOf: kindOf,
  optionsFor: optionsFor, motionOf: motionOf, mainMotionOf: mainMotionOf,
  foundOn: foundOn, promptFor: promptFor, keyframesFor: keyframesFor,
  verbKeyframes: verbKeyframes, easingSpec: easingSpec,
  libFor: libFor, hasStroke: hasStroke, hasPart: hasPart
};

})();
