// code.js — runs in the Figma sandbox. No network access here.
// Reads the selection, exports icon geometry, and writes Motion keyframes.

figma.showUI(__html__, { width: 360, height: 660, themeColors: true });

var muteSelection = false;

// ------------------------------------------------------------ read a frame

/* Is this an icon? Real files name icons things like "Property 1=Default",
   so the name is unreliable. Geometry is not: an icon is small, roughly
   square, and contains only vectors. That catches most of them without
   depending on anyone's naming conventions. */
function looksLikeIcon(node) {
  var w = "width" in node ? node.width : 0;
  var h = "height" in node ? node.height : 0;
  if (!w || !h) return false;
  if (w > 96 || h > 96) return false;                 // too big to be an icon
  var ratio = w / h;
  if (ratio < 0.6 || ratio > 1.7) return false;       // not roughly square
  if (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION") return true;
  if (!("children" in node) || !node.children.length) return false;
  var vectors = 0, other = 0;
  node.children.forEach(function (c) {
    if (c.type === "VECTOR" || c.type === "BOOLEAN_OPERATION" ||
        c.type === "ELLIPSE" || c.type === "RECTANGLE" || c.type === "LINE" ||
        c.type === "STAR" || c.type === "POLYGON" || c.type === "GROUP") vectors++;
    else other++;
  });
  return vectors > 0 && other === 0;
}

function classify(node) {
  var n = node.name.toLowerCase();
  if (/button|cta|btn|submit|confirm|next|book now|done/.test(n)) return "button";
  if (node.type === "TEXT") return "text";
  if (looksLikeIcon(node)) return "icon";
  if (/icon|ic-|check|tick|spinner|loader|star|sparkle|lock|shield|bell/.test(n)) return "icon";
  if (/image|photo|avatar|thumbnail|map|banner/.test(n)) return "image";
  if (/row|item|cell|list item|card/.test(n)) return "row";
  if (/chip|tag|pill|prompt/.test(n)) return "chip";
  return "container";
}

function stem(name) {
  return name.toLowerCase().replace(/[\s_-]*\d+$/, "").trim();
}

function flagsFor(node, type) {
  var n = node.name.toLowerCase();
  return {
    tap:       type === "button",
    loading:   /spinner|loader|loading|progress|thinking|sheen|pulse/.test(n),
    streaming: /response|answer|message|typing|stream/.test(n),
    completes: /check|tick|success|done|complete/.test(n),
    leaves:    /completed|past|previous|dismiss|old/.test(n),
    confirms:  /thumbnail|attachment|upload|receipt|preview/.test(n),
    late:      /follow|feedback|next step|helpful|rate|track/.test(n),
    secondState: false      // set when the designer picks a second icon
  };
}

/* How many shape children does this node have? The compound verbs need at
   least two, so this is what `needs: "second-part"` is checked against. */
function partCount(node) {
  if (!("children" in node)) return 0;
  return node.children.filter(function (c) {
    return c.visible !== false && c.type !== "TEXT";
  }).length;
}

// Icons get their geometry exported so the panel can preview the real thing,
// and so "draw" can be validated against an actual stroked path.
async function svgFor(node) {
  try {
    var s = await node.exportAsync({ format: "SVG_STRING" });
    return s.length > 20000 ? "" : s;
  } catch (e) { return ""; }
}

async function readFrame(frame) {
  var kids = ("children" in frame) ? frame.children.filter(function (k) { return k.visible !== false; }) : [];
  var counts = {};
  kids.forEach(function (k) { var s = stem(k.name); counts[s] = (counts[s] || 0) + 1; });

  var els = [];
  for (var i = 0; i < kids.length; i++) {
    var k = kids[i], type = classify(k);
    els.push({
      id: k.id,
      n: k.name,
      t: type,
      w: Math.round("width" in k ? k.width : 0),
      h: Math.round("height" in k ? k.height : 0),
      sib: counts[stem(k.name)] || 1,
      f: flagsFor(k, type),
      svg: type === "icon" ? await svgFor(k) : ""
    });
  }
  return { id: frame.id, name: frame.name, w: Math.round(frame.width), h: Math.round(frame.height), els: els };
}

async function sendSelection() {
  var sel = figma.currentPage.selection.filter(function (n) {
    return n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE";
  });
  if (!sel.length) { figma.ui.postMessage({ type: "frame", frame: null }); return; }
  var frame = await readFrame(sel[0]);
  figma.ui.postMessage({ type: "frame", frame: frame, extra: sel.length - 1 });
}

figma.on("selectionchange", function () { if (!muteSelection) sendSelection(); });

// ------------------------------------------------- write Motion keyframes

function easingFor(spec) {
  if (!spec || spec.type === "LINEAR") return { type: "LINEAR" };
  return { type: "CUSTOM_CUBIC_BEZIER", easingFunctionCubicBezier: spec.easingFunctionCubicBezier };
}

/* The Motion API is in beta. If anything here is unavailable, fall back to
   writing the spec as a text annotation so the designer still gets the values. */
/* A verb is a sequence of tracks on sub-parts, so it writes several. */
async function applyCompound(node, kf) {
  var kids = ("children" in node)
    ? node.children.filter(function (c) { return c.visible !== false; })
    : [];
  for (var i = 0; i < kf.tracks.length; i++) {
    var t = kf.tracks[i];
    /* Map each track onto a sub-part where there is one, otherwise the icon
       itself. Order follows the layer order, which is how the library icons
       are built. */
    var target = (kids.length > i && t.part !== "whole") ? kids[i] : node;
    target.applyManualKeyframeTrack(
      { type: "PROPERTY", name: t.track },
      {
        baseValue: { type: "FLOAT", value: t.keyframes[0].value },
        keyframes: t.keyframes.map(function (f) {
          var o = { timelinePosition: f.timelinePosition,
                    value: { type: "FLOAT", value: f.value } };
          if (f.easing) o.easing = easingFor(f.easing);
          return o;
        })
      }
    );
  }
  var timelines = node.timelines;
  if (timelines && timelines[0]) {
    node.setTimelineDuration(timelines[0].id, Math.max(1, kf.durationSeconds));
  }
  return 1;
}

async function applyMotion(job) {
  var targets = [];
  for (var i = 0; i < job.nodeIds.length; i++) {
    var n = await figma.getNodeByIdAsync(job.nodeIds[i]);
    if (n) targets.push(n);
  }
  if (!targets.length) throw new Error("that layer is no longer in the file");

  var k = job.kf;
  if (k.compound) return await applyCompound(targets[0], k);
  for (var j = 0; j < targets.length; j++) {
    var node = targets[j];
    var offset = (k.stagger || 0) * j;
    node.applyManualKeyframeTrack(
      { type: "PROPERTY", name: k.track },
      {
        baseValue: { type: "FLOAT", value: k.keyframes[0].value },
        keyframes: k.keyframes.map(function (f) {
          var kf = {
            timelinePosition: f.timelinePosition + offset,
            value: { type: "FLOAT", value: f.value }
          };
          if (f.easing) kf.easing = easingFor(f.easing);
          return kf;
        })
      }
    );
    var timelines = node.timelines;
    if (timelines && timelines[0]) {
      node.setTimelineDuration(timelines[0].id, Math.max(1, k.durationSeconds + offset + 0.2));
    }
  }
  return targets.length;
}

// ----------------------------------------------------------- annotations

var CARD_W = 250;

async function annotate(job) {
  var FAM = "Inter", BOLD = "Semi Bold";
  try {
    await figma.loadFontAsync({ family: FAM, style: "Regular" });
    await figma.loadFontAsync({ family: FAM, style: BOLD });
  } catch (e) {
    FAM = "Roboto"; BOLD = "Medium";
    await figma.loadFontAsync({ family: FAM, style: "Regular" });
    await figma.loadFontAsync({ family: FAM, style: BOLD });
  }

  var frame = await figma.getNodeByIdAsync(job.frameId);
  if (!frame) throw new Error("that frame is no longer in the file");

  var card = figma.createFrame();
  card.resize(CARD_W, 100);
  card.name = "Delight Motion — " + frame.name;
  card.layoutMode = "VERTICAL";
  card.counterAxisSizingMode = "FIXED";
  card.primaryAxisSizingMode = "AUTO";
  card.itemSpacing = 8;
  card.paddingTop = card.paddingBottom = card.paddingLeft = card.paddingRight = 14;
  card.cornerRadius = 8;
  card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  card.strokes = [{ type: "SOLID", color: { r: .85, g: .85, b: .85 } }];
  card.x = frame.x + frame.width + 48;
  card.y = frame.y;

  function line(text, size, bold, grey) {
    if (!text) {
      var sp = figma.createFrame();
      sp.resize(CARD_W - 28, 4); sp.fills = []; sp.layoutAlign = "STRETCH";
      card.appendChild(sp); return;
    }
    var t = figma.createText();
    t.fontName = { family: FAM, style: bold ? BOLD : "Regular" };
    t.characters = text;
    t.fontSize = size;
    t.lineHeight = { unit: "PERCENT", value: 150 };
    t.layoutAlign = "STRETCH";
    t.textAutoResize = "HEIGHT";
    if (grey) t.fills = [{ type: "SOLID", color: { r: .45, g: .45, b: .45 } }];
    card.appendChild(t);
  }

  line(job.stage + (job.main ? "  ·  main motion: " + job.main : ""), 10, false, true);
  line(frame.name, 14, true, false);
  job.items.forEach(function (it) {
    line("", 0, false, false);
    line(it.element + "  —  " + it.motion, 11, true, false);
    line(it.detail, 10, false, true);
    if (it.tokens) line(it.tokens, 9, false, true);
  });

  muteSelection = true;
  (frame.parent || figma.currentPage).appendChild(card);
  figma.viewport.scrollAndZoomIntoView([frame, card]);
  setTimeout(function () { muteSelection = false; }, 400);
}

// --------------------------------------------------------- library icons

async function insertLibraryIcon(job) {
  var comp = await figma.importComponentByKeyAsync(job.key);
  var target = await figma.getNodeByIdAsync(job.nodeIds[0]);
  var inst = comp.createInstance();
  if (target && target.parent) {
    inst.x = target.x; inst.y = target.y;
    if ("resize" in inst && target.width) inst.resize(target.width, target.height);
    muteSelection = true;
    target.parent.insertChild(target.parent.children.indexOf(target), inst);
    target.remove();
    setTimeout(function () { muteSelection = false; }, 400);
  } else {
    figma.currentPage.appendChild(inst);
  }
  return inst.name;
}

// -------------------------------------------------------------- messages

figma.ui.onmessage = async function (msg) {
  if (msg.type === "ready") {
    var key = await figma.clientStorage.getAsync("anthropic_key");
    figma.ui.postMessage({ type: "key", key: key || "" });
    sendSelection();
  }

  if (msg.type === "save-key") {
    await figma.clientStorage.setAsync("anthropic_key", msg.key || "");
  }

  if (msg.type === "apply") {
    var wrote = 0, viaMotion = true;
    try {
      wrote = await applyMotion(msg.job);
      figma.notify("Applied to " + wrote + " layer" + (wrote > 1 ? "s" : ""));
    } catch (e) {
      viaMotion = false;
      try {
        await annotate(msg.job.annotation);
        figma.notify("Motion API unavailable, so the spec was placed as a note instead");
      } catch (e2) {
        figma.ui.postMessage({ type: "applied", ok: false, msg: e2.message });
        figma.notify("Could not apply: " + e2.message);
        return;
      }
    }
    figma.ui.postMessage({ type: "applied", ok: true, key: msg.job.groupKey, viaMotion: viaMotion });
  }

  if (msg.type === "insert-icon") {
    try {
      await insertLibraryIcon(msg.job);
      figma.ui.postMessage({ type: "applied", ok: true, key: msg.job.groupKey, viaMotion: true });
      figma.notify("Inserted the animated component");
    } catch (e) {
      figma.ui.postMessage({ type: "applied", ok: false, msg: e.message });
      figma.notify("Could not insert: check the component key in src/data/icons.js");
    }
  }

  if (msg.type === "annotate") {
    try { await annotate(msg.job); figma.notify("Spec placed beside the frame"); }
    catch (e) { figma.notify("Could not place the note: " + e.message); }
  }

  if (msg.type === "focus" && msg.id) {
    var n = await figma.getNodeByIdAsync(msg.id);
    if (n) { muteSelection = true; figma.currentPage.selection = [n];
      figma.viewport.scrollAndZoomIntoView([n]);
      setTimeout(function () { muteSelection = false; }, 400); }
  }

  if (msg.type === "scan-report") {
    var sel = figma.currentPage.selection.filter(function (n) {
      return n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE";
    });
    if (!sel.length) { figma.ui.postMessage({ type: "scan-report", text: "Nothing selected." }); return; }
    var f = await readFrame(sel[0]);
    var lines = [];
    lines.push("FRAME  " + f.name + "   " + f.w + "x" + f.h);
    lines.push("");
    lines.push("read as".padEnd(11) + "layer name".padEnd(30) + "size".padEnd(11)
      + "sib".padEnd(5) + "parts".padEnd(7) + "svg".padEnd(6) + "flags");
    f.els.forEach(function (e) {
      var fl = Object.keys(e.f).filter(function (k) { return e.f[k]; }).join(" ");
      lines.push(
        e.t.padEnd(11) +
        e.n.slice(0, 28).padEnd(30) +
        (e.w + "x" + e.h).padEnd(11) +
        String(e.sib).padEnd(5) +
        String(e.parts).padEnd(7) +
        (e.svg ? "yes" : "no").padEnd(6) +
        fl);
    });
    figma.ui.postMessage({ type: "scan-report", text: lines.join("\n") });
  }

  if (msg.type === "close") figma.closePlugin();
};
