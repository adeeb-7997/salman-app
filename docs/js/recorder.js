// ===== مسجّل صوت مشترك (لأصوات العائلة وأسماء الألوان) =====
const Recorder = (() => {
  let rec = null;
  let stream = null;
  let timer = null;

  function isRecording() {
    return !!(rec && rec.state === 'recording');
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(tr => tr.stop());
      stream = null;
    }
  }

  // يبدأ التسجيل، ويرجع true إذا بدأ فعلاً
  // onStop(blob) يُستدعى عند الانتهاء (blob = null إذا أُلغي)
  async function start({ maxMs = 10000, onStart, onStop } = {}) {
    if (isRecording()) return false;
    if (!window.MediaRecorder || !navigator.mediaDevices) {
      App.toast(I18N.t('noRecorder'));
      return false;
    }
    Sound.stopAll();

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      App.toast(I18N.t('micDenied'));
      return false;
    }

    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
      .find(m => MediaRecorder.isTypeSupported(m));
    const chunks = [];
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec = r;

    r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stopStream();
      const blob = (!r._discard && chunks.length)
        ? new Blob(chunks, { type: r.mimeType || mime || 'audio/webm' })
        : null;
      if (rec === r) rec = null;
      if (onStop) onStop(blob);
    };

    r.start();
    if (onStart) onStart();
    timer = setTimeout(() => stop(false), maxMs);
    return true;
  }

  // إيقاف التسجيل (discard = true يلغي التسجيل)
  function stop(discard) {
    clearTimeout(timer);
    if (isRecording()) {
      rec._discard = !!discard;
      rec.stop();
    } else {
      stopStream();
    }
  }

  return { start, stop, isRecording };
})();
