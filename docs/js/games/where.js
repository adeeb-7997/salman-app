// ===== لعبة «وين ماما؟» =====
// تظهر صور من العائلة ويسمع الطفل سؤالاً مسجّلاً مثل «وين ماما؟».
// الصح: احتفال + صوت الشخص. الخطأ: اهتزاز لطيف + الصورة الصحيحة تلمع + يتكرر السؤال (بدون أي عقوبة).
// المستوى التلقائي: يبدأ بصورتين، ويزيد بعد 3 إجابات صحيحة من أول مرة، وينقص إذا تعثّر مرتين.
const WhereGame = (() => {
  const $ = id => document.getElementById(id);
  const MIN = 2, MAX = 4;

  let people = [];
  let urls = {};        // personId ← رابط الصورة
  let questions = {};   // personId ← تسجيل السؤال
  let session = 0;
  let timers = [];
  let askTimer = null;
  let target = null;
  let choices = [];
  let locked = false;
  let firstTry = true;
  let streak = 0;
  let missStreak = 0;
  let level = MIN;
  let lastTargetId = null;
  let running = false;

  function later(fn, ms) {
    const my = session;
    const id = setTimeout(() => { if (my === session) fn(); }, ms);
    timers.push(id);
    return id;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- المستوى ----------
  function getMode() {
    try { return localStorage.getItem('whereMode') || 'auto'; } catch (e) { return 'auto'; }
  }
  function loadLevel() {
    try { return parseInt(localStorage.getItem('whereAutoLevel') || String(MIN), 10) || MIN; } catch (e) { return MIN; }
  }
  function saveLevel(l) {
    try { localStorage.setItem('whereAutoLevel', String(l)); } catch (e) {}
  }
  function choiceCount() {
    const mode = getMode();
    const n = mode === 'auto' ? level : (parseInt(mode, 10) || MIN);
    return Math.max(MIN, Math.min(n, MAX, people.length));
  }

  function adjustLevel() {
    if (getMode() !== 'auto') return;
    if (firstTry) {
      streak++;
      missStreak = 0;
      if (streak >= 3 && level < MAX) { level++; streak = 0; saveLevel(level); }
    } else {
      streak = 0;
      missStreak++;
      if (missStreak >= 2 && level > MIN) { level--; missStreak = 0; saveLevel(level); }
    }
  }

  // ---------- اللعب ----------
  async function start() {
    session++;
    const my = session;
    running = true;
    const [all, sounds] = await Promise.all([DB.getAllPeople(), DB.getAllSounds()]);
    if (my !== session) return;

    people = all;
    questions = {};
    sounds.forEach(s => { if (s.key.startsWith('q:')) questions[s.key.slice(2)] = s.blob; });
    urls = {};
    people.forEach(p => { urls[p.id] = URL.createObjectURL(p.photo); });

    level = loadLevel();
    streak = 0;
    missStreak = 0;
    lastTargetId = null;

    const ok = people.length >= 2 && people.some(p => questions[p.id]);
    $('whereGrid').hidden = !ok;
    $('whereReplay').hidden = !ok;
    $('whereEmpty').hidden = ok;
    if (ok) round();
  }

  function round() {
    locked = false;
    firstTry = true;

    const targets = people.filter(p => questions[p.id]);
    const pool = targets.length > 1 ? targets.filter(p => p.id !== lastTargetId) : targets;
    target = pool[Math.floor(Math.random() * pool.length)];
    lastTargetId = target.id;

    const others = shuffle(people.filter(p => p.id !== target.id)).slice(0, choiceCount() - 1);
    choices = shuffle([target, ...others]);
    render();
    scheduleAsk(700);
  }

  function render() {
    const grid = $('whereGrid');
    grid.innerHTML = '';
    const n = choices.length;

    // نختار عدد الأعمدة اللي يعطي أكبر حجم للصور
    const gap = 18;
    const W = grid.clientWidth - 8;
    const H = grid.clientHeight - 60 - 16;
    let size = 90;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const s = Math.floor(Math.min((W - gap * (cols - 1)) / cols, (H - gap * (rows - 1)) / rows));
      if (s > size) size = s;
    }

    choices.forEach(p => {
      const c = document.createElement('div');
      c.className = 'where-card';
      c.style.width = size + 'px';
      c.style.height = size + 'px';
      c._pid = p.id;
      const img = document.createElement('img');
      img.src = urls[p.id];
      img.alt = '';
      c.appendChild(img);
      c.addEventListener('pointerdown', () => tap(c, p));
      grid.appendChild(c);
    });
  }

  function ask() {
    if (target && questions[target.id]) Sound.playBlob(questions[target.id]);
  }

  function scheduleAsk(ms) {
    clearTimeout(askTimer);
    askTimer = later(ask, ms);
  }

  function tap(card, p) {
    if (locked) return;
    const grid = $('whereGrid');

    if (p.id === target.id) {
      // ✅ صح
      locked = true;
      clearTimeout(askTimer);
      Sound.stopAll();
      card.classList.remove('hint', 'wiggle');
      card.classList.add('right');
      grid.querySelectorAll('.where-card').forEach(c => { if (c !== card) c.classList.add('dim'); });

      const r = card.getBoundingClientRect();
      App.burst(r.left + r.width / 2, r.top + r.height / 2);
      later(() => App.burst(r.left + r.width / 2, r.top + r.height / 3), 250);
      Sound.cheer();
      adjustLevel();

      let done = false;
      const next = () => {
        if (done) return;
        done = true;
        later(round, 900);
      };
      later(() => {
        if (p.voice) Sound.playBlob(p.voice, next);
        else later(next, 600);
      }, 550);
      later(next, 13000); // احتياط
    } else {
      // 🙂 مو هذا: اهتزاز + تلميح + إعادة السؤال
      firstTry = false;
      Sound.stopAll();
      card.classList.remove('wiggle');
      void card.offsetWidth;
      card.classList.add('wiggle');
      const right = [...grid.children].find(c => c._pid === target.id);
      if (right) right.classList.add('hint');
      scheduleAsk(500);
    }
  }

  function stop() {
    session++;
    running = false;
    timers.forEach(clearTimeout);
    timers = [];
    clearTimeout(askTimer);
    Sound.stopAll();
    Object.values(urls).forEach(u => URL.revokeObjectURL(u));
    urls = {};
    people = [];
    choices = [];
    target = null;
    $('whereGrid').innerHTML = '';
  }

  function init() {
    $('whereReplay').addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (!locked) { Sound.stopAll(); ask(); }
    });
    // إعادة ترتيب الصور إذا تغيّر اتجاه الجوال
    window.addEventListener('resize', () => {
      if (!running || !choices.length) return;
      const hinted = !firstTry;
      render();
      if (hinted && !locked) {
        const right = [...$('whereGrid').children].find(c => c._pid === target.id);
        if (right) right.classList.add('hint');
      }
    });
  }

  return { init, start, stop };
})();
