/* claude.js
   The only file that calls a model. Everything else is deterministic.

   What is sent:  journey name, stage names and descriptions, frame names.
   What is not:   frame contents, text, images, layer data, customer data.

   If the call fails for any reason, the caller falls back to ENGINE.mapByName
   and the plugin keeps working. */

(function () {

  var MODEL = "claude-haiku-4-5-20251001";  // cheapest tier. This is classification.
  var URL = "https://api.anthropic.com/v1/messages";

  function buildPrompt(frames, journey, remarks) {
    return [
      "Map screens to stages of a journey in a mobile insurance app.",
      "",
      "Journey: " + journey.name,
      remarks ? "What the user is doing: " + remarks : "",
      "",
      "Stages, in order:",
      journey.stages.map(function (s) { return "- " + s.id + ": " + s.plain; }).join("\n"),
      "",
      "Screens, in the order the designer selected them:",
      frames.map(function (f, i) { return i + ". " + f.name; }).join("\n"),
      "",
      "Rules:",
      "- stage must be exactly one of the stage names above. Do not invent stages.",
      "- Several screens can share a stage.",
      "- If more than one screen has the same name, use its position to decide.",
      "- Set sure to false when the name is generic and you inferred from order alone.",
      "",
      'Return only a JSON array, no markdown and no preamble:',
      '[{"i":0,"stage":"Welcome","sure":true,"why":"short reason"}]'
    ].filter(Boolean).join("\n");
  }

  function mapStages(frames, journey, remarks, key) {
    return fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(frames, journey, remarks) }]
      })
    })
    .then(function (r) {
      if (!r.ok) throw new Error("status " + r.status);
      return r.json();
    })
    .then(function (d) {
      var text = d.content
        .filter(function (b) { return b.type === "text"; })
        .map(function (b) { return b.text; })
        .join("");
      var parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

      // Never trust a stage name the journey does not define.
      var valid = {};
      journey.stages.forEach(function (s) { valid[s.id] = true; });
      return parsed
        .filter(function (r) { return valid[r.stage]; })
        .map(function (r) {
          return { i: r.i, stage: r.stage, sure: !!r.sure,
                   why: r.why || "matched by Claude" };
        });
    });
  }

  function testKey(key) {
    return fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 8,
        messages: [{ role: "user", content: "ping" }] })
    })
    .then(function (r) {
      if (r.status === 401) return { ok: false, msg: "Key was rejected. Check it was copied in full." };
      if (r.status === 429) return { ok: false, msg: "Rate limited. The key works, try again shortly." };
      if (!r.ok) return { ok: false, msg: "Could not reach the API. Status " + r.status + "." };
      return { ok: true, msg: "Connected." };
    })
    .catch(function () {
      return { ok: false, msg: "No response. Check networkAccess in manifest.json." };
    });
  }

  window.CLAUDE = { mapStages: mapStages, testKey: testKey, model: MODEL };

})();
