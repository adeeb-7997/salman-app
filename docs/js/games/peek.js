// ===== لعبة «الغميضة» =====
// بيت فيه شبابيك مقفلة، كل شباك خلفه شخص من العائلة. يلمسه الطفل فينفتح ويسمع صوته.
// إذا انفتحت كل الشبابيك: احتفال، ثم تنقفل وتتبدل الأماكن.
const PeekGame = (() => {
  const $ = id => document.getElementById(id);
  const COLORS = ['#4FC3F7', '#FF8A65', '#9CCC65', '#BA68C8', '#FFD54F', '#F06292'];
  const MAX_WINDOWS = 6;

  let items = [];      // [{ p, url }]
  let opened = 0;
  let finishing = false;
  let session = 0;
  let timers = [];

  function later(fn, ms) {
    const my = session;
    timers.push(setTimeout(() => { if (my === session) fn(); }, ms));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function start() {
    session++;
    const my = session;
    const all = await DB.getAllPeople();
    if (my !== session) return;

    items = shuffle(all).slice(0, MAX_WINDOWS).map(p => ({ p, url: URL.createObjectURL(p.photo) }));
    finishing = false;
    build();
  }

  function build() {
    const box = $('peekWindows');
    box.innerHTML = '';
    opened = 0;

    const has = items.length > 0;
    $('peekHouse').hidden = !has;
    $('peekEmpty').hidden = has;
    if (!has) return;

    const n = items.length;
    box.style.setProperty('--cols', n <= 1 ? 1 : n <= 4 ? 2 : 3);

    items.forEach((it, i) => {
      const w = document.createElement('div');
      w.className = 'window';
      w.style.setProperty('--c', COLORS[i % COLORS.length]);

      const img = document.createElement('img');
      img.src = it.url;
      img.alt = '';

      const l = document.createElement('span');
      l.className = 'shutter l';
      const r = document.createElement('span');
      r.className = 'shutter r';

      w.append(img, l, r);
      w.addEventListener('pointerdown', () => tap(w, it.p));
      box.appendChild(w);
    });
  }

  function tap(w, p) {
    if (finishing) return;

    const rect = w.getBoundingClientRect();
    if (!w.classList.contains('open')) {
      w.classList.add('open');
      opened++;
      App.burst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    Sound.pop();
    w.classList.remove('wiggle');
    void w.offsetWidth;
    w.classList.add('wiggle');

    let finished = false;
    const after = () => {
      if (finished) return;
      finished = true;
      if (opened === items.length && !finishing) finish();
    };

    later(() => {
      if (p.voice) Sound.playBlob(p.voice, after);
      else Sound.speak(p.name, after);
    }, 300);
  }

  function finish() {
    finishing = true;
    Sound.cheer();
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    App.burst(cx, cy);
    later(() => App.burst(cx - 80, cy - 60), 200);
    later(() => App.burst(cx + 80, cy - 60), 400);

    // إقفال الشبابيك ثم تبديل الأماكن
    later(() => {
      document.querySelectorAll('#peekWindows .window').forEach(w => w.classList.remove('open'));
    }, 1800);
    later(() => {
      items = shuffle(items);
      build();
      finishing = false;
    }, 2500);
  }

  function stop() {
    session++;
    timers.forEach(clearTimeout);
    timers = [];
    Sound.stopAll();
    items.forEach(it => URL.revokeObjectURL(it.url));
    items = [];
    finishing = false;
    $('peekWindows').innerHTML = '';
  }

  function init() {}

  return { init, start, stop };
})();
