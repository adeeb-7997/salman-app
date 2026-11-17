// ===== لعبة «مين هذا؟» =====
// صورة كبيرة لشخص من العائلة، يلمسها الطفل فيسمع صوته، ثم ينتقل للشخص التالي تلقائياً
const WhoGame = (() => {
  const $ = id => document.getElementById(id);

  let people = [];
  let urls = [];
  let idx = 0;
  let busy = false;
  let session = 0;   // يمنع تنفيذ أي مؤقت قديم بعد الخروج من اللعبة
  let timers = [];

  function later(fn, ms) {
    const my = session;
    timers.push(setTimeout(() => { if (my === session) fn(); }, ms));
  }

  async function start() {
    session++;
    const my = session;
    const all = await DB.getAllPeople();
    if (my !== session) return;

    people = all;
    urls = people.map(p => URL.createObjectURL(p.photo));
    idx = 0;
    busy = false;

    const has = people.length > 0;
    $('whoStage').hidden = !has;
    $('whoEmpty').hidden = has;
    if (has) showPerson();
  }

  function showPerson() {
    const card = $('whoCard');
    $('whoImg').src = urls[idx];
    $('whoName').textContent = people[idx].name;
    card.classList.remove('enter', 'talk');
    void card.offsetWidth;
    card.classList.add('enter');
  }

  function onTap() {
    if (busy || !people.length) return;
    busy = true;

    const p = people[idx];
    const card = $('whoCard');
    card.classList.remove('enter');
    card.classList.add('talk');

    const r = card.getBoundingClientRect();
    App.burst(r.left + r.width / 2, r.top + r.height / 2);
    Sound.cheer();

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      card.classList.remove('talk');
      later(() => {
        idx = (idx + 1) % people.length;
        showPerson();
        busy = false;
      }, 700);
    };

    later(() => {
      if (p.voice) Sound.playBlob(p.voice, done);
      else Sound.speak(p.name, done);
    }, 450);

    later(done, 13000); // احتياط: لا تعلق اللعبة لو ما وصل حدث الانتهاء
  }

  function stop() {
    session++;
    timers.forEach(clearTimeout);
    timers = [];
    Sound.stopAll();
    urls.forEach(u => URL.revokeObjectURL(u));
    urls = [];
    people = [];
    busy = false;
    $('whoImg').removeAttribute('src');
    $('whoName').textContent = '';
    $('whoCard').classList.remove('enter', 'talk');
  }

  function init() {
    // كل المساحة قابلة للمس، لأن لمسات الطفل غير دقيقة
    $('whoStage').addEventListener('pointerdown', onTap);
  }

  return { init, start, stop };
})();
