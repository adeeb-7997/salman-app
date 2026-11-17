// ===== ميزات خاصة بتطبيق أندرويد (Capacitor) =====
// في المتصفح هذا الملف لا يسوي شيء. داخل التطبيق: يخفي شريط الحالة ويتحكم بزر الرجوع.
const Native = (() => {
  const cap = window.Capacitor;
  const isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

  function quiet(p) {
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  function init({ onBack, onPause }) {
    if (!isNative || typeof cap.registerPlugin !== 'function') return;

    let AppPlugin, StatusBar;
    try {
      AppPlugin = cap.registerPlugin('App');
      StatusBar = cap.registerPlugin('StatusBar');
    } catch (e) {
      return;
    }

    // إخفاء شريط الحالة (الساعة والإشعارات) حتى ما يلمسه الطفل
    try { quiet(StatusBar.hide()); } catch (e) {}

    // زر الرجوع: بدل ما يطلع من التطبيق، نتحكم فيه نحن
    try { quiet(AppPlugin.addListener('backButton', () => onBack())); } catch (e) {}

    // إيقاف الأصوات إذا انتقل التطبيق للخلفية، وإعادة إخفاء الشريط عند الرجوع
    try {
      quiet(AppPlugin.addListener('appStateChange', state => {
        if (!state.isActive) onPause();
        else { try { quiet(StatusBar.hide()); } catch (e) {} }
      }));
    } catch (e) {}
  }

  return { isNative, init };
})();
