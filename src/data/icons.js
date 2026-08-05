/* icons.js — animated components already in the Qi library.
   key is the Figma component key, from the component's share link.
   The plugin imports it with figma.importComponentByKeyAsync(key).

   REPLACE THESE KEYS with the real ones before anyone relies on this. */

window.LIB_ICONS = [
  { match:/check|tick|success|complete/i, name:"Success Check", key:"qi-ic-success-anim",
    note:"Strokes in over 300ms. Carries its own motion as an animated component." },
  { match:/spinner|loader|loading|sheen/i, name:"Loading Indicator", key:"qi-ic-loading-anim",
    note:"Continuous. Already handles reduced motion." },
  { match:/star|sparkle|shine/i, name:"Assistant Sparkle", key:"qi-ic-sparkle-anim",
    note:"Brand sparkle for assistant moments." },
  { match:/heart|pulse|vitality/i, name:"Vitality Pulse", key:"qi-ic-pulse-anim",
    note:"Slow pulse for health and wellness." },
  { match:/error|warning|alert/i, name:"Alert", key:"qi-ic-alert-anim",
    note:"Single shake, no loop." }
];
function libFor(n){ for(var i=0;i<LIB_ICONS.length;i++) if(LIB_ICONS[i].match.test(n)) return LIB_ICONS[i]; return null; }
