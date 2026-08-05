/* tokens.js — Qi motion tokens, plus the easing curves measured from the
   animated icons in the Qi library. Change a value here and every pattern
   and verb that uses it picks it up. Do not edit anything outside src/data. */

window.DUR = {
  "stagger-tight":      { ms:60,  u:"Sibling offset in a layout. Rows, chips, cards." },
  "stagger-parts":      { ms:220, u:"Sub-part offset inside one icon. Measured from the watch rings and the target." },
  "duration-instant":   { ms:100, u:"Anything finger-caused. Micro-feedback such as a button press." },
  "duration-fast":      { ms:200, u:"Small elements. Chips, row entrances, icon swaps." },
  "duration-moderate":  { ms:300, u:"Larger surfaces, roughly half the phone width or a third of its height and up." },
  "duration-slow":      { ms:500, u:"A single element carrying a stage on its own, where slowness reads as composure." },
  "duration-deliberate":{ ms:700, u:"Unused so far. Guidelines will come as more journeys are delighted." },
  "duration-icon":      { ms:800, u:"An icon completing its full gesture. Measured from the success check." },
  "duration-loop":      { ms:2200,u:"One cycle of a continuous icon. Every animated icon in the library uses this." }
};

window.EAS = {
  "ease-out":    { c:"cubic-bezier(0,0,.58,1)",   d:"Entrances. Decelerates into place. The default." },
  "ease-in":     { c:"cubic-bezier(.42,0,1,1)",   d:"Exits. Accelerates away." },
  "ease-in-out": { c:"cubic-bezier(.42,0,.58,1)", d:"Motion that both starts and ends on screen." },
  "linear":      { c:"cubic-bezier(0,0,1,1)",     d:"Non-physical motion only. Nothing with mass moves at a constant speed." },
  "ease-settle": { c:"cubic-bezier(.34,1.4,.64,1)", d:"Arrival. Something coming to rest after being placed." },

  /* Measured from the animated icons. These are the curves the library
     already uses, so an icon built with them matches what exists. */
  "ease-arrive": { c:"cubic-bezier(.34,1.3,.64,1)",  d:"Gentle overshoot. The gift box lid and the main coin." },
  "ease-pop":    { c:"cubic-bezier(.4,1.75,.3,1)",   d:"Strong overshoot. The success circle scaling from nothing." },
  "ease-trim":   { c:"cubic-bezier(.45,1.45,.8,1)",  d:"Path drawing. The success check stroking on." },
  "ease-beat":   { c:"cubic-bezier(.5,0,.5,1)",      d:"Symmetrical. Both halves of a heartbeat." },
  "ease-expo":   { c:"cubic-bezier(.22,1,.36,1)",    d:"Fast out, long tail. Particles leaving and settling." }
};
