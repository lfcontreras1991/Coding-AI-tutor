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
