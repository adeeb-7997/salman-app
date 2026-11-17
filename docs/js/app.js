// ===== التطبيق: التنقل بين الشاشات + الشاشة الرئيسية + أدوات مشتركة =====
const App = (() => {
  let toastTimer = null;
  let currentGame = null;

  // الألعاب المتاحة: اسم اللعبة ← وحدتها
  const GAMES = {
    who: { screen: 'game-who', module: WhoGame },
    peek: { screen: 'game-peek', module: PeekGame }
    // balloons: المرحلة 3
  };

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

  // زر بضغطة مطولة (للقفل وللخروج من الألعاب)
  function hold(btn, ms, onDone, onShort) {
    let timer = null;
    btn.style.setProperty('--hold', ms + 'ms');

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      btn.classList.add('holding');
      timer = setTimeout(() => {
        timer = null;
        btn.classList.remove('holding');
        onDone();
      }, ms);
    });

    const cancel = () => {
      btn.classList.remove('holding');
      if (timer) {
        clearTimeout(timer);
        timer = null;
        if (onShort) onShort();
      }
    };
    ['pointerup', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  // نجوم احتفال تنطلق من نقطة
  function burst(x, y) {
    const emojis = ['⭐', '🎉', '💛', '✨', '🎈', '💜'];
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'burst';
      s.textContent = emojis[i % emojis.length];
      const ang = Math.random() * Math.PI * 2;
      const d = 80 + Math.random() * 100;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * d + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * d + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }

  function openGame(name) {
    const g = GAMES[name];
    if (!g) return;
    currentGame = g;
    show(g.screen);
    g.module.start();
  }

  function exitGame() {
    if (currentGame) currentGame.module.stop();
    currentGame = null;
    show('home');
  }

  function initTiles() {
    document.querySelectorAll('.tile').forEach(tile => {
      tile.addEventListener('pointerdown', () => {
        Sound.boing();
        tile.classList.remove('bounce');
        void tile.offsetWidth; // إعادة تشغيل الحركة
        tile.classList.add('bounce');

        const name = tile.dataset.game;
        if (GAMES[name]) setTimeout(() => openGame(name), 400);
      });
    });
  }

  function init() {
    I18N.apply();
    initTiles();
    Parent.init();
    Object.values(GAMES).forEach(g => g.module.init());

    // زر الخروج من الألعاب: ضغطة مطولة ثانيتين
    document.querySelectorAll('.home-btn').forEach(btn => {
      hold(btn, 2000, exitGame, () => toast(I18N.t('holdToExit')));
    });

    DB.requestPersist();

    // إيقاف الأصوات إذا خرج من التطبيق
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Sound.stopAll();
    });

    // منع القائمة عند الضغط المطول (إلا في حقول الإدخال)
    document.addEventListener('contextmenu', e => {
      if (!e.target.closest('input, textarea')) e.preventDefault();
    });
  }

  return { toast, show, hold, burst, init };
})();

App.init();
