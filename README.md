# Delight Motion

A Figma plugin that reads a frame, works out what kind of moment it is, and
suggests motion that fits — using the AIA Qi motion tokens.

Select a frame. It tells you the moment, what that means for motion here, and
gives every element a suggestion you can apply to the canvas as real Figma
Motion keyframes.

---

## Running it

1. Figma **desktop** app. Plugins can only be developed from desktop.
2. `Plugins > Development > Import plugin from manifest...`
3. Pick `manifest.json` in this folder.
4. Select a frame, then `Plugins > Development > Delight Motion`.

Changed something in `src/`? Run `node build.js`, then reload the plugin in
Figma with `Cmd/Ctrl + Alt + P`.

---

## The five moments

**Welcome · Find · Act · Confirm · Complete.** Journey-agnostic, so they apply
to a claim, a policy lookup or a booking equally.

They sit on a curve. Welcome and Confirm are both high — those are the moments
the interface is speaking rather than serving. Find is the trough, because
someone is working and motion interrupts them. The difference between Welcome
and Confirm is not volume, it is scarcity: Confirm gets `ease-settle` at full
amplitude once per journey.

The curve height gives each stage a **motion volume target**, and that target
is what orders the suggestions.

---

## How it decides

Four steps. Only the first can involve a model.

**1. Which moment is this?**
Points accumulate per stage from the frame name and its layers. A name match is
4 points, strong content evidence 3–4, weaker evidence 2. Highest wins, and it
is only treated as confident if it scores 5 or more *and* beats the runner-up by
3 or more. Below that the plugin asks. With an API key it asks Claude instead,
which can only answer with one of the five stage names.

**2. What can move here?**
Each element is classified — list, surface, text, icon, tap, loading, leaving —
and that decides which motions are even offered. Nothing invalid appears.

**3. Which one is suggested?**
Every motion scores its four dials: Amplitude 1–3, Duration 1–4, Character 1–3,
Choreography 1–3. They sum to a **motion volume**, 4 quietest to 13 loudest.
Options sort by how close they sit to the stage's target. Same element at a
different stage gets a different suggestion, and the curve is the reason.

**4. Apply.**
Writes real Figma Motion keyframes with `applyManualKeyframeTrack`. If the
Motion API is unavailable it falls back to placing the spec as a note beside
the frame, so nothing is lost.

---

## To add a motion

Layout motion goes in **`src/data/patterns.js`**. Icon motion goes in
**`src/data/verbs.js`**. Copy a block and change it.

```js
"my-motion": {
  name: "My Motion",
  kind: "single",                       // list, single, surface, text, icon, tap, loading, leaving
  plain: "Rises 12px and fades from 0 to 100%.",
  tokens: ["duration-fast","ease-out"],
  ms: 200, e: "ease-out",
  v: { a:2, d:2, c:2, o:1 },            // the four dial scores
  dials: {
    Amplitude:    "Rises 12px, fades 0 to 100%",
    Duration:     "200ms",
    Character:    "Ease-out, decelerating into place",
    Choreography: "One element on its own"
  },
  tests: {
    nat: "Why it behaves like a real object. Leave \"\" if not relevant.",
    fun: "What information it carries.",
    exp: "What tone it sets."
  },
  never: "The one thing not to do with it. Leave \"\" if none."
}
```

Rules:

- **Amplitude is a number, not an adjective.** "Rises 12px", never "a nudge".
- **`plain` gives start state to end state**, and says what stays fixed.
- **Leave a `tests` entry empty rather than inventing one.** The panel shows
  "Neutral by design" and that is a real answer.
- Every value in `tokens` must exist in `src/data/tokens.js`.
- Add it to the right `opts` list in `src/data/stages.js`, or it will never be
  offered.

Then run `node build.js`.

---

## To change a token value

**`src/data/tokens.js`**. One place. Everything using it picks it up.

```js
"duration-moderate": { ms: 300, u: "Larger surfaces, roughly half the phone width and up." }
```

---

## To change what is allowed at a stage

**`src/data/stages.js`**. Each stage has `can`, `cannot`, and `opts`.

`opts` lists which motions apply to each kind of element there. Order does not
matter — the engine sorts by distance from the stage's volume target.

`src/data/found.js` holds the conditional notes, the ones triggered by what is
actually on the frame rather than by the stage.

---

## Icons

Icons work differently, because an icon's motion depends on what it depicts and
that cannot be read from its size.

**If it is in the Qi animated library**, the plugin says so and offers to insert
the component. It carries its own motion, so it stays in step if the library
changes. The component keys are in **`src/data/icons.js`** — they are
**placeholders**. Replace them with real keys from each component's share link.

**If it is not**, the plugin offers verbs from `src/data/verbs.js`, filtered by
what the icon can actually support. `needs: "stroke"` checks the exported SVG
for a stroked path. `needs: "in-progress"` only allows looping motion where
something is genuinely loading. `needs: "second-state"` requires a second icon
to swap to.

Icon motion is judged on **Natural** first, and runs as one unbroken movement
on one property.

---

## The API key

Optional. Without one the plugin runs entirely on rules.

With one, Claude is asked two things and only two:

1. **Which moment is this**, when the rules are unsure. It can only answer with
   one of the five stage names; anything else is discarded.
2. **Which icon verb**, from the closed list in `verbs.js`. It sees the icon's
   exported outline. It never returns a duration, an easing or a token.

Get a key at platform.claude.com under API keys. It is stored with
`figma.clientStorage` on that machine only, never written into the plugin files.

**What is sent:** stage names, layer names and sizes, icon outlines.
**What is not:** text content, images, anything outside the selected frame.

Roughly $0.001 per read on `claude-haiku-4-5-20251001`. New accounts get free
credits, enough for a few thousand.

---

## File map

```
manifest.json      Figma config. Declares api.anthropic.com.
code.js            Figma sandbox. Reads the frame, exports icon SVGs,
                   writes Motion keyframes. No network access.
build.js           Stitches src/ into dist/ui.html. Run: node build.js

src/
  ui.template.html Panel shell
  ui.css           Styling
  ui.js            Views, state, messaging
  engine.js        All the rules. Diagnosis, curve, volume, options.
  claude.js        The only file that calls a model
  data/
    patterns.js    <- layout motion
    verbs.js       <- icon motion
    tokens.js      <- durations and easings
    stages.js      <- the five moments and what is allowed at each
    found.js       <- notes triggered by frame contents
    icons.js       <- animated components in the Qi library

dist/ui.html       GENERATED. Do not edit. Run build.js instead.
```

**Everything a designer needs to change lives in `src/data/`.** If you find
yourself editing `engine.js` or `ui.js` to change the framework, the data model
is missing something instead.

---

## Known gaps

- **Motion API is in beta** and subject to change. If it moves, `keyframesFor`
  in `engine.js` and `applyMotion` in `code.js` are the two places to fix.
- **Icon library keys are placeholders.** Replace before anyone relies on them.
- **Swap needs a second-icon picker.** The verb exists and is documented, but
  nothing lets a designer point at the icon being swapped to, so it never fires.
- **The calibration constants are provisional.** `VOL_FLOOR` and `VOL_SPAN` in
  `engine.js` map the curve onto the volume range, and the diagnosis weights
  were tuned against a handful of frames. The architecture is settled; the
  numbers want testing against real files.
- **Check mode** — linting motion that already exists — is not built. The
  Motion API can read keyframes back, so it is now possible.
