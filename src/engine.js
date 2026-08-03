/* engine.js
   The rules engine. No model calls happen here.

   Two jobs:
     pickPattern(element, stage)  ->  which pattern, and why
     mapByName(frames, journey)   ->  which stage each frame belongs to,
                                       used when there is no API key

   Rule order matters. First match wins. To change behaviour, reorder or edit
   the rules in pickPattern. Every rule returns a `note` explaining itself,
   which is what the designer reads. If you add a rule, write the note too. */

(function () {

  var FRAME_W = 375;   // reference phone width
  var FRAME_H = 812;   // reference phone height

  function iconMatch(name) {
    for (var i = 0; i < window.ANIMATED_ICONS.length; i++) {
      if (window.ANIMATED_ICONS[i].match.test(name)) return window.ANIMATED_ICONS[i];
    }
    return null;
  }

  function pickPattern(el, stage) {
    var f = el.flags || {};
    var quiet = stage.h < .35;
    var wide = el.w / FRAME_W;
    var tall = el.h / FRAME_H;

    // 1. Never animate money. Silent rule, no lecture in the output.
    if (f.money)
      return { id: "none", note: "Held still so the figures stay steady while the rest of the moment moves." };

    // 2. Finger-caused always answers instantly.
    if (f.tap)
      return { id: "tap-response", note: "Finger-caused, so it answers instantly." };

    // 3. Already animated in the icon library. Use it, do not rebuild it.
    var ic = (el.t === "icon") ? iconMatch(el.n) : null;
    if (ic)
      return { id: f.loading ? "ambient-loop" : "stroke-in", lib: ic,
               note: "An animated icon for this already exists in the library." };

    // 4. Work in progress.
    if (f.loading)
      return { id: "ambient-loop", note: "Shows what is live without guessing how long is left." };
    if (f.streaming)
      return { id: "progressive-reveal", note: "Text arriving at reading speed." };

    // 5. Completion and departure.
    if (f.completes)
      return { id: "stroke-in", note: "Marks the moment something finishes." };
    if (f.leaves)
      return { id: "recede", note: "Moves attention off what is done." };

    // 6. Siblings cascade. Read from how many layers share a name stem.
    if (el.sib >= 2)
      return { id: "cascade", note: el.sib + " layers at this level share a name, so they read as a list." };

    // 7. Size decides whether it is a surface or an element.
    if (wide >= .9 || tall >= .3)
      return { id: "surface-rise", note: "Covers most of the screen, so it enters as a surface." };

    // 8. Confirmations settle.
    if (f.confirms)
      return { id: "settle", note: quiet
        ? "Confirms an upload. Overshoot stays minimal because this stage is quiet."
        : "Confirms an upload at the point of doubt." };

    // 9. One thing alone on a loud stage can take the slow duration.
    if (stage.lead && el.sib === 1 && wide > .5)
      return { id: "single-rise", note: "Carries the peak of the journey on its own." };

    if (f.late)
      return { id: "recede", note: "Arrives last, after the outcome has landed." };

    // 10. Default.
    return { id: "container-transform", note: "Changes form without leaving the screen." };
  }

  /* Which band of the curve this stage sits in. This is what stops every
     recommendation looking the same: the pattern is chosen by the element,
     but its dials are set by where the stage sits. */
  function bandOf(stage) {
    if (stage.lead || stage.h >= .8) return "peak";
    if (stage.h < .35) return "quiet";
    return "mid";
  }

  /* Returns the pattern with its dials resolved for this stage. */
  function resolve(pid, stage) {
    var base = window.PATTERNS[pid];
    var band = bandOf(stage);
    if (!base.curve || !base.curve[band]) {
      return { name: base.name, plain: base.plain, tokens: base.tokens, why: base.why,
               never: base.never, dials: base.dials, band: band,
               tuned: false, tuneNote: base.curveFixed || "", ms: null, stagger: null };
    }
    var c = base.curve[band];
    var dials = {};
    Object.keys(base.dials).forEach(function (k) { dials[k] = (k in c) ? c[k] : base.dials[k]; });
    return { name: base.name, plain: base.plain, tokens: base.tokens, why: base.why,
             never: base.never, dials: dials, band: band,
             tuned: true, tuneNote: c.note || "", ms: c.ms || null, stagger: c.stagger || null };
  }

  function annotate(frame, stage) {
    return frame.els.map(function (el) {
      var r = pickPattern(el, stage);
      return { el: el, pid: r.id, p: resolve(r.id, stage), note: r.note, lib: r.lib || null };
    });
  }

  /* Name matching. Used when there is no API key, and as the fallback
     if a model call fails. Duplicate names are resolved by position. */
  function mapByName(frames, journey) {
    var stages = journey.stages;
    var nameCount = {};
    frames.forEach(function (f) { nameCount[f.name] = (nameCount[f.name] || 0) + 1; });

    return frames.map(function (f, i) {
      var n = f.name.toLowerCase();
      var hit = null;

      // exact stage id in the name wins
      stages.forEach(function (s) {
        if (!hit && n.indexOf(s.id.toLowerCase()) > -1) hit = s;
      });
      // then the journey's own keyword list
      if (!hit) {
        stages.forEach(function (s) {
          if (hit || !s.match) return;
          for (var k = 0; k < s.match.length; k++) {
            if (n.indexOf(s.match[k]) > -1) { hit = s; return; }
          }
        });
      }

      // A name that appears more than once cannot be trusted on its own.
      var repeated = nameCount[f.name] > 1;
      if (hit && !repeated)
        return { i: i, stage: hit.id, sure: true, why: "the frame name matches this stage" };
      if (hit && repeated)
        return { i: i, stage: hit.id, sure: false,
                 why: nameCount[f.name] + " frames share this name, so position was used to break the tie" };

      var g = stages[Math.min(Math.floor(i / frames.length * stages.length), stages.length - 1)];
      return { i: i, stage: g.id, sure: false, why: "guessed from position, the name says nothing" };
    });
  }

  window.ENGINE = {
    bandOf: bandOf,
    resolve: resolve,
    pickPattern: pickPattern,
    annotate: annotate,
    mapByName: mapByName,
    iconMatch: iconMatch
  };

})();
