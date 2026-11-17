// ===== لعبة «الرسم» =====
// يلمس الطفل الشاشة فتنرش ألوان ويسمع اسم اللون، ويقدر يسحب إصبعه ليرسم.
// كل لمسة جديدة تغيّر اللون. زر الإسفنجة 🧽 يمسح اللوحة.
const PaintGame = (() => {
  const $ = id => document.getElementById(id);

  let canvas = null;
  let ctx = null;
  let active = false;
  let colorIdx = -1;
  let lastSay = 0;
  const pointers = new Map(); // pointerId ← { x, y, color }

  function resize() {
    if (!active) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function circle(x, y, rad, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // رشّة لون: دائرة كبيرة + قطرات حولها
  function splash(x, y, color) {
    circle(x, y, 36 + Math.random() * 16, color);
    const drops = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < drops; i++) {
      const ang = Math.random() * Math.PI * 2;
      const d = 45 + Math.random() * 45;
      circle(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 5 + Math.random() * 10, color);
    }
  }

  function onDown(e) {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

    colorIdx = (colorIdx + 1) % Colors.LIST.length;
    const c = Colors.LIST[colorIdx];
    const p = pos(e);
    pointers.set(e.pointerId, { x: p.x, y: p.y, color: c.hex });
    splash(p.x, p.y, c.hex);

    // نطق اسم اللون (مع تهدئة لو اللمسات سريعة جداً)
    const now = Date.now();
    if (now - lastSay > 700) {
      lastSay = now;
      Colors.say(c);
    } else {
      Sound.note(colorIdx);
    }
  }

  function onMove(e) {
    const s = pointers.get(e.pointerId);
    if (!s) return;
    const p = pos(e);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    s.x = p.x;
    s.y = p.y;
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
  }

  function clearCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function wipe() {
    Sound.whoosh();
    canvas.classList.add('fade');
    setTimeout(() => {
      clearCanvas();
      canvas.classList.remove('fade');
    }, 400);
  }

  function start() {
    active = true;
    colorIdx = -1;
    canvas.classList.remove('fade');
    Colors.load();
    resize();
  }

  function stop() {
    active = false;
    pointers.clear();
    Sound.stopAll();
    clearCanvas();
  }

  function init() {
    canvas = $('paintCanvas');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, onUp));
    $('paintClear').addEventListener('pointerdown', e => {
      e.stopPropagation();
      wipe();
    });
    window.addEventListener('resize', resize);
  }

  return { init, start, stop };
})();
