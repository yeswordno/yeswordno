// --- SESLİ OKUMA MOTORU (TTS) ---
// App.jsx'ten taşındı; davranış birebir aynı (en-US, rate 0.9, tercihli ses seçimi).
// Hem App.jsx hem KabusGame.jsx buradan import eder.
export function speakText(text) {
  if (!window.speechSynthesis) return;

  // Varsa eski konuşmayı durdur
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; // Daima İngilizce okuyacak
  utterance.rate = 0.9;     // Tane tane okunması için hız ayarı
  utterance.pitch = 1;

  // En kaliteli sesi bulma (Google, Siri vb.)
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(voice =>
    (voice.lang === 'en-US' || voice.lang === 'en_US') && (
      voice.name.includes('Google') ||
      voice.name.includes('Samantha') ||
      voice.name.includes('Daniel') ||
      voice.name.includes('Premium')
    )
  );

  if (preferredVoice) utterance.voice = preferredVoice;
  window.speechSynthesis.speak(utterance);
}

// TTS desteği var mı? (Kâbus modunda yazılı fallback için)
export function ttsSupported() {
  return Boolean(window.speechSynthesis);
}
