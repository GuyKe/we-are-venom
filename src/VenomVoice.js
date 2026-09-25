// A one-shot "Venom" greeting spoken with the browser's built-in
// text-to-speech (no external audio asset or API needed) the moment the
// player actually starts the experience. Browsers block audio - including
// speech synthesis in most of them - until a real user gesture, so this is
// meant to be called from the intro-screen click / "Enter VR" handlers
// rather than at cold page load.
const GREETING = 'Hello, welcome to my game, I do not ask questions but break has started. Go.';

// Voice lists expose no reliable gender field, so picking a "male" one is
// just matching common male voice names against whatever the browser/OS
// happens to offer.
const MALE_VOICE_HINTS = ['male', 'david', 'daniel', 'alex', 'fred', 'george', 'mark', 'james', 'guy', 'aaron'];

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  const pool = english.length ? english : voices;

  const male = pool.find((v) => MALE_VOICE_HINTS.some((hint) => v.name.toLowerCase().includes(hint)));
  return male || pool[0];
}

let spoken = false;

/** Speaks the Venom intro line once; safe to call from multiple triggers
 * (intro click, VR session start) - only the first call actually speaks. */
export function speakVenomIntro() {
  if (spoken || !('speechSynthesis' in window)) return;
  spoken = true;

  const utter = new SpeechSynthesisUtterance(GREETING);
  utter.pitch = 0.6; // deeper and more menacing than a default voice
  utter.rate = 0.92; // a little slower and more deliberate
  utter.volume = 1;

  const voice = pickVoice();
  if (voice) {
    utter.voice = voice;
    window.speechSynthesis.speak(utter);
    return;
  }

  // Voices load asynchronously in some browsers (notably Chrome) - wait for
  // them, but not forever: if a browser never reports any voices at all,
  // speak anyway after a second rather than staying silent for good.
  let fired = false;
  const trySpeak = () => {
    if (fired) return;
    fired = true;
    utter.voice = pickVoice();
    window.speechSynthesis.speak(utter);
  };
  window.speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
  setTimeout(trySpeak, 1000);
}
