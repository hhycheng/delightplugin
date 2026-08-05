/* found.js — notes triggered by what is actually on the frame, as opposed
   to the constant per-stage rules in stages.js. Each has a test that reads
   the frame, a title, and a description. */

window.FOUND = [
  { test:function(f){ return f.els.some(function(e){ return e.t==="icon" && libFor(e.n); }); },
    t:"An animated icon in the library covers one of these",
    d:"Insert the component instead of building the motion. It carries its own timing, so it stays in step if the library changes." },
  { test:function(f){ return f.els.some(function(e){ return e.sib>=3; }); },
    t:"There is a repeating group here",
    d:"Rows at the same level can arrive in sequence with stagger-tight. Never stagger a parent and its children." },
  { test:function(f){ return f.els.some(function(e){ return e.f.loading; }); },
    t:"Something is already looping",
    d:"Use linear. Nothing with mass moves at a constant speed, so a loop reads as non-physical." },
  { test:function(f){ return f.els.some(function(e){ return e.w>=360 || e.h>=280; }); },
    t:"A large surface enters here",
    d:"Roughly half the phone width or a third of its height and up takes duration-moderate." },
  { test:function(f){ return f.els.some(function(e){ return e.f.tap; }); },
    t:"There is a tap target here",
    d:"Anything finger-caused answers at duration-instant. This one never changes with the stage." }
];
