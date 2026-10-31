# The London Bookhounds

A campaign book for a *Trail of Cthulhu* (2nd edition) game set in the *Bookhounds of London* setting, 1936. It is a single web page styled as a 1930s novella: cream paper, Caslon-style type, red rubric, ink-and-cream photographs. Players use it at the table: character sheets, clues, a dice "telegraph", maps used as gaming mats.

Hosted on **GitHub Pages** (this repository, branch `main`, root). Shared data lives in **Firebase Firestore**. There is no build step: what is in the repository is what is served.

## Files

- `index.html`: all markup, CSS and the main script.
- `runtime.js`: a small runtime. `window.dash` loads `data/*.json` and runs drawings; `window.claude.use('db')` is a Firestore adapter; `window.claude.use('user')` gives each browser an anonymous id. On first contact with an empty database it seeds `pcs` and `clues` from `data/pcs_seed.json` and `data/clues_seed.json`, and creates `config/investigators`.
- `firebase-config.js`: the Firebase web config (public by design; the rules are the protection).
- `firestore.rules`: a tightened rule set kept here for reference. **The rules actually published in Firebase are still the original open ones** (anyone can read and write). Do not assume the file matches what is live.
- `data/`: fixed content (`episodes`, `persons`, `places`, `tomes`, `shop`) and the starting `pcs_seed` / `clues_seed`.
- `assets/`: portraits, plates, map, clips (named by hash; referenced from `index.html` and `data/`).
- `vendor/d3.min.js`: d3 v7, used for the map zoom and a few helpers.

## How the page works

- Drawings: `dash.draw('name', fn)` registers a function that fills every element with `data-draw="name"`; `dash.draw('name')` reruns it. Data comes from `dash.data('id')` → `{ status, data }`. Keep changing text inside drawings; set it with `textContent`.
- Shared record (Firestore) collections: `pcs` (sheets, one doc per investigator), `clues` (text, chapter, order, status open/closed/cold), `rolls` (telegram log), `register` (borrower's register entries), `mats/{london|premises}` (mat on/off) and `mats/*/tokens` (counters), `data/users/{uid}/reader` and `book-folds` (per-browser), `config/investigators` (`ids`, max 10). `prose` is a legacy collection that is no longer read.
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
