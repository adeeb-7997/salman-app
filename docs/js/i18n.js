// ===== اللغات: لإضافة لغة جديدة أضف كائناً جديداً بنفس المفاتيح =====
const I18N = (() => {
  const STRINGS = {
    ar: {
      appTitle: 'ألعاب سلمان',
      game_who: 'مين هذا؟',
      game_peek: 'الغميضة',
      game_balloons: 'البالونات',
      soon: 'قريباً',
      holdToOpen: 'اضغط مطولاً على القفل 3 ثوانٍ',
      parentTitle: 'وضع الوالدين',
      close: 'إغلاق',
      family: 'العائلة',
      addPerson: 'إضافة شخص',
      empty: 'لا يوجد أحد بعد. أضف أول شخص من العائلة.',
      settings: 'الإعدادات',
      language: 'اللغة',
      name: 'الاسم',
      namePh: 'مثال: بابا، ماما، جدتي',
      photo: 'الصورة',
      pickPhoto: '📷 التقط أو اختر صورة',
      voice: 'الصوت',
      voiceHint: 'مثال: «هلا سلمان، أنا بابا!» — حتى 10 ثوانٍ',
      record: '🎙️ ابدأ التسجيل',
      stop: '⏹️ إيقاف',
      reRecord: '🎙️ إعادة التسجيل',
      play: '▶️ تشغيل',
      recording: 'جاري التسجيل…',
      recorded: 'تم التسجيل ✓',
      micDenied: 'لم يتم السماح باستخدام الميكروفون',
      noRecorder: 'المتصفح لا يدعم التسجيل',
      stopFirst: 'أوقف التسجيل أولاً',
      save: 'حفظ',
      cancel: 'إلغاء',
      saved: 'تم الحفظ ✓',
      saveError: 'تعذر الحفظ، حاول مرة أخرى',
      photoError: 'تعذر قراءة الصورة',
      needNamePhoto: 'أدخل الاسم وأضف صورة',
      confirmDelete: 'حذف «{name}»؟',
      noVoice: 'بدون صوت',
      moveUp: 'تقديم',
      noPeople: 'أضف أفراد العائلة أولاً من وضع الوالدين 🔒',
      holdToExit: 'اضغط مطولاً على 🏠 للخروج'
    },
    en: {
      appTitle: "Salman's Games",
      game_who: 'Who is this?',
      game_peek: 'Peekaboo',
      game_balloons: 'Balloons',
      soon: 'Soon',
      holdToOpen: 'Press and hold the lock for 3 seconds',
      parentTitle: 'Parent mode',
      close: 'Close',
      family: 'Family',
      addPerson: 'Add person',
      empty: 'No one yet. Add the first family member.',
      settings: 'Settings',
      language: 'Language',
      name: 'Name',
      namePh: 'e.g. Dad, Mom, Grandma',
      photo: 'Photo',
      pickPhoto: '📷 Take or choose a photo',
      voice: 'Voice',
      voiceHint: 'e.g. "Hi Salman, it\'s Dad!" — up to 10 seconds',
      record: '🎙️ Start recording',
      stop: '⏹️ Stop',
      reRecord: '🎙️ Record again',
      play: '▶️ Play',
      recording: 'Recording…',
      recorded: 'Recorded ✓',
      micDenied: 'Microphone permission denied',
      noRecorder: 'Recording is not supported',
      stopFirst: 'Stop recording first',
      save: 'Save',
      cancel: 'Cancel',
      saved: 'Saved ✓',
      saveError: 'Could not save, try again',
      photoError: 'Could not read the photo',
      needNamePhoto: 'Enter a name and add a photo',
      confirmDelete: 'Delete "{name}"?',
      noVoice: 'No voice',
      moveUp: 'Move up',
      noPeople: 'Add family members first from parent mode 🔒',
      holdToExit: 'Press and hold 🏠 to exit'
    }
  };

  let lang = 'ar';
  try { lang = localStorage.getItem('lang') || 'ar'; } catch (e) {}
  if (!STRINGS[lang]) lang = 'ar';

  function t(key, vars) {
    let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.ar[key] ?? key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  function apply(root = document) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.title = t('appTitle');
  }

  function setLang(l) {
    if (!STRINGS[l]) return;
    lang = l;
    try { localStorage.setItem('lang', l); } catch (e) {}
    apply();
  }

  return { t, apply, setLang, get lang() { return lang; } };
})();
