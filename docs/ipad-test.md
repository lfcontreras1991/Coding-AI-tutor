# Tablet test log

Device: iPad mini (6th generation), iPadOS 27.2, Safari, landscape, touch only.
Learner: a toddler, with an adult beside them.

## Day 0: stock editor, no code (done)

Opened the public Blockflow build with `?locale=es-419`. The learner dragged blocks from
the palette, snapped two together, nested one inside "por siempre", deleted one, picked a
dropdown option, edited a number and pressed the flag.

Result: dragging was acceptable. Decision: go ahead with the Blockflow fork.

## Day 1: own build served from the home PC (done)

Result: the full editor and the audio page both work properly on the tablet. Sound that
is fetched after the single "Empezar" tap plays without a new tap. The rows below were
not reported one by one.

Start the server on the PC with `npm run serve` and open the "On Wi-Fi" address it prints.

## Day 2: voice comparison (to do)

Open `/pruebas/voces.html` on the tablet. Each phrase can be played with every installed
Piper voice (synthesized on the PC) and with the tablet's own Spanish voice, at normal or
slow speed. Listen with the learner and note which voice is clearest and most pleasant.

| Voice | Clear? | Pleasant? | Notes |
|---|---|---|---|
| es_MX-claude-high | | | |
| es_MX-ald-medium | | | |
| es_AR-daniela-high | | | |
| Tablet voice | | | |

Result so far: the tablet's own voice is the best. Its pace is easy to follow and it is
clear even on harder words such as "bucle". Decision: use the tablet voice
(`speechSynthesis`) for the tutor; Piper stays as a fallback.

Still to check, with the "Hablar en 3 segundos" button: the tablet voice must also speak
from a timer, with no new tap, because hints arrive a few seconds after the button press.

| Check | Result |
|---|---|
| Tablet voice speaks 3 s after one tap | |
| Same on the very first tap after loading the page | |
| Same with silent mode on | |
| Voice name shown under the speed selector | |

Measured on the PC: a new phrase takes 2 to 5 s to synthesize because the voice model is
loaded on every request; a cached phrase is served in about 0.2 s. Fixed lesson prompts are
therefore instant after their first use. Live hints will need Piper kept loaded in memory.

## Day 1 checklists

### Editor

Opens the full editor: every block category, the sprite, costume and sound libraries,
extensions and all tabs. Nothing is hidden, so the learner can keep exploring.

| Check | Result |
|---|---|
| Page loads in Spanish | |
| All block categories are in the palette | |
| Adding a sprite from the library works | |
| Costumes and sounds tabs open and work | |
| Build flag + "por siempre" + "ir a (puntero del ratón)" and run it: sprite follows the finger | |
| Same after "Add to Home Screen" | |

A restricted variant (three blocks, larger workspace blocks, small stage) stays available
for comparison by adding `&project=/lessons/prueba/project.json` to the address.

### Audio (`/pruebas/audio.html`)

One tap on "Empezar", then a sound that is fetched 2 s later must play with no new tap.

| Check | Result |
|---|---|
| Plays after one tap, silent mode off | |
| "Otra vez" plays again (timer-started, no direct tap) | |
| Silent mode on, "playback" box unticked | |
| Silent mode on, "playback" box ticked | |
| Still plays after 1 minute idle | |
| Still plays after switching to another app and back | |
