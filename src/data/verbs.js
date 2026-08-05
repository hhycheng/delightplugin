/* verbs.js — motion for icons.
   An icon's motion depends on what it depicts, which cannot be read from
   its size. These are the whole vocabulary. A model may pick one and name
   the sub-part it applies to. It never picks a duration, easing or token.

   track = the Figma Motion property track for applyManualKeyframeTrack.
   needs = validated against the exported SVG before anything is shown:
           "stroke"        the icon must have a stroked path
           "second-state"  a second icon must be picked to swap to
           "in-progress"   the moment must actually be loading */

window.VERBS = {
  "fade":   { name:"Fade", purpose:"enter & exit", track:"OPACITY",
    plain:"Fades from 0 to 100% with no movement.",
    tokens:["duration-fast","ease-in-out"], ms:200, e:"ease-in-out",
    v:{a:1,d:2,c:2,o:1}, needs:null, cont:false,
    never:"", tests:{ nat:"", fun:"", exp:"For an icon that supports rather than announces." } },

  "drift":  { name:"Drift In", purpose:"enter & exit", track:"TRANSLATION_Y",
    plain:"Enters 8px from one edge and fades in.",
    tokens:["duration-fast","ease-out"], ms:200, e:"ease-out",
    v:{a:2,d:2,c:2,o:1}, needs:null, cont:false,
    never:"One direction only. Do not combine with a rotation.",
    tests:{ nat:"", fun:"The direction can carry meaning: down from a header, up from a form.", exp:"" } },

  "draw":   { name:"Draw", purpose:"masking", track:"PATH_LENGTH",
    plain:"The path draws itself from 0 to 100% of its length.",
    tokens:["duration-moderate","ease-out"], ms:300, e:"ease-out",
    v:{a:2,d:3,c:2,o:1}, needs:"stroke", cont:false,
    never:"Only on a stroked path. A filled shape has nothing to draw.",
    tests:{ nat:"Drawing follows the shape, so it reads as being made rather than switched on.",
            fun:"Takes just long enough to be noticed at the moment something completes.", exp:"" } },

  "reveal": { name:"Reveal", purpose:"masking", track:"MASK_POSITION",
    plain:"A mask wipes across it, uncovering it in one direction.",
    tokens:["duration-moderate","ease-out"], ms:300, e:"ease-out",
    v:{a:2,d:3,c:2,o:1}, needs:null, cont:false,
    never:"One direction, one pass. Never a wipe back and forth.",
    tests:{ nat:"", fun:"Works on filled icons where Draw cannot, because there is no stroke to follow.", exp:"" } },

  "swap":   { name:"Swap", purpose:"container transform", track:"OPACITY",
    plain:"One icon becomes another, staying in place the whole way.",
    tokens:["duration-fast","ease-in-out"], ms:200, e:"ease-in-out",
    v:{a:2,d:2,c:2,o:2}, needs:"second-state", cont:false,
    never:"Never fade out to nothing and fade in. The two states overlap.",
    tests:{ nat:"", fun:"Keeps object permanence, so people read it as the same thing changing state.", exp:"" } },

  "rotate": { name:"Rotate", purpose:"feedback", track:"ROTATION",
    plain:"Rotates into position and settles at rest.",
    tokens:["duration-moderate","ease-settle"], ms:300, e:"ease-settle",
    v:{a:2,d:3,c:3,o:1}, needs:null, cont:false,
    never:"One rotation only. A full turn reads as loading, not as arrival.",
    tests:{ nat:"The overshoot reads as momentum being absorbed, not as a bounce.",
            fun:"", exp:"Carries more personality than a fade without becoming playful." } },

  "pop":    { name:"Pop", purpose:"feedback", track:"SCALE",
    plain:"Scales up past full size, then eases back to 100%.",
    tokens:["duration-moderate","ease-settle"], ms:300, e:"ease-settle",
    v:{a:3,d:3,c:3,o:1}, needs:null, cont:false,
    never:"Once per journey. It is the loudest thing an icon can do.",
    tests:{ nat:"An object arriving and coming to rest, the way something set down behaves.",
            fun:"", exp:"The fullest expression available to a single icon." } },

  "sheen":  { name:"Sheen", purpose:"loading", track:"MASK_POSITION",
    plain:"A soft highlight sweeps across it and repeats every 2200ms.",
    tokens:["linear"], ms:2200, e:"linear",
    v:{a:2,d:2,c:1,o:1}, needs:"in-progress", cont:true,
    never:"Never fake progress. It shows something is live, not how far along it is.",
    tests:{ nat:"Linear only. Nothing with mass moves at a constant speed.",
            fun:"Shows what is live now, without claiming to know how long is left.", exp:"" } },

  "pulse":  { name:"Pulse", purpose:"floating objects", track:"SCALE",
    plain:"Scales gently between 100% and 104% and back, repeating.",
    tokens:["linear"], ms:2200, e:"linear",
    v:{a:1,d:2,c:1,o:1}, needs:"in-progress", cont:true,
    never:"Keep the cycle slow. Fast reads as an alarm.",
    tests:{ nat:"", fun:"Marks something as live without moving it out of place.",
            exp:"Quieter than a sheen. Right for health and wellness contexts." } }
};
