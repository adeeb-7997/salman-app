// ===== وضع الوالدين: القفل، العائلة، أصوات الألوان، مدة اللعب، الإعدادات =====
const Parent = (() => {
  const $ = id => document.getElementById(id);
  const t = (k, v) => I18N.t(k, v);
  const TIMER_OPTIONS = [0, 5, 10, 15, 20, 30];

  let photoBlob = null;
  let voiceBlob = null;
  let byeBlob = null;
  let recTarget = null;   // 'person' أو معرّف اللون أو 'bye'
  let listUrls = [];
  let qUrls = [];
  let questions = {};     // personId ← تسجيل سؤال «وين؟»
  let previewUrl = null;

  async function open() {
    App.show('parent');
    $('langSelect').value = I18N.lang;
    renderTimer();
    renderWhereLevel();
    renderList();
    await loadQuestions();
    renderQuestions();
    await Colors.load();
    renderColors();
    await loadBye();
    renderBye();
  }

  function close() {
    if (Recorder.isRecording()) Recorder.stop(true);
    Sound.stopAll();
    App.resetSession();
    App.show('home');
  }

  function iconBtn(icon, title, onClick, extra) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn' + (extra ? ' ' + extra : '');
    b.textContent = icon;
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
  }

  // ---------- قائمة العائلة ----------
  async function renderList() {
    listUrls.forEach(u => URL.revokeObjectURL(u));
    listUrls = [];

    const people = await DB.getAllPeople();
    const ul = $('peopleList');
    ul.innerHTML = '';
    $('emptyMsg').hidden = people.length > 0;

    people.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'person';

      const img = document.createElement('img');
      const url = URL.createObjectURL(p.photo);
      listUrls.push(url);
      img.src = url;
      img.alt = p.name;

      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = p.name;

      const actions = document.createElement('div');
      actions.className = 'pactions';

      if (p.voice) {
        actions.appendChild(iconBtn('▶️', t('play'), () => Sound.playBlob(p.voice)));
      } else {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = t('noVoice');
        actions.appendChild(tag);
      }

      if (i > 0) {
        actions.appendChild(iconBtn('⬆️', t('moveUp'), () => moveUp(people, i)));
      }

      actions.appendChild(iconBtn('🗑️', '', async () => {
        if (!confirm(t('confirmDelete', { name: p.name }))) return;
        await DB.deletePerson(p.id);
        await DB.deleteSound('q:' + p.id);
        delete questions[p.id];
        renderList();
        renderQuestions();
      }, 'danger'));

      li.append(img, name, actions);
      ul.appendChild(li);
    });
  }

  async function moveUp(people, i) {
    const a = people[i - 1], b = people[i];
    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;
    if (a.order === b.order) b.order = a.order - 1;
    await DB.savePeople([a, b]);
    renderList();
    renderQuestions();
  }

  // ---------- صف تسجيل صوت (مشترك للألوان ورسالة الوداع) ----------
  function soundRow({ id, left, label, recorded, onPlay, onDelete, onRecord, emptyTag }) {
    const li = document.createElement('li');
    li.className = 'person';

    const name = document.createElement('span');
    name.className = 'pname';
    name.textContent = label;
    if (!recorded) {
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = emptyTag || t('autoVoice');
      name.appendChild(tag);
    }

    const actions = document.createElement('div');
    actions.className = 'pactions';
    const recording = recTarget === id;
    actions.appendChild(iconBtn(recording ? '⏹️' : '🎙️', '', onRecord, recording ? 'rec-on' : ''));
    actions.appendChild(iconBtn('▶️', t('play'), onPlay));
    if (recorded) actions.appendChild(iconBtn('🗑️', t('resetVoice'), onDelete, 'danger'));

    li.append(left, name, actions);
    return li;
  }

  // تسجيل صوت وحفظه بمفتاح معيّن
  async function recordSound(id, key, maxMs, afterSave, rerender) {
    if (Recorder.isRecording()) {
      if (recTarget === id) Recorder.stop(false);
      else App.toast(t('stopFirst'));
      return;
    }
    recTarget = id;
    rerender();
    const ok = await Recorder.start({
      maxMs,
      onStop: async blob => {
        recTarget = null;
        if (blob) {
          try {
            await DB.saveSound(key, blob);
            afterSave(blob);
            Sound.playBlob(blob);
          } catch (e) {
            App.toast(t('saveError'));
          }
        }
        rerender();
      }
    });
    if (!ok) {
      recTarget = null;
      rerender();
    }
  }

  // ---------- أسئلة «وين ماما؟» ----------
  async function loadQuestions() {
    questions = {};
    try {
      const all = await DB.getAllSounds();
      all.forEach(s => { if (s.key.startsWith('q:')) questions[s.key.slice(2)] = s.blob; });
    } catch (e) {}
  }

  async function renderQuestions() {
    qUrls.forEach(u => URL.revokeObjectURL(u));
    qUrls = [];
    const people = await DB.getAllPeople();
    const ul = $('questionList');
    ul.innerHTML = '';

    people.forEach(p => {
      const img = document.createElement('img');
      img.className = 'thumb';
      const url = URL.createObjectURL(p.photo);
      qUrls.push(url);
      img.src = url;
      img.alt = '';

      const qid = 'q:' + p.id;
      ul.appendChild(soundRow({
        id: qid,
        left: img,
        label: t('whereLabel', { name: p.name }),
        recorded: !!questions[p.id],
        emptyTag: t('notRecorded'),
        onPlay: () => (questions[p.id] ? Sound.playBlob(questions[p.id]) : App.toast(t('notRecorded'))),
        onRecord: () => recordSound(qid, qid, 4000, blob => { questions[p.id] = blob; }, renderQuestions),
        onDelete: async () => {
          await DB.deleteSound(qid);
          delete questions[p.id];
          renderQuestions();
        }
      }));
    });
  }

  function renderWhereLevel() {
    const sel = $('whereLevelSelect');
    sel.innerHTML = '';
    [['auto', 'levelAuto'], ['2', 'level2'], ['3', 'level3'], ['4', 'level4']].forEach(([v, k]) => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = t(k);
      sel.appendChild(o);
    });
    let mode = 'auto';
    try { mode = localStorage.getItem('whereMode') || 'auto'; } catch (e) {}
    sel.value = mode;
  }

  // ---------- أصوات الألوان ----------
  function renderColors() {
    const ul = $('colorList');
    ul.innerHTML = '';
    Colors.LIST.forEach(c => {
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = c.hex;
      ul.appendChild(soundRow({
        id: c.id,
        left: sw,
        label: Colors.name(c),
        recorded: Colors.hasVoice(c.id),
        onPlay: () => Colors.say(c),
        onRecord: () => recordSound(c.id, 'color:' + c.id, 4000, blob => Colors.setVoice(c.id, blob), renderColors),
        onDelete: async () => {
          await DB.deleteSound('color:' + c.id);
          Colors.setVoice(c.id, null);
          renderColors();
        }
      }));
    });
  }

  // ---------- مدة اللعب + رسالة الوداع ----------
  function renderTimer() {
    const sel = $('timerSelect');
    sel.innerHTML = '';
    TIMER_OPTIONS.forEach(m => {
      const o = document.createElement('option');
      o.value = m;
      o.textContent = m === 0 ? t('timerOff') : t('m' + m);
      sel.appendChild(o);
    });
    sel.value = App.getSessionMinutes();
  }

  async function loadBye() {
    try {
      const all = await DB.getAllSounds();
      const b = all.find(s => s.key === 'bye');
      byeBlob = b ? b.blob : null;
    } catch (e) {
      byeBlob = null;
    }
  }

  function renderBye() {
    const ul = $('byeList');
    ul.innerHTML = '';
    const icon = document.createElement('span');
    icon.className = 'swatch';
    icon.style.cssText = 'background:#3949AB;display:flex;align-items:center;justify-content:center;font-size:24px';
    icon.textContent = '🌙';
    ul.appendChild(soundRow({
      id: 'bye',
      left: icon,
      label: t('byeMsg'),
      recorded: !!byeBlob,
      onPlay: () => (byeBlob ? Sound.playBlob(byeBlob) : Sound.byeTune()),
      onRecord: () => recordSound('bye', 'bye', 6000, blob => { byeBlob = blob; }, renderBye),
      onDelete: async () => {
        await DB.deleteSound('bye');
        byeBlob = null;
        renderBye();
      }
    }));
  }

  // ---------- نافذة إضافة شخص ----------
  function setRecUi(on) {
    $('recBtn').textContent = on ? t('stop') : t(voiceBlob ? 'reRecord' : 'record');
    $('recBtn').classList.toggle('on', on);
  }

  function resetDialog() {
    photoBlob = null;
    voiceBlob = null;
    $('pName').value = '';
    $('pPhoto').value = '';
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    $('pPhotoPreview').hidden = true;
    $('pPhotoPreview').removeAttribute('src');
    $('pPhotoHint').hidden = false;
    $('playBtn').disabled = true;
    $('recStatus').textContent = '';
    setRecUi(false);
  }

  function isDialogOpen() {
    return !$('personDialog').classList.contains('hidden');
  }

  function openDialog() {
    if (Recorder.isRecording()) Recorder.stop(true);
    resetDialog();
    $('personDialog').classList.remove('hidden');
  }

  function closeDialog() {
    if (recTarget === 'person') Recorder.stop(true);
    Sound.stopAll();
    $('personDialog').classList.add('hidden');
    resetDialog();
  }

  // تصغير الصورة قبل الحفظ لتوفير المساحة
  function resizeImage(file, max = 900) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  async function onPhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      photoBlob = await resizeImage(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(photoBlob);
      $('pPhotoPreview').src = previewUrl;
      $('pPhotoPreview').hidden = false;
      $('pPhotoHint').hidden = true;
    } catch (err) {
      App.toast(t('photoError'));
    }
  }

  async function togglePersonRec() {
    if (Recorder.isRecording()) {
      if (recTarget === 'person') Recorder.stop(false);
      else App.toast(t('stopFirst'));
      return;
    }
    recTarget = 'person';
    const ok = await Recorder.start({
      maxMs: 10000,
      onStart: () => {
        setRecUi(true);
        $('recStatus').textContent = t('recording');
      },
      onStop: blob => {
        recTarget = null;
        if (blob) {
          voiceBlob = blob;
          $('playBtn').disabled = false;
          $('recStatus').textContent = t('recorded');
          Sound.playBlob(blob);
        }
        setRecUi(false);
      }
    });
    if (!ok) recTarget = null;
  }

  async function save() {
    const name = $('pName').value.trim();
    if (!name || !photoBlob) { App.toast(t('needNamePhoto')); return; }
    if (Recorder.isRecording()) { App.toast(t('stopFirst')); return; }

    try {
      const people = await DB.getAllPeople();
      const order = people.length ? Math.max(...people.map(p => p.order)) + 1 : 0;
      await DB.savePerson({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        photo: photoBlob,
        voice: voiceBlob,
        order,
        createdAt: Date.now()
      });
      closeDialog();
      App.toast(t('saved'));
      renderList();
      renderQuestions();
    } catch (e) {
      App.toast(t('saveError'));
    }
  }

  // ---------- اختبار الصوت الآلي ----------
  function testTts() {
    const info = Sound.ttsInfo();
    let msg;
    if (!info.supported) msg = t('ttsNo');
    else if (!info.voice) msg = t('ttsNoLang', { n: info.total });
    else msg = t('ttsOk', { name: info.voice.name + ' (' + info.voice.lang + ')' });
    $('ttsStatus').textContent = msg;
    if (info.supported) Sound.speak(t('ttsSample'));
  }

  function init() {
    // قفل الوالدين: ضغطة مطولة 3 ثوانٍ
    App.hold($('lockBtn'), 3000, open, () => App.toast(t('holdToOpen')));

    $('closeParent').addEventListener('click', close);
    $('addBtn').addEventListener('click', openDialog);
    $('cancelPerson').addEventListener('click', closeDialog);
    $('savePerson').addEventListener('click', save);
    $('pPhoto').addEventListener('change', onPhotoChange);
    $('recBtn').addEventListener('click', togglePersonRec);
    $('playBtn').addEventListener('click', () => Sound.playBlob(voiceBlob));
    $('ttsTestBtn').addEventListener('click', testTts);
    $('whereLevelSelect').addEventListener('change', e => {
      try { localStorage.setItem('whereMode', e.target.value); } catch (err) {}
    });
    $('timerSelect').addEventListener('change', e => App.setSessionMinutes(parseInt(e.target.value, 10) || 0));
    $('langSelect').addEventListener('change', e => {
      I18N.setLang(e.target.value);
      renderTimer();
      renderWhereLevel();
      renderList();
      renderQuestions();
      renderColors();
      renderBye();
    });
  }

  return { init, open, close, isDialogOpen, closeDialog };
})();
