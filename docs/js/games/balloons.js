// ===== لعبة «البالونات» =====
// بالونات ملونة تطلع من تحت لفوق، يلمسها الطفل فتنفقع ويسمع اسم لونها
const BalloonsGame = (() => {
  const $ = id => document.getElementById(id);
  const MAX_ON_SCREEN = 6;
  const SPAWN_EVERY = 1300;

  let session = 0;
  let spawnTimer = null;
  let timers = [];
  let lastColor = -1;

  function later(fn, ms) {
    const my = session;
    timers.push(setTimeout(() => { if (my === session) fn(); }, ms));
  }

  function start() {
    session++;
    $('sky').innerHTML = '';
    Colors.load();
    for (let i = 0; i < 3; i++) later(spawn, i * 600);
    spawnTimer = setInterval(() => { if (!document.hidden) spawn(); }, SPAWN_EVERY);
  }

  function pickColor() {
    const n = Colors.LIST.length;
    let i;
    do { i = Math.floor(Math.random() * n); } while (i === lastColor && n > 1);
    lastColor = i;
    return Colors.LIST[i];
  }

  function spawn() {
    const sky = $('sky');
    if (sky.querySelectorAll('.balloon:not(.popped)').length >= MAX_ON_SCREEN) return;

    const W = sky.clientWidth;
    const H = sky.clientHeight;
    const size = Math.max(90, Math.min(150, W * 0.28));
    const c = pickColor();

    const b = document.createElement('div');
    b.className = 'balloon';
    b.style.width = size + 'px';
    b.style.left = Math.random() * Math.max(0, W - size) + 'px';
    b.style.top = H + 'px';
    b.style.setProperty('--c', c.hex);
    b.style.setProperty('--rise', -(H + size * 2.4) + 'px');
    b.style.animationDuration = (7 + Math.random() * 2.5) + 's';

    const sway = document.createElement('div');
    sway.className = 'b-sway';
    sway.style.animationDelay = -(Math.random() * 3) + 's';
    const body = document.createElement('div');
    body.className = 'b-body';
    const string = document.createElement('div');
    string.className = 'b-string';
    sway.append(body, string);
    b.appendChild(sway);

    b.addEventListener('pointerdown', e => {
      e.stopPropagation();
      pop(b, body, c);
    }, { once: true });

    // إزالة البالون إذا طلع من الشاشة بدون ما ينفقع
    b.addEventListener('animationend', e => {
      if (e.target === b && !b.classList.contains('popped')) b.remove();
    });

    sky.appendChild(b);
  }

  function pop(b, body, c) {
    if (b.classList.contains('popped')) return;
    const r = body.getBoundingClientRect();
    App.burst(r.left + r.width / 2, r.top + r.height / 2);
    Sound.balloonPop();
    b.classList.add('popped');
    setTimeout(() => b.remove(), 300);
    later(() => Colors.say(c), 150);
  }

  function stop() {
    session++;
    clearInterval(spawnTimer);
    spawnTimer = null;
    timers.forEach(clearTimeout);
    timers = [];
    Sound.stopAll();
    $('sky').innerHTML = '';
  }

  function init() {}

  return { init, start, stop };
})();
