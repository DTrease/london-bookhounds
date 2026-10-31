/* The London Bookhounds: the small runtime that lets the book run on its own web page.
   - window.dash: loads the book's data files and runs its drawings
   - window.claude.use('db'): the shared record, kept in Firebase Firestore
   - window.claude.use('user'): an anonymous id for this browser (remembers who signed the register) */
(function () {
  const DATASETS = ['episodes', 'persons', 'places', 'tomes', 'shop', 'pcs_seed', 'clues_seed'];
  const store = {}, draws = {}, calcs = {}, params = {};
  let started = false;
  const runOne = (name) => {
    const fn = draws[name];
    if (!fn) return;
    document.querySelectorAll('[data-draw]').forEach((el) => {
      if (el.getAttribute('data-draw') !== name) return;
      try { fn(el); } catch (e) { console.error('[book] drawing failed:', name, e); }
    });
  };
  const runAll = () => Object.keys(draws).forEach(runOne);
  const dataOf = (id) => {
    const c = calcs[id];
    if (c) {
      const ins = c.inputs.map(dataOf);
      if (ins.some((d) => d.status === 'error')) return { status: 'error', data: [] };
      if (ins.some((d) => d.status !== 'ok')) return { status: 'loading', data: [] };
      try { return { status: 'ok', data: c.fn(...ins.map((d) => d.data)) }; } catch (e) { console.error('[book] calc failed:', id, e); return { status: 'error', data: [] }; }
    }
    return store[id] || { status: 'loading', data: [] };
  };
  window.dash = {
    draw(name, fn) { if (typeof fn === 'function') { draws[name] = fn; if (started) runOne(name); } else runOne(name); },
    data: dataOf,
    calc(id, spec) { calcs[id] = spec; },
    params() { return params; },
    setParams(p) { Object.assign(params, p); runAll(); },
    onData() {}
  };
  document.addEventListener('DOMContentLoaded', () => {
    started = true;
    runAll();
    DATASETS.forEach((id) => {
      fetch('data/' + id + '.json', { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then((rows) => { store[id] = { status: 'ok', data: rows }; runAll(); })
        .catch((e) => { console.error('[book] could not load data/' + id + '.json', e); store[id] = { status: 'error', data: [] }; runAll(); });
    });
  });

  // ---------- the shared record, in Firebase Firestore ----------
  const FIREBASE = '10.12.2';
  let dbPromise = null;
  const firebaseDB = () => dbPromise || (dbPromise = (async () => {
    const cfg = window.BOOK_FIREBASE_CONFIG;
    if (!cfg || !cfg.projectId || /^PASTE/.test(String(cfg.apiKey || ''))) {
      console.warn('[book] firebase-config.js is not filled in, so the book runs without the shared record.');
      return null;
    }
    const app = await import(`https://www.gstatic.com/firebasejs/${FIREBASE}/firebase-app.js`);
    const fs = await import(`https://www.gstatic.com/firebasejs/${FIREBASE}/firebase-firestore.js`);
    const db = fs.getFirestore(app.initializeApp(cfg));
    const docSnap = (s) => ({ id: s.id, exists: s.exists(), data: () => s.data() });
    const querySnap = (s) => ({ empty: s.empty, size: s.size, docs: s.docs.map((d) => ({ id: d.id, data: () => d.data() })) });
    const errOf = (e) => {
      const c = (e && e.code) || '';
      const code = c === 'permission-denied' ? 'not_granted' : c === 'invalid-argument' ? 'invalid_argument' : c === 'resource-exhausted' ? 'quota_exceeded' : 'unavailable';
      return { code, message: e && e.message };
    };
    const docRef = (path, id) => {
      const ref = fs.doc(db, path, id);
      return {
        id,
        get: async () => docSnap(await fs.getDoc(ref)),
        set: (d) => fs.setDoc(ref, d),
        update: (d) => fs.updateDoc(ref, d),
        delete: () => fs.deleteDoc(ref),
        onSnapshot: (cb, err) => fs.onSnapshot(ref, (s) => cb(docSnap(s)), (e) => err && err(errOf(e)))
      };
    };
    const coll = (path, cons) => ({
      doc: (id) => docRef(path, id),
      add: async (d) => { const r = await fs.addDoc(fs.collection(db, path), d); return docRef(path, r.id); },
      orderBy: (field, dir) => coll(path, [...cons, fs.orderBy(field, dir || 'asc')]),
      limit: (n) => coll(path, [...cons, fs.limit(n)]),
      get: async () => querySnap(await fs.getDocs(fs.query(fs.collection(db, path), ...cons))),
      onSnapshot: (cb, err) => fs.onSnapshot(fs.query(fs.collection(db, path), ...cons), (s) => cb(querySnap(s)), (e) => err && err(errOf(e)))
    });
    const api = { collection: (path) => coll(path, []) };
    // First visit to an empty database: copy in the character sheets and the clues.
    try {
      for (const [name, file] of [['pcs', 'pcs_seed'], ['clues', 'clues_seed']]) {
        if (!(await api.collection(name).get()).empty) continue;
        const rows = await (await fetch('data/' + file + '.json')).json();
        for (const r of rows) { const { id, ...rest } = r; await api.collection(name).doc(id).set(rest); }
      }
    } catch (e) { console.warn('[book] could not copy in the starting sheets and clues', e); }
    return api;
  })().catch((e) => { console.error('[book] Firebase did not start', e); return null; }));

  const readerId = (() => {
    try {
      let u = localStorage.getItem('bookhounds-reader-id');
      if (!u) { u = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + String(Math.random()).slice(2)); localStorage.setItem('bookhounds-reader-id', u); }
      return u;
    } catch (e) { return 'anonymous'; }
  })();
  const user = { id: async () => readerId, isOwner: async () => true, canEdit: async () => true };
  window.claude = { use: async (name) => (name === 'db' ? firebaseDB() : name === 'user' ? user : null) };
})();
