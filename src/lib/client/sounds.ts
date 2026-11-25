"use client";

/**
 * Petits effets sonores synthétisés à la volée (Web Audio API) : pas de
 * fichier audio à charger. Les navigateurs (iOS surtout) n'autorisent le son
 * qu'après un geste de l'utilisateur : `primeAudio()` débloque le contexte
 * audio au premier toucher/clic de la page (par ex. "Valider mon
 * classement"), pour que la roue puisse sonner quand le résultat arrive
 * plus tard par le polling.
 */

const MUTE_KEY = "aparte:sound";

let ctx: AudioContext | null = null;
let primed = false;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** À appeler une fois au montage : débloque l'audio au premier geste. */
export function primeAudio() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const unlock = () => {
    const c = getContext();
    if (c) {
      // Un son silencieux joué pendant le geste finit de débloquer iOS.
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, c.sampleRate);
      src.connect(c.destination);
      src.start();
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function isMuted(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(MUTE_KEY) === "off";
}

export function setMuted(muted: boolean) {
  localStorage.setItem(MUTE_KEY, muted ? "off" : "on");
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
    noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/**
 * "Clac" de la languette de la roue qui tape sur un picot : un claquement
 * bref (bruit filtré) et un petit "toc" boisé dont la hauteur varie un peu
 * à chaque fois, pour ne pas sonner trop mécanique.
 */
export function playTick() {
  if (isMuted()) return;
  const c = getContext();
  if (!c || c.state !== "running") return;
  const t = c.currentTime;

  const noise = c.createBufferSource();
  noise.buffer = getNoise(c);
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2500 + Math.random() * 600;
  band.Q.value = 1.2;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.35, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
  noise.connect(band).connect(noiseGain).connect(c.destination);
  noise.start(t);
  noise.stop(t + 0.03);

  const osc = c.createOscillator();
  osc.type = "triangle";
  const base = 900 + Math.random() * 120;
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * 0.5, t + 0.04);
  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.18, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc.connect(oscGain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

/**
 * "Ta-da" quand le film choisi apparaît : arpège montant (do–mi–sol–do)
 * qui se pose sur un accord tenu, avec un léger scintillement aigu.
 */
export function playReveal() {
  if (isMuted()) return;
  const c = getContext();
  if (!c || c.state !== "running") return;
  const t = c.currentTime;

  const master = c.createGain();
  master.gain.value = 0.22;
  master.connect(c.destination);

  const note = (freq: number, start: number, duration: number, type: OscillatorType, level: number) => {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + start);
    g.gain.exponentialRampToValueAtTime(level, t + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + start + duration);
    osc.connect(g).connect(master);
    osc.start(t + start);
    osc.stop(t + start + duration + 0.05);
  };

  // Arpège rapide…
  const arpeggio = [523.25, 659.25, 783.99]; // do5, mi5, sol5
  arpeggio.forEach((f, i) => note(f, i * 0.07, 0.25, "triangle", 0.8));

  // …qui se pose sur l'accord final, tenu.
  const chordAt = arpeggio.length * 0.07;
  for (const f of [523.25, 659.25, 783.99, 1046.5]) {
    note(f, chordAt, 1.4, "triangle", 0.55);
    note(f * 2, chordAt, 0.9, "sine", 0.12); // brillance
  }

  // Scintillement : quelques notes aiguës en cascade.
  [2093, 2637, 3136, 2637].forEach((f, i) =>
    note(f, chordAt + 0.05 + i * 0.06, 0.35, "sine", 0.1)
  );
}
