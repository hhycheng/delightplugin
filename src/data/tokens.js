/* tokens.js
   Motion token values. Matches the Qi transition skill.
   qi:true  means the value is ratified in Qi.
   qi:false means this framework defines it and Qi has not adopted it yet.
   To change a duration or easing, change it here only. */

window.TOKENS = {
  "stagger-tight":       { ms: 60,  qi: false, use: "Sibling offset only. Never across a vertical hierarchy." },
  "duration-instant":    { ms: 100, qi: true,  use: "Anything finger-caused." },
  "duration-fast":       { ms: 200, qi: true,  use: "Chips, rows, icon swaps." },
  "duration-moderate":   { ms: 300, qi: true,  use: "Half the phone width and up." },
  "duration-slow":       { ms: 500, qi: true,  use: "One element carrying a stage alone." },
  "duration-deliberate": { ms: 700, qi: true,  use: "Not used in any pattern yet." },

  "easing-in-out": { cubic: "cubic-bezier(.42,0,.58,1)",  qi: true,  use: "Qi default. Starts and ends on screen." },
  "easing-out":    { cubic: "cubic-bezier(0,0,.58,1)",    qi: true,  use: "Entrances." },
  "easing-in":     { cubic: "cubic-bezier(.42,0,1,1)",    qi: true,  use: "Exits." },
  "easing-linear": { cubic: "linear",                     qi: true,  use: "Non-physical motion only." },
  "easing-settle": { cubic: "cubic-bezier(.34,1.4,.64,1)", qi: false, use: "Arrival coming to rest. Overshoots once." }
};
