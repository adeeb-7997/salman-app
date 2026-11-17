// ===== التطبيق: التنقل بين الشاشات + الشاشة الرئيسية =====
const App = (() => {
  let toastTimer = null;

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo(0, 0);
  }

  function initTiles() {
    document.querySelectorAll('.tile').forEach(tile => {
      tile.addEventListener('pointerdown', () => {
        Sound.boing();
        tile.classList.remove('bounce');
        void tile.offsetWidth; // إعادة تشغيل الحركة
        tile.classList.add('bounce');
        // الألعاب تُضاف في المرحلة 2 و 3
      });
    });
  }

  function init() {
    I18N.apply();
    initTiles();
    Parent.init();
    DB.requestPersist();

    // منع القائمة عند الضغط المطول (إلا في حقول الإدخال)
    document.addEventListener('contextmenu', e => {
      if (!e.target.closest('input, textarea')) e.preventDefault();
    });
  }

  return { toast, show, init };
})();

App.init();
