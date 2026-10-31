# The London Bookhounds

A self-contained web page for the campaign. GitHub Pages serves the page; Firebase Firestore stores everything players change (character sheets, clues, telegrams, the borrower's register and gaming-mat counters).

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The book itself |
| `runtime.js` | Loads the book's data and connects it to Firebase |
| `firebase-config.js` | **The one file you edit**: your Firebase settings |
| `firestore.rules` | Database rules (currently: anyone can read and write) |
| `data/` | The book's fixed contents: narrative, persons, places, tomes, shop, and the starting sheets and clues |
| `assets/` | Portraits, plates, map and clips |
| `vendor/d3.min.js` | A drawing library the book uses |

## 1. Create the Firebase database

1. Go to https://console.firebase.google.com and click **Add project**. Name it (e.g. `london-bookhounds`). Google Analytics is not needed.
2. In the left menu: **Build → Firestore Database → Create database**. Pick a location near your players (e.g. `europe-west2`, London). Choose **Start in production mode**.
3. Open the **Rules** tab, replace everything with the contents of `firestore.rules` from this folder, and click **Publish**.
4. Go to **Project settings** (gear icon) → **General** → **Your apps** → click the **</>** (Web) icon. Give it a nickname, leave Firebase Hosting unticked, and click **Register app**.
5. Firebase shows a `firebaseConfig = { ... }` block. Copy the values into `firebase-config.js` in this folder, replacing the placeholders.

## 2. Put it on GitHub Pages

1. Create a new repository on GitHub (e.g. `london-bookhounds`).
2. Upload everything in this folder to it (drag the files and folders into **Add file → Upload files**), keeping the folder structure.
3. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute GitHub shows the address, like `https://yourname.github.io/london-bookhounds/`.

## 3. Let Firebase accept the site

In Firebase: **Authentication → Settings → Authorized domains → Add domain** and add `yourname.github.io`. (Firestore works without this, but adding it now saves trouble if you add proper sign-in later.)

## 4. First visit

Open the address. The first time the page reaches an empty database it copies in the three character sheets and the twelve clues. After that, everything is live: edits, stamps, telegrams and counters appear for everyone at once.

Sign the register with `copperpot`, `devereaux`, `guzzy`, `yog-sothoth` (Keeper) or `bookhound`.

## Things to know

- **The database is open.** Anyone with the address can read and change everything. That is what you asked for to start with. When you want to tighten it, the next step is Firebase Authentication with real passwords; ask Claude to add it.
- **The repository is public** on a free GitHub account, so anyone can see the files, including the images and `firebase-config.js`. The Firebase settings are designed to be public; the rules are what protect the data.
- **Changing fixed content** (narrative, persons, places, tomes) means editing the files in `data/` or `index.html` and uploading them again. Sheets and clues are edited in the page itself.
- **Testing on your own computer:** opening `index.html` directly from disk will not work (browsers block it). Run a tiny local server in this folder, e.g. `python3 -m http.server`, then open http://localhost:8000. For a private test database, Firebase's Emulator Suite runs Firestore on your own machine.
