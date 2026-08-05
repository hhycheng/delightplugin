/* tokens.js — Qi motion tokens. Change a value here and every pattern
   and verb that uses it picks it up. Do not edit anything outside src/data. */

window.DUR = {
  "stagger-tight":      { ms:60,  u:"Sibling offset only, never across a vertical hierarchy." },
  "duration-instant":   { ms:100, u:"Anything finger-caused. Micro-feedback such as a button press." },
  "duration-fast":      { ms:200, u:"Small elements. Chips, row entrances, icon swaps." },
  "duration-moderate":  { ms:300, u:"Larger surfaces, roughly half the phone width or a third of its height and up." },
  "duration-slow":      { ms:500, u:"A single element carrying a stage on its own, where slowness reads as composure." },
  "duration-deliberate":{ ms:700, u:"Unused so far. Guidelines will come as more journeys are delighted." }
};

window.EAS = {
  "ease-out":    { c:"cubic-bezier(0,0,.58,1)",   d:"Entrances. Decelerates into place. The default." },
  "ease-in":     { c:"cubic-bezier(.42,0,1,1)",   d:"Exits. Accelerates away." },
  "ease-in-out": { c:"cubic-bezier(.42,0,.58,1)", d:"Motion that both starts and ends on screen." },
  "linear":      { c:"cubic-bezier(0,0,1,1)",     d:"Non-physical motion only. Nothing with mass moves at a constant speed." },
  "ease-settle": { c:"cubic-bezier(.34,1.4,.64,1)",
                   d:"Arrival. Something coming to rest after being placed." }
};
function tokVal(t){ return DUR[t] ? DUR[t].ms + "ms" : EAS[t] ? EAS[t].c : ""; }
