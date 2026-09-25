// Spoken lines via the browser's built-in text-to-speech (no external
// audio asset or API needed). Browsers block audio - including speech
// synthesis in most of them - until a real user gesture, so these are
// meant to be called from user-gesture handlers (intro click, VR session
// start, a trigger press) rather than at cold page load.

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

/**
 * Speaks `text` with a best-effort male voice. `onend` (if given) fires
 * once the utterance finishes or errors out, so callers can reset their
 * own "currently speaking" guards without guessing a duration.
 */
function speak(text, { pitch = 1, rate = 1, volume = 1, onend } = {}) {
  if (!('speechSynthesis' in window)) {
    if (onend) onend();
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.pitch = pitch;
  utter.rate = rate;
  utter.volume = volume;
  if (onend) {
    utter.addEventListener('end', onend, { once: true });
    utter.addEventListener('error', onend, { once: true });
  }

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

const GREETING = 'Hello, welcome to my game, I do not ask questions but break has started. Go.';
let greeted = false;

/** Speaks the Venom intro line once; safe to call from multiple triggers
 * (intro click, VR session start) - only the first call actually speaks. */
export function speakVenomIntro() {
  if (greeted) return;
  greeted = true;
  speak(GREETING, { pitch: 0.6, rate: 0.92 }); // deep and deliberate
}

const CARNAGE_DOOR_LINE =
  "Heh. That thing back there? It's hungry. Feed it enough of those little rainbow lights and it'll rip a hole straight out of this place. Go on... feed the door.";
let carnageSpeaking = false;

/** Speaks Carnage's line about the door; ignored if it's already mid-line
 * so repeated trigger presses don't stack overlapping utterances. */
export function speakCarnageLine() {
  if (carnageSpeaking) return;
  carnageSpeaking = true;
  speak(CARNAGE_DOOR_LINE, {
    pitch: 1.3, // higher and rougher than Venom's voice
    rate: 1.08,
    onend: () => {
      carnageSpeaking = false;
    },
  });
}
