// ===== وضع الوالدين: القفل، قائمة العائلة، إضافة شخص بصورة وصوت =====
const Parent = (() => {
  const $ = id => document.getElementById(id);
  const t = (k, v) => I18N.t(k, v);

  let photoBlob = null;
  let voiceBlob = null;
  let recorder = null;
  let stream = null;
  let recTimer = null;
  let listUrls = [];
  let previewUrl = null;

  // ---------- قفل الوالدين: ضغطة مطولة 3 ثوانٍ ----------
  function initGate() {
    const btn = $('lockBtn');
    let timer = null;

    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      btn.classList.add('holding');
      timer = setTimeout(() => {
        timer = null;
        btn.classList.remove('holding');
        open();
      }, 3000);
    });

    const cancel = () => {
      btn.classList.remove('holding');
      if (timer) {
        clearTimeout(timer);
        timer = null;
        App.toast(t('holdToOpen'));
      }
    };
    ['pointerup', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  function open() {
    App.show('parent');
    $('langSelect').value = I18N.lang;
    renderList();
  }

  function close() {
    Sound.stop();
    App.show('home');
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
        renderList();
      }, 'danger'));

      li.append(img, name, actions);
      ul.appendChild(li);
    });
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

  async function moveUp(people, i) {
    const a = people[i - 1], b = people[i];
    const tmp = a.order;
    a.order = b.order;
    b.order = tmp;
    if (a.order === b.order) b.order = a.order - 1;
    await DB.savePeople([a, b]);
    renderList();
  }

  // ---------- نافذة الإضافة ----------
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
    $('recBtn').textContent = t('record');
    $('recBtn').classList.remove('on');
  }

  function openDialog() {
    resetDialog();
    $('personDialog').classList.remove('hidden');
  }

  function closeDialog() {
    stopRecording(true);
    Sound.stop();
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

  // ---------- التسجيل الصوتي ----------
  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(tr => tr.stop());
      stream = null;
    }
  }

  function stopRecording(discard) {
    clearTimeout(recTimer);
    if (recorder && recorder.state === 'recording') {
      recorder._discard = !!discard;
      recorder.stop();
    } else {
      stopStream();
    }
  }

  async function toggleRecording() {
    if (recorder && recorder.state === 'recording') {
      stopRecording(false);
      return;
    }
    if (!window.MediaRecorder || !navigator.mediaDevices) {
      App.toast(t('noRecorder'));
      return;
    }
    Sound.stop();

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      App.toast(t('micDenied'));
      return;
    }

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      .find(m => MediaRecorder.isTypeSupported(m));
    const chunks = [];
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder = r;

    r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stopStream();
      if (!r._discard && chunks.length) {
        voiceBlob = new Blob(chunks, { type: r.mimeType || mime || 'audio/webm' });
        $('playBtn').disabled = false;
        $('recStatus').textContent = t('recorded');
        Sound.playBlob(voiceBlob);
      }
      $('recBtn').textContent = t(voiceBlob ? 'reRecord' : 'record');
      $('recBtn').classList.remove('on');
      if (recorder === r) recorder = null;
    };

    r.start();
    $('recBtn').textContent = t('stop');
    $('recBtn').classList.add('on');
    $('recStatus').textContent = t('recording');
    recTimer = setTimeout(() => stopRecording(false), 10000);
  }

  // ---------- الحفظ ----------
  async function save() {
    const name = $('pName').value.trim();
    if (!name || !photoBlob) { App.toast(t('needNamePhoto')); return; }
    if (recorder && recorder.state === 'recording') { App.toast(t('stopFirst')); return; }

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
    } catch (e) {
      App.toast(t('saveError'));
    }
  }

  function init() {
    initGate();
    $('closeParent').addEventListener('click', close);
    $('addBtn').addEventListener('click', openDialog);
    $('cancelPerson').addEventListener('click', closeDialog);
    $('savePerson').addEventListener('click', save);
    $('pPhoto').addEventListener('change', onPhotoChange);
    $('recBtn').addEventListener('click', toggleRecording);
    $('playBtn').addEventListener('click', () => Sound.playBlob(voiceBlob));
    $('langSelect').addEventListener('change', e => {
      I18N.setLang(e.target.value);
      renderList();
    });
  }

  return { init, open, close };
})();
