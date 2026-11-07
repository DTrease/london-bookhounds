# The London Bookhounds

A campaign book for a *Trail of Cthulhu* (2nd edition) game set in the *Bookhounds of London* setting, 1936. It is a single web page styled as a 1930s novella: cream paper, Caslon-style type, red rubric, ink-and-cream photographs. Players use it at the table: character sheets, clues, a dice "telegraph", maps used as gaming mats.

Hosted on **GitHub Pages** (this repository, branch `main`, root). Shared data lives in **Firebase Firestore**. There is no build step: what is in the repository is what is served.

## Files

- `index.html`: all markup, CSS and the main script.
- `runtime.js`: a small runtime. `window.dash` loads `data/*.json` and runs drawings; `window.claude.use('db')` is a Firestore adapter; `window.claude.use('user')` gives each browser an anonymous id. On first contact with an empty database it seeds `pcs` and `clues` from `data/pcs_seed.json` and `data/clues_seed.json`, and creates `config/investigators`.
- `firebase-config.js`: the Firebase web config (public by design; the rules are the protection).
- `firestore.rules`: a rule set kept here for reference. **It does not match what is live.** The published rules only allow the collections listed under "Shared record" below; a read of any other collection (tested: `clues_prepared`, `drafts`, `keeper`) fails with permission-denied. So a new collection needs the Firebase rules changed first, which only David can do. Within the allowed collections anyone can still read and write; there is no real access control.
- `data/`: fixed content (`episodes`, `persons`, `places`, `tomes`, `shop`) and the starting `pcs_seed` / `clues_seed`.
- `assets/`: portraits, plates, map, clips (named by hash; referenced from `index.html` and `data/`).
- `vendor/d3.min.js`: d3 v7, used for the map zoom and a few helpers.

## How the page works

- Drawings: `dash.draw('name', fn)` registers a function that fills every element with `data-draw="name"`; `dash.draw('name')` reruns it. Data comes from `dash.data('id')` → `{ status, data }`. Keep changing text inside drawings; set it with `textContent`.
- Shared record (Firestore) collections: `pcs` (sheets, one doc per investigator), `clues` (text, chapter, order, status open/closed/cold, and an optional `detail`: a clue with `detail` is a "major clue", gets an entry in Appendix B and is linked to it from Appendix A), `rolls` (telegram log), `register` (borrower's register entries), `mats/{london|premises}` (mat on/off) and `mats/*/tokens` (counters), `data/users/{uid}/reader` and `book-folds` (per-browser), and in that same per-browser space the Keeper's **prepared clues** (docs with `kind: 'prepared-clue'`, `text`, `chapter`, `detail`, `order`; read only while the Keeper is signed in, so other readers never fetch them; revealing one copies it into `clues` and deletes the draft), `config/investigators` (`ids`, max 10). `prose` is a legacy collection that is no longer read.
- **Tactile clue cards.** A clue (in `clues` or a Keeper draft) may carry `card`, which gives it an entry in Appendix B where players can handle it. Cards are written ahead of time with David, then pasted into the Keeper's **Import clues** box (see `data/clue_example.json`; the "Load an example" button fills the box with it). **Never put unrevealed clues or their pictures in the repository: it is public.** Compile them into a JSON file kept outside the repo (David's private folder) and hand that over to be pasted. Format, checked by `nvCardClean` in `index.html`:
  `[{ "text": "…", "chapter": 1, "detail": "optional account for Appendix B", "card": { "front": { "image": DATAURL, "alt": "…", "caption": "…", "aspect": 1 }, "back": { "text": "…" }, "veil": { "type": "scratch", "style": "soot|dust|frost|ink" } or { "type": "lantern", "radius": 22 }, "spots": [{ "x": 50, "y": 50, "r": 9, "effect": ["pulse","glow","shake","flicker","image","flip"], "image": DATAURL (needed for "image"), "taps": 1, "text": "shown when found" }] } }]`. `taps` (1 to 10) is how many taps the spot needs before it answers; every tap must land on the spot and each must come within `within` seconds (default 2) of the one before, so a miss or a long pause starts the count again; earlier taps give only a tiny vibration and no sign. A card has a back (and the "turn" corner) **only if `back.text` is given**; do not add placeholder back text.
  **Keeper's notes.** A clue may also carry `"keeper": "notes for David"` (up to 4,000 characters; blank lines split paragraphs). **Include it only when David says a clue should have Keeper's notes.** It is read by `nvImportParse` into the draft; when the clue is revealed the notes are *not* copied into the shared `clues` list but written to the Keeper's private space as a `kind: 'clue-notes'` doc (`notes-<clueId>`, with `clueId`, `text`), and shown (open, in a dashed box) only on that clue's Appendix B entry for a signed-in Keeper. Players' copies never fetch them. `text` (up to 1,500 characters) is what a successful find says: it opens in a window over the page (paragraphs fade in one by one) and is then written into that clue's Appendix B entry, after the account, for everyone. A blank line starts a new paragraph, and a paragraph in capitals (such as an inscription) is set apart in small capitals. Which spots have been found is kept in the shared clue as `found` (a list of spot numbers, counted from 0): when one player finds something, every open copy shows the window and the entry updates; the Keeper has a "clear what was found" link to reset it. A Keeper's preview of a draft opens the window but records nothing. Only add an effect that visibly does something (there is deliberately no "spin the model" effect).
  Images are `data:image/(png|jpeg|webp|gif|svg+xml);base64,…` (or a file in `assets/`), each under about 650 KB and the whole card under about 900 KB, because shared-record entries are capped at 1 MB. Animated SVG, GIF and WebP all work as pictures. `x`, `y` and `r` are percentages of the picture; `veil` is optional; up to 8 spots. Nothing in a card is ever used as markup.
  **3D models.** A card may have `"model": { "mesh": { "v": "…", "i": "…" }, "look": "stone|bronze|jade|bone", "spin": true }` in place of `front.image` (`front.image` is then an optional poster; `aspect` defaults to 0.8). It is drawn by a small built-in WebGL viewer (no outside library): drag to turn, pinch or wheel to zoom, arrow keys when focused. `mesh` comes from `tools/stl2mesh.py` (pure Python, no packages): `python tools/stl2mesh.py in.stl out.json [cells [top_fraction top_cells]]`, where more cells means finer and bigger (110–130 suits a statuette, about 25k triangles and 300 KB). To keep a face sharp, give a finer grid for the top of the model, e.g. `90 0.76 450` (body at 90 cells, everything above 76% of the height at 450): about 58k triangles and 700 KB for the idol. Keep vertices under 65,535 and each of `v` and `i` under 600 KB of base64. In the viewer, shift-drag or right-drag (or two fingers) moves the model about, wheel or pinch zooms right in, and a double-click resets the view. Z is up in the STL. On a model, a spot is `{ "at": [x, y, z], "r": 0.1, "effect": [...], "text": "…" }` in the model's own space, where the longest side spans −1 to 1 and Y is up (so the underside of the base is about y = −1); a spot fires only when the visible surface of the model is tapped within `r` of `at`. The Keeper's preview lights the first spot so it can be found. **STL files and finished clue files stay in `assets_imported_by_david/`, which is excluded from git locally (`.git/info/exclude`) so it is never published; do not move them anywhere in the repo that is committed.**
- Subscriptions go through `nvLive(...)`, which resubscribes after drops. Platform access goes through `nvDB` / `nvUser` (time-limited). If the database is unreachable, sheets and clues fall back to the seed files.
- **Prose is edited in HTML**, in the `#book-text` block near the top of the markup (search for `BOOK TEXT`). Each block is `<p data-prose="key">text</p>`; keys are `preface`, `premises-1..3`, `episode:<id>`, `person:<name>`, `tome:<title>`. Change the text, never the keys. Plain text only.
- The **borrower's register** is the sign-in. Names (case-insensitive): `copperpot`, `devereaux`, `guzzy` (players: edit only their own sheet), `yog-sothoth` (Keeper: edit any sheet, remove clues, run the gaming mats), `bookhound` (read and roll only). It is a theme, not security; there are no passwords yet.
- Pages fold by clicking the running head; folded pages show as thin strips. The Contents page lists every page and links to it.

## Style and content rules

- Keep the look: paper `--paper`, ink `--ink`, rubric `--rubric`, type `--face`. New UI should use these variables and match existing components (boxes, small-caps labels, ruled lines). No new fonts or colours.
- Plain, natural English. Avoid slick or flowery phrasing. Some sentence fragments are fine, but avoid long runs of "He…, He…".
- Chapters are "Chapter One", "Chapter Two" (never "Chapter the First").
- The book is always *Caedis Urbi Verae Claves* in full (never "the Claves" or "the book" alone); roughly "True Keys of Slaughter for the City".
- Nodens is the god; his people are "the followers of Nodens" (never "the Nodens").
- Canon: Johnstone Dives bought the painting but could **not** buy the shop. Bob Carr and Ronaldo Phantassi are now NPCs. The Emissary's entry is just "Servant of Byatis".
- Do not quote the rulebooks word for word on the site (the repository and site are public). Summarise in your own words.

## Do not

- Do not use `innerHTML` with anything a user typed.
- Do not change `runtime.js`, the Firestore adapter, collection names or document shapes without saying so clearly: live player data depends on them.
- Do not add rulebook files, private notes or credentials to this repository.
- Do not open `index.html` straight from disk to test; it will not load its data.

## Testing

Run `python -m http.server` in this folder and open http://localhost:8000. Check the browser console (F12) for errors. Sign the register as `yog-sothoth` to see Keeper controls. Note that local testing uses the **live** Firebase database unless `firebase-config.js` is pointed elsewhere.

## Workflow

The owner (David) commits and pushes with GitHub Desktop, or asks you to. Use short, plain commit messages. There is also a development copy of this book in a claude.ai chat; it has its own separate data, so changes there and here must be kept in step by hand.
