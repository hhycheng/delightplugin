/* claude.js — the only file in this plugin that calls a model.
   Everything else is rules. If this file were deleted the plugin still
   works; every call below falls back to the deterministic path.

   What is sent:  stage names and descriptions, layer names, sizes, and for
                  icons the exported SVG outline.
   What is not:   text content, images, customer data, anything from
                  outside the selected frame.

   The model may only return values from a closed list. Anything else is
   discarded and the rules run instead. */

(function () {
"use strict";

var MODEL = "claude-haiku-4-5-20251001";   // classification against a fixed list
var URL = "https://api.anthropic.com/v1/messages";

function call(key, body) {
  return fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify(Object.assign({ model: MODEL, max_tokens: 700 }, body))
  })
  .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r.json(); })
  .then(function (d) {
    var text = d.content.filter(function (b) { return b.type === "text"; })
                        .map(function (b) { return b.text; }).join("");
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  });
}

/* ------------------------------------------------------------ stage read
   Used only when the rules are unsure, or when the frame name contradicts
   what is on the frame. Returns one of the five stages, or nothing. */
function readStage(frame, stages, key) {
  var facts = frame.els.map(function (e) {
    var f = [];
    if (e.f.tap) f.push("tappable");
    if (e.f.loading) f.push("looping");
    if (e.f.completes) f.push("completion mark");
    if (e.sib > 1) f.push(e.sib + " siblings");
    return "- " + e.n + " (" + e.t + ", " + e.w + "x" + e.h + (f.length ? ", " + f.join(", ") : "") + ")";
  }).join("\n");

  var prompt = [
    "Decide which stage of a user journey a screen in a mobile insurance app belongs to.",
    "",
    "Stages:",
    Object.keys(stages).map(function (k) { return "- " + k + ": " + stages[k].plain; }).join("\n"),
    "",
    "Frame name: " + frame.name,
    "Layers on it:",
    facts,
    "",
    "The frame name can be misleading. Weigh what is actually on the frame more heavily.",
    "stage must be exactly one of the names above. Do not invent one.",
    "",
    'Return only JSON: {"stage":"Confirm","why":"one short sentence, sentence case, ending in a full stop."}'
  ].join("\n");

  return call(key, { messages: [{ role: "user", content: prompt }] })
    .then(function (r) {
      if (!r || !stages[r.stage]) return null;         // discard anything invented
      return { stage: r.stage, why: String(r.why || "").slice(0, 200) };
    })
    .catch(function () { return null; });
}

/* ------------------------------------------------------------- icon verb
   An icon's motion depends on what it depicts, which cannot be read from
   its size. The model sees the outline and picks one verb from the list.
   It never returns a duration, an easing or a token. */
function readIcon(el, allowedVerbs, verbs, key) {
  if (!el.svg) return Promise.resolve(null);

  var list = allowedVerbs.map(function (v) {
    return "- " + v + ": " + verbs[v].plain;
  }).join("\n");

  var prompt = [
    "Here is the outline of an icon from a mobile insurance app, as SVG.",
    "Layer name: " + el.n,
    "",
    el.svg.slice(0, 4000),
    "",
    "Choose the one motion below that best suits what this icon depicts.",
    list,
    "",
    "Rules:",
    "- verb must be exactly one of the ids above.",
    "- subject must name a part that exists in the SVG, or be empty.",
    "- One unbroken movement, one property. Never combine two.",
    "- Do not give a duration, an easing, or a number of milliseconds.",
    "",
    'Return only JSON: {"verb":"rotate","subject":"the shackle","what":"one short sentence."}'
  ].join("\n");

  return call(key, { messages: [{ role: "user", content: prompt }] })
    .then(function (r) {
      if (!r || allowedVerbs.indexOf(r.verb) === -1) return null;   // not in the list
      var subject = String(r.subject || "");
      if (subject && el.svg.toLowerCase().indexOf(subject.replace(/^the\s+/i, "").toLowerCase()) === -1) {
        subject = "";                                              // named a part that is not there
      }
      return { verb: r.verb, subject: subject, what: String(r.what || "").slice(0, 200) };
    })
    .catch(function () { return null; });
}

/* --------------------------------------------------------------- key test */
function testKey(key) {
  return fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 8, messages: [{ role: "user", content: "ping" }] })
  })
  .then(function (r) {
    if (r.status === 401) return { ok: false, msg: "Key was rejected. Check it was copied in full." };
    if (r.status === 429) return { ok: false, msg: "Rate limited. The key works, try again shortly." };
    if (!r.ok) return { ok: false, msg: "Could not reach the API. Status " + r.status + "." };
    return { ok: true, msg: "Connected." };
  })
  .catch(function () { return { ok: false, msg: "No response. Check networkAccess in manifest.json." }; });
}

window.CLAUDE = { readStage: readStage, readIcon: readIcon, testKey: testKey, model: MODEL };

})();
