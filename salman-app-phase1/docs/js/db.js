// ===== التخزين المحلي (IndexedDB): الصور والأصوات تبقى داخل الجهاز =====
const DB = (() => {
  const NAME = 'salman-app';
  const VERSION = 1;
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
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function getAllPeople() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const req = db.transaction('people', 'readonly').objectStore('people').getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => a.order - b.order));
      req.onerror = () => reject(req.error);
    });
  }

  async function savePeople(list) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('people', 'readwrite');
      const store = tx.objectStore('people');
      list.forEach(p => store.put(p));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function savePerson(p) { return savePeople([p]); }

  async function deletePerson(id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('people', 'readwrite');
      tx.objectStore('people').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // طلب تخزين دائم حتى لا يحذف المتصفح البيانات تلقائياً
  async function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
    } catch (e) {}
  }

  return { getAllPeople, savePerson, savePeople, deletePerson, requestPersist };
})();
