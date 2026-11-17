// ===== الألوان: القائمة + نطق اسم اللون (بصوت الأهل إذا مسجّل، وإلا آلياً) =====
const Colors = (() => {
  const LIST = [
    { id: 'red',    hex: '#F44336', ar: 'أحمر',    en: 'Red' },
    { id: 'blue',   hex: '#2196F3', ar: 'أزرق',    en: 'Blue' },
    { id: 'yellow', hex: '#FFD600', ar: 'أصفر',    en: 'Yellow' },
    { id: 'green',  hex: '#43A047', ar: 'أخضر',    en: 'Green' },
    { id: 'orange', hex: '#FF9800', ar: 'برتقالي', en: 'Orange' },
    { id: 'purple', hex: '#9C27B0', ar: 'بنفسجي',  en: 'Purple' }
  ];

  let voices = {}; // id ← Blob

  async function load() {
    try {
      const all = await DB.getAllSounds();
      voices = {};
      all.forEach(s => {
        if (s.key.startsWith('color:')) voices[s.key.slice(6)] = s.blob;
      });
    } catch (e) {}
  }

  function name(c) {
    return I18N.lang === 'ar' ? c.ar : c.en;
  }

  function say(c, onEnd) {
    const v = voices[c.id];
    if (v) Sound.playBlob(v, onEnd);
    else Sound.speak(name(c), onEnd);
  }

  function setVoice(id, blob) {
    if (blob) voices[id] = blob;
    else delete voices[id];
  }

  function hasVoice(id) {
    return !!voices[id];
  }

  return { LIST, load, name, say, setVoice, hasVoice };
})();
