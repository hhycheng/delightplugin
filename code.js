// code.js — runs in the Figma sandbox. No network access here.
// Talks to ui.html by postMessage only.

figma.showUI(__html__, { width: 340, height: 640, themeColors: true });

var CURRENCY = /(HK\$|US\$|SGD|RMB|\$|USD|HKD)\s?[\d,]|\b\d{1,3}(,\d{3})+(\.\d{2})?\b/;
var MONEY_NAME = /amount|payout|total|premium|price|cost|balance|sum|fee/i;

// ---------------------------------------------------------------- read frames

function topFrames() {
  var sel = figma.currentPage.selection;
  var out = [];
  sel.forEach(function (node) {
    if (node.type === "SECTION" || node.type === "GROUP") {
      node.children.forEach(function (c) {
        if (c.type === "FRAME" || c.type === "COMPONENT") out.push(c);
      });
    } else if (node.type === "FRAME" || node.type === "COMPONENT") {
      out.push(node);
    }
  });
  return out;
}

// Rough element type from the node, its name, and its shape.
function classify(node) {
  var n = node.name.toLowerCase();
  if (/button|cta|btn|submit|confirm|next|book now/.test(n)) return "button";
  if (node.type === "TEXT") return "text";
  if (/icon|ic-|check|tick|spinner|loader|star|sparkle/.test(n)) return "icon";
  if (node.type === "VECTOR" || node.type === "BOOLEAN_OPERATION") return "icon";
  if (/image|photo|avatar|thumbnail|map|banner/.test(n)) return "image";
  if (/row|item|cell|list item|card/.test(n)) return "row";
  if (/chip|tag|pill|prompt/.test(n)) return "chip";
  return "container";
}

// Strip trailing numbers so "Row 1" and "Row 2" count as the same thing.
function stem(name) {
  return name.toLowerCase().replace(/[\s_-]*\d+$/, "").trim();
}

function flagsFor(node, type, textSample) {
  var n = node.name.toLowerCase();
  return {
    tap: type === "button",
    money: (type === "text") && (MONEY_NAME.test(n) || CURRENCY.test(textSample || "")),
    loading: /spinner|loader|loading|progress|thinking|sheen|pulse/.test(n),
    streaming: /response|answer|message|typing|stream/.test(n),
    completes: /check|tick|success|done|complete/.test(n),
    leaves: /completed|past|previous|dismiss|old/.test(n),
    confirms: /thumbnail|attachment|upload|receipt|preview/.test(n),
    late: /follow|feedback|next step|helpful|rate/.test(n)
  };
}

// Direct children only. Going deeper produces noise, not insight.
function readElements(frame) {
  var kids = ("children" in frame) ? frame.children : [];
  var counts = {};
  kids.forEach(function (k) {
    var s = stem(k.name);
    counts[s] = (counts[s] || 0) + 1;
  });

  return kids
    .filter(function (k) { return k.visible !== false; })
    .map(function (k) {
      var type = classify(k);
      var sample = (k.type === "TEXT" && typeof k.characters === "string")
        ? k.characters.slice(0, 60) : "";
      return {
        id: k.id,
        n: k.name,
        t: type,
        w: Math.round("width" in k ? k.width : 0),
        h: Math.round("height" in k ? k.height : 0),
        sib: counts[stem(k.name)] || 1,
        flags: flagsFor(k, type, sample)
      };
    });
}

function sendSelection() {
  var frames = topFrames();
  var seen = {};
  var payload = frames.map(function (f, i) {
    var dup = seen[f.name] = (seen[f.name] || 0) + 1;
    return {
      id: f.id,
      name: f.name,
      order: i,
      duplicate: dup > 1,     // ui uses this to disambiguate by position
      w: Math.round(f.width),
      h: Math.round(f.height),
      els: readElements(f)
    };
  });
  figma.ui.postMessage({ type: "selection", frames: payload });
}

var muteSelection = false;
figma.on("selectionchange", function () {
  if (muteSelection) return;   // our own annotation placement, not a user action
  sendSelection();
});

// ---------------------------------------------------------------- annotations

var LABEL_W = 260;

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
  if (!frame) { figma.notify("That frame is gone."); return; }

  var card = figma.createFrame();
  card.name = "Delight Motion — " + frame.name;
  card.resize(LABEL_W, 100);
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
    if (!text) { var sp = figma.createFrame(); sp.resize(LABEL_W - 28, 6);
      sp.fills = []; sp.layoutAlign = "STRETCH"; card.appendChild(sp); return sp; }
    var t = figma.createText();
    t.fontName = { family: FAM, style: bold ? BOLD : "Regular" };
    t.characters = text;
    t.fontSize = size;
    t.lineHeight = { unit: "PERCENT", value: 150 };
    t.layoutAlign = "STRETCH";
    t.textAutoResize = "HEIGHT";
    if (grey) t.fills = [{ type: "SOLID", color: { r: .45, g: .45, b: .45 } }];
    card.appendChild(t);
    return t;
  }

  line(job.stage + (job.lead ? "  ·  loudest in journey" : ""), 10, false, true);
  line(frame.name, 14, true, false);

  job.items.forEach(function (it) {
    line("", 0, false, false);
    line(it.element + "  —  " + it.pattern, 11, true, false);
    line(it.detail, 10, false, true);
    if (it.tokens) line(it.tokens, 9, false, true);
  });

  var parent = frame.parent || figma.currentPage;
  muteSelection = true;
  parent.appendChild(card);
  figma.viewport.scrollAndZoomIntoView([frame, card]);
  setTimeout(function () { muteSelection = false; }, 400);
  figma.notify("Annotations placed next to " + frame.name);
}

// ---------------------------------------------------------------- key storage

figma.ui.onmessage = async function (msg) {
  if (msg.type === "ready") {
    var key = await figma.clientStorage.getAsync("anthropic_key");
    figma.ui.postMessage({ type: "key", key: key || "" });
    sendSelection();
  }
  if (msg.type === "save-key") {
    await figma.clientStorage.setAsync("anthropic_key", msg.key || "");
  }
  if (msg.type === "annotate") {
    try {
      await annotate(msg.job);
      figma.ui.postMessage({ type: "annotated", ok: true });
    } catch (e) {
      figma.notify("Could not place annotations: " + e.message);
      figma.ui.postMessage({ type: "annotated", ok: false, msg: e.message });
    }
  }
  if (msg.type === "focus" && msg.id) {
    var n = await figma.getNodeByIdAsync(msg.id);
    if (n) { figma.currentPage.selection = [n]; figma.viewport.scrollAndZoomIntoView([n]); }
  }
  if (msg.type === "close") figma.closePlugin();
};
