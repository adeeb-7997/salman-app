// ===== وضع الوالدين: القفل، قائمة العائلة، إضافة شخص، أصوات الألوان =====
const Parent = (() => {
  const $ = id => document.getElementById(id);
  const t = (k, v) => I18N.t(k, v);

  let photoBlob = null;
  let voiceBlob = null;
  let recTarget = null;   // 'person' أو معرّف اللون الجاري تسجيله
  let listUrls = [];
  let previewUrl = null;

  function open() {
    App.show('parent');
    $('langSelect').value = I18N.lang;
    renderList();
    Colors.load().then(renderColors);
  }

  function close() {
    if (Recorder.isRecording()) Recorder.stop(true);
    Sound.stopAll();
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
        renderList();
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
  }

  // ---------- أصوات الألوان ----------
  function renderColors() {
    const ul = $('colorList');
    ul.innerHTML = '';

    Colors.LIST.forEach(c => {
      const li = document.createElement('li');
      li.className = 'person';

      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = c.hex;

      const name = document.createElement('span');
      name.className = 'pname';
      name.textContent = Colors.name(c);
      if (!Colors.hasVoice(c.id)) {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.textContent = t('autoVoice');
        name.appendChild(tag);
      }

      const actions = document.createElement('div');
      actions.className = 'pactions';

      const recording = recTarget === c.id;
      actions.appendChild(iconBtn(recording ? '⏹️' : '🎙️', '', () => toggleColorRec(c.id),
        recording ? 'rec-on' : ''));
      actions.appendChild(iconBtn('▶️', t('play'), () => Colors.say(c)));

      if (Colors.hasVoice(c.id)) {
        actions.appendChild(iconBtn('🗑️', t('resetVoice'), async () => {
          await DB.deleteSound('color:' + c.id);
          Colors.setVoice(c.id, null);
          renderColors();
        }, 'danger'));
      }

      li.append(sw, name, actions);
      ul.appendChild(li);
    });
  }

  async function toggleColorRec(id) {
    if (Recorder.isRecording()) {
      if (recTarget === id) Recorder.stop(false);
      else App.toast(t('stopFirst'));
      return;
    }
    recTarget = id;
    renderColors();
    const ok = await Recorder.start({
      maxMs: 4000,
      onStop: async blob => {
        recTarget = null;
        if (blob) {
          try {
            await DB.saveSound('color:' + id, blob);
            Colors.setVoice(id, blob);
            Sound.playBlob(blob);
          } catch (e) {
            App.toast(t('saveError'));
          }
        }
        renderColors();
      }
    });
    if (!ok) {
      recTarget = null;
      renderColors();
    }
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
    } catch (e) {
      App.toast(t('saveError'));
    }
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
    $('langSelect').addEventListener('change', e => {
      I18N.setLang(e.target.value);
      renderList();
      renderColors();
    });
  }

  return { init, open, close };
})();
