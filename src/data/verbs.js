/* verbs.js — motion for icons.
   Every verb here was measured from an animated icon that already exists in
   the Qi library. The values are not invented: they are what the heart, the
   watch, the target, the coin box, the confetti, the check and the search
   icon actually do.

   Two things these icons establish that layout motion does not:

   1. Icon motion is COMPOUND. The success check pops a circle, then trims a
      path inside it. The watch trims three rings in sequence. A single
      unbroken movement is the exception, not the rule.
   2. Icon motion LOOPS. Every one runs on a 2200ms cycle with the gesture in
      the first half and the rest held still. That hold is what stops a loop
      reading as frantic.

   Fields:
     parts   the sequence. Each entry is one sub-part doing one thing.
     track   the Figma Motion property track for applyManualKeyframeTrack
     at      when this part starts, in ms from the top of the cycle
     ms      how long this part takes
     from/to the values, as they appear in the real icon
     needs   validated against the exported SVG before anything is shown
     loops   true if the gesture repeats on duration-loop
     seenIn  which library icon this was measured from */

window.VERBS = {

  "beat": {
    name: "Beat", purpose: "floating objects", seenIn: "Heart",
    plain: "Two pulses, a strong one then a softer one, like a heartbeat.",
    tokens: ["duration-loop", "ease-beat"], loops: true, ms: 550, e: "ease-beat",
    parts: [
      { part: "whole", track: "SCALE", at: 0,   ms: 120, from: 1,    to: 1.22 },
      { part: "whole", track: "SCALE", at: 120, ms: 130, from: 1.22, to: 1 },
      { part: "whole", track: "SCALE", at: 250, ms: 110, from: 1,    to: 1.15 },
      { part: "whole", track: "SCALE", at: 360, ms: 190, from: 1.15, to: 1 }
    ],
    v: { a:2, d:2, c:2, o:1 }, needs: null,
    never: "Two beats, then hold. A continuous throb reads as an alarm.",
    tests: { nat: "Two beats of different strength is how a heart actually moves. One even pulse is not.",
             fun: "Marks something as live without moving it out of place.",
             exp: "Right for health and wellness. Too literal anywhere else." } },

  "trim": {
    name: "Trim", purpose: "masking", seenIn: "Success check, Smart watch",
    plain: "The stroke draws itself from nothing to its full length.",
    tokens: ["duration-icon", "ease-trim"], loops: false, ms: 600, e: "ease-trim",
    parts: [
      { part: "path", track: "PATH_LENGTH", at: 0, ms: 600, from: 0, to: 1 }
    ],
    v: { a:2, d:3, c:2, o:1 }, needs: "stroke",
    never: "Only on a stroked path. A filled shape has nothing to draw.",
    tests: { nat: "Drawing follows the shape, so it reads as being made rather than switched on.",
             fun: "Takes long enough to be noticed at the moment something completes.", exp: "" } },

  "trim-sequence": {
    name: "Trim In Sequence", purpose: "masking", seenIn: "Smart watch rings",
    plain: "Several strokes draw one after another, 240ms apart.",
    tokens: ["duration-icon", "ease-trim", "stagger-parts"], loops: true, ms: 900, e: "ease-trim", st: 240,
    parts: [
      { part: "path 1", track: "PATH_LENGTH", at: 0,   ms: 900, from: 0, to: 1 },
      { part: "path 2", track: "PATH_LENGTH", at: 240, ms: 900, from: 0, to: 1 },
      { part: "path 3", track: "PATH_LENGTH", at: 480, ms: 900, from: 0, to: 1 }
    ],
    v: { a:2, d:3, c:2, o:3 }, needs: ["stroke","second-part"],
    never: "The offset between strokes stays even. Uneven spacing reads as a stutter.",
    tests: { nat: "", fun: "Sequence makes several readings legible as separate values rather than one graphic.",
             exp: "The offset is what gives it life. Simultaneous would read as a static chart." } },

  "pop": {
    name: "Pop In", purpose: "feedback", seenIn: "Success check circle, Coin",
    plain: "Scales up from nothing, overshoots well past full size, then settles.",
    tokens: ["duration-icon", "ease-pop"], loops: false, ms: 800, e: "ease-pop",
    parts: [
      { part: "whole", track: "SCALE", at: 0, ms: 800, from: 0, to: 1 }
    ],
    v: { a:3, d:3, c:3, o:1 }, needs: null,
    never: "Once per journey. It is the loudest thing a single icon can do.",
    tests: { nat: "An object arriving with real momentum and being absorbed.",
             fun: "", exp: "The fullest expression available to one icon." } },

  "pop-then-trim": {
    name: "Pop Then Trim", purpose: "feedback", seenIn: "Success check",
    plain: "The container pops in, then the mark inside draws itself on.",
    tokens: ["duration-icon", "ease-pop", "ease-trim"], loops: false, ms: 1000, e: "ease-pop",
    parts: [
      { part: "container", track: "SCALE",       at: 0,   ms: 800, from: 0, to: 1, e: "ease-pop" },
      { part: "mark",      track: "PATH_LENGTH", at: 400, ms: 600, from: 0, to: 1, e: "ease-trim" }
    ],
    v: { a:3, d:3, c:3, o:2 }, needs: ["stroke","second-part"],
    never: "The mark starts before the container has settled. Waiting for it reads as hesitation.",
    tests: { nat: "The container arrives and the mark is written into it, in the order it would happen.",
             fun: "The overlap keeps it one gesture rather than two.",
             exp: "The strongest confirmation in the library. Confirm stages only." } },

  "pop-sequence": {
    name: "Pop In Sequence", purpose: "feedback", seenIn: "Target",
    plain: "Sub-parts pop in one after another, from the outside in.",
    tokens: ["duration-fast", "ease-arrive", "stagger-parts"], loops: true, ms: 200, e: "ease-arrive", st: 220,
    parts: [
      { part: "part 1", track: "SCALE", at: 0,   ms: 200, from: 1, to: 1.12 },
      { part: "part 2", track: "SCALE", at: 220, ms: 200, from: 1, to: 1.12 },
      { part: "part 3", track: "SCALE", at: 440, ms: 200, from: 1, to: 1.12 }
    ],
    v: { a:2, d:2, c:3, o:3 }, needs: "second-part",
    never: "Keep the order meaningful. Outside in, or bottom up. Random order reads as noise.",
    tests: { nat: "Each part answering in turn reads as one thing settling, not several things twitching.",
             fun: "The order can carry meaning: outside in draws the eye to the centre.", exp: "" } },

  "lift": {
    name: "Lift", purpose: "transformation", seenIn: "Gift box lid, Trumpet",
    plain: "Rises and tips slightly while scaling up, then comes back to rest.",
    tokens: ["duration-icon", "ease-arrive"], loops: true, ms: 450, e: "ease-arrive",
    parts: [
      { part: "lid", track: "TRANSLATION_Y", at: 0,   ms: 300, from: 0,    to: -9 },
      { part: "lid", track: "ROTATION",      at: 0,   ms: 300, from: -15,  to: 9 },
      { part: "lid", track: "SCALE",         at: 0,   ms: 300, from: 0.85, to: 1.06 },
      { part: "lid", track: "TRANSLATION_Y", at: 300, ms: 150, from: -9,   to: 0 }
    ],
    v: { a:3, d:3, c:3, o:2 }, needs: "second-part", onlyIn: ["reward"],
    never: "The lid comes back down. One that stays open is a state, not a gesture.",
    tests: { nat: "Something being opened: it lifts, tips, and falls back.",
             fun: "", exp: "Reserved for reward moments. Too playful for a claim." } },

  "emit": {
    name: "Emit", purpose: "cloning", seenIn: "Coin burst, Confetti",
    plain: "Small pieces travel out along curved paths, scaling up then fading as they go.",
    tokens: ["duration-loop", "ease-expo", "stagger-parts"], loops: true, ms: 1200, e: "ease-expo", st: 90,
    parts: [
      { part: "piece", track: "SCALE",   at: 0,   ms: 300, from: 0,    to: 1.15 },
      { part: "piece", track: "OPACITY", at: 50,  ms: 100, from: 0,    to: 1 },
      { part: "piece", track: "SCALE",   at: 300, ms: 900, from: 1.15, to: 0.6 },
      { part: "piece", track: "OPACITY", at: 700, ms: 500, from: 1,    to: 0 }
    ],
    v: { a:3, d:3, c:2, o:3 }, needs: "second-part", onlyIn: ["reward"],
    never: "Pieces fade before they leave the frame. Anything reaching the edge reads as debris.",
    tests: { nat: "Each piece scales up as it starts and shrinks as it goes, the way something thrown recedes.",
             fun: "", exp: "The loudest thing in the library. Rewards only, never a claim or a policy." } },

  "orbit": {
    name: "Orbit", purpose: "floating objects", seenIn: "Search",
    plain: "Drifts in a small continuous circle, never stopping.",
    tokens: ["duration-loop", "linear"], loops: true, ms: 2200, e: "linear",
    parts: [
      { part: "whole", track: "TRANSLATION_X", at: 0, ms: 2200, from: -4, to: 4 },
      { part: "whole", track: "TRANSLATION_Y", at: 0, ms: 2200, from: -4, to: 4 }
    ],
    v: { a:1, d:2, c:1, o:1 }, needs: null,
    never: "Never faster than one turn per 2200ms. Faster reads as searching in a panic.",
    tests: { nat: "Linear only. A constant speed reads as non-physical, which is correct for a hint.",
             fun: "Shows something is looking, without claiming to know how long it will take.",
             exp: "The quietest continuous motion in the library." } },

  "settle": {
    name: "Settle", purpose: "feedback", seenIn: "Main coin, Trumpet",
    plain: "Scales up slightly past full size, then eases back.",
    tokens: ["duration-moderate", "ease-arrive"], loops: false, ms: 350, e: "ease-arrive",
    parts: [
      { part: "whole", track: "SCALE", at: 0, ms: 350, from: 0.92, to: 1 }
    ],
    v: { a:2, d:3, c:3, o:1 }, needs: null,
    never: "One overshoot only. A second bounce reads as a wobble.",
    tests: { nat: "Mimics a physical object coming to rest after being placed.",
             fun: "Confirms something worked at the exact moment of doubt.",
             exp: "Reassurance, not celebration." } },

  "fade": {
    name: "Fade", purpose: "enter & exit", seenIn: "",
    plain: "Fades from nothing to full, with no movement or scale.",
    tokens: ["duration-fast", "ease-in-out"], loops: false, ms: 200, e: "ease-in-out",
    parts: [
      { part: "whole", track: "OPACITY", at: 0, ms: 200, from: 0, to: 1 }
    ],
    v: { a:1, d:2, c:2, o:1 }, needs: null,
    never: "",
    tests: { nat: "", fun: "", exp: "For an icon that supports rather than announces." } }
};
