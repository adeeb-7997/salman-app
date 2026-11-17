// ===== التخزين المحلي (IndexedDB): الصور والأصوات تبقى داخل الجهاز =====
// الإصدار 2: أضيف مخزن sounds لأصوات الألوان (البيانات القديمة تبقى كما هي)
const DB = (() => {
  const NAME = 'salman-app';
  const VERSION = 2;
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('people')) {
          db.createObjectStore('people', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sounds')) {
          db.createObjectStore('sounds', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function getAll(store) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function putMany(store, list) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const s = tx.objectStore(store);
      list.forEach(item => s.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function remove(store, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------- العائلة ----------
  async function getAllPeople() {
    const list = await getAll('people');
    return list.sort((a, b) => a.order - b.order);
  }
  const savePeople = list => putMany('people', list);
  const savePerson = p => putMany('people', [p]);
  const deletePerson = id => remove('people', id);

  // ---------- الأصوات (أسماء الألوان وغيرها) ----------
  const getAllSounds = () => getAll('sounds');
  const saveSound = (key, blob) => putMany('sounds', [{ key, blob }]);
  const deleteSound = key => remove('sounds', key);

  // طلب تخزين دائم حتى لا يحذف المتصفح البيانات تلقائياً
  async function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    } catch (e) {}
  }

  return {
    getAllPeople, savePerson, savePeople, deletePerson,
    getAllSounds, saveSound, deleteSound,
    requestPersist
  };
})();
