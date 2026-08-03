/* patterns.js
   Motion patterns. Journey-agnostic: nothing here names a screen or a journey.
   To add a pattern, copy a block and change it. Do not touch any .js outside src/data.

   Each pattern needs:
     name     display name
     tokens   token ids from tokens.js
     dials    the four dials, written as concrete values not adjectives
     plain    what happens, start state to end state
     why      one line per motion principle. Leave "" for neutral.
     never    the guardrail. Leave "" if none applies.
*/

window.PATTERNS = {
  "surface-rise": { name:"Surface Rise", tokens:["duration-moderate","easing-out"],
    curve: {
      quiet: { Amplitude:"Enters from below the edge, travels its own height", Duration:"300ms", ms:300 },
      mid:   { Amplitude:"Enters from below the edge, travels its own height", Duration:"300ms", ms:300 },
      peak:  { Amplitude:"Enters from below the edge, travels its own height", Duration:"500ms", ms:500,
               note:"Slower at the peak so the surface lands with weight." } },
    dials:{ Amplitude:"Enters from below the screen edge, travels its own height", Duration:"300ms",
            Character:"Ease-out, decelerating into place", Choreography:"The whole surface and its contents move as one" },
    plain:"Starts fully below the bottom edge, slides up until its top edge reaches its resting position, and stops without bouncing.",
    why:{ nat:"A large surface takes the longer duration, so it reads as having weight.",
          fun:"Sliding says the panel sits on top and can be dismissed back down.", exp:"" },
    never:"Two surfaces of similar size must use the same timing." },

  "cascade": { name:"Cascade", tokens:["duration-fast","easing-out","stagger-tight"],
    curve: {
      quiet: { Amplitude:"Each item rises 8px and fades from 0 to 100%", Duration:"200ms per item",
               Choreography:"Each item starts 40ms after the one above it", ms:200, stagger:40,
               note:"Tighter and shorter, because this stage should not pull focus." },
      mid:   { Amplitude:"Each item rises 12px and fades from 0 to 100%", Duration:"200ms per item",
               Choreography:"Each item starts 60ms after the one above it", ms:200, stagger:60 },
      peak:  { Amplitude:"Each item rises 16px and fades from 0 to 100%", Duration:"300ms per item",
               Choreography:"Each item starts 80ms after the one above it", ms:300, stagger:80,
               note:"Wider offset at the peak so the order of the verdict is legible." } },
    dials:{ Amplitude:"Each item rises 12px and fades from 0 to 100%", Duration:"200ms per item",
            Character:"Ease-out, decelerating into place", Choreography:"Each item starts 60ms after the one above it" },
    plain:"Items start 12px below their resting position at 0% opacity. Each one rises into place and fades in, 60ms apart, top to bottom.",
    why:{ nat:"", fun:"The offset makes them read as separate items, so people can scan while it is still arriving.",
          exp:"A short offset reads as composure. A long one shows off." },
    never:"Only stagger siblings. Never a parent and its children." },

  "settle": { name:"Settle", tokens:["duration-moderate","easing-settle"],
    curve: {
      quiet: { Amplitude:"Scales from 96% to 101% to 100%", Duration:"200ms", ms:200,
               note:"Barely overshoots. At a quiet stage this is acknowledgement, not celebration." },
      mid:   { Amplitude:"Scales from 92% to 104% to 100%", Duration:"300ms", ms:300 },
      peak:  { Amplitude:"Scales from 90% to 106% to 100%", Duration:"300ms", ms:300,
               note:"The fullest overshoot in the system. Once per journey." } },
    dials:{ Amplitude:"Scales from 92% to 104% to 100%", Duration:"300ms",
            Character:"Ease-settle, overshoots once then rests", Choreography:"One element on its own" },
    plain:"Starts at 92% scale, grows past full size to 104%, then eases back to 100%. Opacity stays at 100% throughout.",
    why:{ nat:"Mimics a physical object settling after being placed.",
          fun:"Confirms something worked at the moment of doubt, without a status line.",
          exp:"Reads as a breath released. Reassurance, not celebration." },
    never:"Never on anything that failed. The overshoot reads as pleased." },

  "container-transform": { name:"Container Transform", tokens:["duration-fast","easing-out"],
    curve: {
      quiet: { Amplitude:"Moves and resizes between two fixed positions", Duration:"200ms", ms:200 },
      mid:   { Amplitude:"Moves and resizes between two fixed positions", Duration:"200ms", ms:200 },
      peak:  { Amplitude:"Moves and resizes between two fixed positions", Duration:"300ms", ms:300,
               note:"Slightly slower at the peak so the transformation is followable." } },
    dials:{ Amplitude:"Moves and resizes between two fixed positions", Duration:"200ms",
            Character:"Ease-out, decelerating into place", Choreography:"Container and contents move together" },
    plain:"The element travels from its start position and size to its end position and size in one continuous move. It stays at 100% opacity the entire time.",
    why:{ nat:"Nothing appears from nowhere.",
          fun:"People track it as the same object. Fading out and in says it was replaced.", exp:"" },
    never:"Never fade out and fade in as a shortcut." },

  "single-rise": { name:"Single Rise", tokens:["duration-slow","easing-out"],
    curve: {
      quiet: { Amplitude:"Rises 10px and fades from 0 to 100%", Duration:"300ms", ms:300,
               note:"Shortened. A 500ms rise in a quiet stage reads as lag, not composure." },
      mid:   { Amplitude:"Rises 16px and fades from 0 to 100%", Duration:"500ms", ms:500 },
      peak:  { Amplitude:"Rises 24px and fades from 0 to 100%", Duration:"500ms", ms:500,
               note:"The longest single move in the journey." } },
    dials:{ Amplitude:"Rises 16px and fades from 0 to 100%", Duration:"500ms",
            Character:"Ease-out, decelerating into place", Choreography:"One element, nothing else moving" },
    plain:"Starts 16px below its resting position at 0% opacity, then rises and fades in over half a second while the rest of the screen stays still.",
    why:{ nat:"Slow and decelerating is how something heavy comes to rest.", fun:"",
          exp:"Slow reads as composure. The same timing later in a journey reads as lag." },
    never:"Once per journey only." },

  "tap-response": { name:"Tap Response", tokens:["duration-instant","easing-out"],
    curveFixed: "Never changes with the curve. Response to touch is a constant, not a volume.",
    dials:{ Amplitude:"Scales from 100% to 97% on press, back to 100% on release", Duration:"100ms each way",
            Character:"Ease-out", Choreography:"One element on its own" },
    plain:"On finger down it shrinks to 97%. On finger up it returns to 100%. No opacity change, no movement.",
    why:{ nat:"", fun:"Anything caused by a finger must answer immediately. Delay reads as the app not hearing you.", exp:"" },
    never:"Never slower than 100ms." },

  "progressive-reveal": { name:"Progressive Reveal", tokens:["duration-fast","easing-linear"],
    curveFixed: "Never changes with the curve. Reading speed is not a stylistic choice.",
    dials:{ Amplitude:"Each phrase fades from 0 to 100%, no movement", Duration:"200ms per phrase",
            Character:"Linear, constant speed", Choreography:"Phrase by phrase, in reading order" },
    plain:"Text arrives in phrases, not letters. Each phrase fades in over 200ms with no movement, in the order it would be read.",
    why:{ nat:"", fun:"Matches reading speed and doubles as loading feedback.", exp:"" },
    never:"Never letter by letter." },

  "ambient-loop": { name:"Ambient Loop", tokens:["easing-linear"],
    curveFixed: "Never changes with the curve. Waiting reads the same wherever it happens.",
    dials:{ Amplitude:"A highlight sweeps across the full width", Duration:"2200ms per cycle, repeating",
            Character:"Linear, constant speed", Choreography:"One element at a time" },
    plain:"A soft highlight travels from the left edge to the right edge of the active item and repeats. Nothing moves position or changes size.",
    why:{ nat:"Linear only. Nothing with weight moves at a constant speed.",
          fun:"Shows what is live now, without claiming to know how long is left.",
          exp:"Keep the cycle slow. Fast reads as frantic." },
    never:"Never fake progress." },

  "stroke-in": { name:"Stroke In", tokens:["duration-moderate","easing-out"],
    curveFixed: "Never changes with the curve. A completion mark is a fact, not a flourish.",
    dials:{ Amplitude:"The path draws from 0% to 100% of its length", Duration:"300ms",
            Character:"Ease-out, decelerating to the end of the stroke", Choreography:"One path, drawn once" },
    plain:"The line starts invisible and draws itself from its start point to its end point over 300ms. Nothing scales or moves.",
    why:{ nat:"Drawing follows the shape, so it reads as being made rather than switched on.",
          fun:"Takes just long enough to be noticed at the moment something completes.", exp:"" },
    never:"" },

  "recede": { name:"Recede", tokens:["duration-fast","easing-in"],
    curve: {
      quiet: { Amplitude:"Drops 6px and fades from 100% to 50%", Duration:"200ms", ms:200 },
      mid:   { Amplitude:"Drops 8px and fades from 100% to 40%", Duration:"200ms", ms:200 },
      peak:  { Amplitude:"Drops 8px and fades from 100% to 40%", Duration:"200ms", ms:200,
               note:"Unchanged at the peak. Things leaving should never compete with the moment." } },
    dials:{ Amplitude:"Drops 8px and fades from 100% to 40%", Duration:"200ms",
            Character:"Ease-in, accelerating away", Choreography:"Each item 60ms after the one before" },
    plain:"Finished items drop 8px and fade to 40% opacity. They stay on screen at reduced weight rather than disappearing.",
    why:{ nat:"Accelerating away is how something leaves.",
          fun:"Moves attention onto what is next without deleting the history.", exp:"" },
    never:"Never remove it entirely if the user might check it." },

  "none": { name:"No Motion", tokens:[],
    dials:{ Amplitude:"None", Duration:"None", Character:"None", Choreography:"None" },
    plain:"This element holds still while the rest of the moment moves.",
    why:{ nat:"", fun:"Stillness is what makes the moving parts readable.",
          exp:"Silence here is deliberate, not an oversight." },
    never:"" }
};
