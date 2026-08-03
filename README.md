# Delight Motion

A Figma plugin that recommends motion for a journey, using the AIA Qi motion tokens.

Select the frames in a journey, tell it which journey it is, and it maps each frame
to a stage on the delight curve. Pick a stage and it generates a motion recommendation
for every element in it, with tokens, a preview, the reasoning, and a prompt you can
paste into Figma Make.

---

## Running it

1. Open the Figma **desktop** app. Plugins can only be developed from desktop.
2. `Plugins > Development > Import plugin from manifest...`
3. Pick `manifest.json` in this folder.
4. Select some frames, then `Plugins > Development > Delight Motion`.

If you change anything in `src/`, run `node build.js` and then reload the plugin
in Figma with `Cmd/Ctrl + Alt + P`.

---

## To add a motion pattern

Open **`src/data/patterns.js`**. Copy an existing block and change it.

```js
"my-pattern": {
  name: "My Pattern",
  tokens: ["duration-fast", "easing-out"],
  dials: {
    Amplitude:    "Rises 12px and fades from 0 to 100%",
    Duration:     "200ms",
    Character:    "Ease-out, decelerating into place",
    Choreography: "One element on its own"
  },
  plain: "Starts 12px below its resting position at 0% opacity, then rises into place.",
  why: {
    nat: "Why it feels like a real object. Leave \"\" if not relevant.",
    fun: "What information it carries.",
    exp: "What tone it sets."
  },
  never: "The one thing not to do with it. Leave \"\" if none."
}
```

Rules for writing a pattern:

- **Amplitude is a number, not an adjective.** "Rises 12px", not "a nudge".
- **`plain` describes start state to end state**, and says what stays fixed.
- **Leave a `why` empty rather than inventing one.** The panel shows
  "Neutral by design" and that is a real answer.
- Every value in `tokens` must exist in `src/data/tokens.js`.
- **Optional `curve`** gives the pattern quiet / mid / peak variants. Any dial you
  list overrides the base one. `ms` and `stagger` set the real numbers used by the
  preview and the prompt. Add a `note` explaining why that band differs.
- **Optional `curveFixed`** marks a pattern that should never vary, with the reason.
  Use it deliberately. Silence about the curve is worse than a stated exception.

Then run `node build.js`.

---

## To change a token value

Open **`src/data/tokens.js`**. Change the number in one place. Every pattern using
that token picks it up.

```js
"duration-moderate": { ms: 300, qi: true, use: "Half the phone width and up." }
```

`qi: true` means Qi has ratified the value. `qi: false` means this framework
defines it and Qi has not adopted it yet, and the panel shows a small `new` badge.
When Qi adopts one, flip the flag.

Two values are currently `qi: false`: `stagger-tight` and `easing-settle`.

---

## To add a journey

Open **`src/data/journeys.js`**.

```js
myJourney: {
  name: "What it is called in the dropdown",
  stages: [
    { id: "Welcome", h: .74, plain: "What happens here",
      match: ["welcome", "intro", "start"] },
    { id: "Ask",     h: .12, plain: "The user gives information",
      match: ["input", "form", "keyboard"] },
    { id: "Confirm", h: 1,   plain: "The user commits", lead: true,
      match: ["confirm", "success", "done"] }
  ]
}
```

- `h` is relative motion volume, 0 to 1, **relative within this journey only**.
- Shape: open moderately high, drop to the quietest point while the user is
  working, rise to one peak where they commit. No tail after the peak.
- `lead: true` marks the peak. Exactly one stage per journey.
- `match` are words that suggest a frame belongs to that stage. Used when there
  is no API key.

---

## To update the animated icon list

Open **`src/data/icons.js`**. The five entries there are **placeholders**.
Replace `icon` with the real component names from the Qi icon library.

When a layer name matches, the plugin tells the designer to use the existing
icon instead of specifying an animation to build.

---

## Frame naming

Stage mapping reads frame names. Numbered, specific names work:

```
01 Welcome          03 Upload receipt          06 Confirmation
```

Names that repeat do not. A file with nine frames called `Book doctor`
cannot be ordered by name, and the plugin will mark them **Guessed**.
Either number them, or add a Claude key so ordering and context can be used.

You can also untick any frame on the setup screen. Do that for filter panels,
component variants and alternate branches, which are not journey steps.

---

## The API key

Optional. Without one the plugin works, matching frames by name.
With one, Claude does the mapping, which is much better when names repeat.

Get a key at platform.claude.com, under API keys. It is stored with
`figma.clientStorage`, on that machine only. It is never written into the
plugin files and never shared with anyone else who installs it.

Only journey names, stage names and frame names are sent. Frame contents are not.

Cost is roughly $0.0014 per mapping on `claude-haiku-4-5-20251001`.
New accounts get free credits, enough for a few thousand runs.

---

## File map

```
manifest.json          Figma plugin config. Declares api.anthropic.com.
code.js                Runs in the Figma sandbox. Reads the selection,
                       writes annotation frames, stores the key. No network.
build.js               Stitches src/ into dist/ui.html. Run: node build.js

src/
  ui.template.html     Panel shell.
  ui.css               Styling.
  ui.js                Views, state, messaging.
  engine.js            The rules. Which pattern for which element.
  claude.js            The only file that calls a model.
  data/
    patterns.js        <- add a motion here
    tokens.js          <- change a duration or easing here
    journeys.js        <- add a journey here
    icons.js           <- real icon names go here

dist/ui.html           Generated. Do not edit by hand.
```

`dist/ui.html` is **generated**, not a duplicate. Figma inlines `ui.html` into the
plugin bundle, so it cannot load `ui.js` or `ui.css` at runtime. `build.js` stitches
them together. Edit `src/`, run `node build.js`, never edit `dist/`.

**Everything a designer needs to change lives in `src/data/`.**
If you find yourself editing `engine.js` or `ui.js` to change the framework,
something has gone wrong in the data model instead.

---

## How it decides

Three layers. Only the first uses a model.

1. **Stage mapping.** Frame names and order in, one stage per frame out.
   Claude if there is a key, keyword matching if not. Constrained to stages the
   journey file defines. **You review this before anything else runs.**

2. **Element classification.** No model. Reads each layer's type, width, height,
   and how many siblings share its name. Flags buttons, currency text, icons,
   loading states, completion states.

3. **Pattern selection, then curve tuning.** An ordered rule list in `engine.js` picks
   the pattern, first match wins. Then the stage decides the band, and the band sets
   the dial values.
   Money never moves. Taps get 100ms. Icons already in the library return the
   icon instead of a pattern. Two or more siblings cascade. Over 90% frame width
   enters as a surface.

   **The element picks the pattern. The curve picks the dial.** A cascade at a quiet
   stage rises 8px with a 40ms offset. The same cascade at the peak rises 16px with
   an 80ms offset. Four patterns deliberately ignore the curve, because response to
   touch, waiting, reading speed and completion marks are constants, not volumes.
   Those are marked `curveFixed` in `patterns.js` with the reason.

Rationale and tokens are looked up from the data files. Prompts are string
templates. Nothing is generated freely.

---

## Not built yet

- **Check mode.** Linting animation that already exists. Needs the prototype
  reactions API, which is a bigger job than it looks.
- **Writing Smart Animate timing** onto prototype transitions directly.
- **A key proxy** so nobody handles a key. About 20 lines on a Cloudflare Worker
  or Vercel function. Worth doing before this goes past one or two people.
