/* icons.js
   Icons in the Qi library that are already animated.
   When a layer name matches, the plugin says "use this" instead of
   specifying an animation to build.

   IMPORTANT: these five are placeholders. Replace `icon` with the real
   component names from the Qi icon library before anyone relies on this. */

window.ANIMATED_ICONS = [
  { match: /check|tick|success|complete/i, icon: "ic-success-animated",
    note: "Draws itself in. Same timing as Stroke In." },
  { match: /spinner|loader|loading/i,      icon: "ic-loading-animated",
    note: "Continuous. Already handles reduced motion." },
  { match: /star|sparkle|shine/i,          icon: "ic-sparkle-animated",
    note: "Brand sparkle, for assistant moments." },
  { match: /heart|pulse|vitality/i,        icon: "ic-pulse-animated",
    note: "Slow pulse for health and wellness." },
  { match: /error|warning|alert/i,         icon: "ic-alert-animated",
    note: "Single shake, no loop." }
];
