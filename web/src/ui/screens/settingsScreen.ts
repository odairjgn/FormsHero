// Etapa 5's settings screen — port of the plan's "Calibração e polimento":
// a tap-to-the-beat calibration test for audio/input offset, plus the
// judgment-window and scroll-speed knobs the plan calls "ajustes finos...
// com base em playtesting", made player-adjustable instead of hardcoded.
// No C# equivalent — the original project never judged timing at all (see
// `core/gameplay`'s header comments).
//
// The tap test and its `AudioContext` beeps are DOM/Web-Audio glue, so —
// same reasoning as `noteHighway.ts`'s and `createAudioEngine.ts`'s header
// comments — this file isn't unit-tested; only the pure offset math it
// calls (`computeCalibrationOffsetMs`) is.

import { computeCalibrationOffsetMs } from "../../core/settings/calibration.ts";
import { DEFAULT_GAME_SETTINGS, SETTINGS_LIMITS } from "../../core/settings/gameSettings.ts";
import type { GameSettings } from "../../core/settings/types.ts";

export interface SettingsCallbacks {
  onBack(): void;
  onSave(settings: GameSettings): void;
}

/** Metronome tempo for the calibration tap test — 100 BPM, a comfortable
 * "tap along" pace, not tied to any song's actual tempo. */
const BEAT_INTERVAL_SEC = 0.6;
/** Beeps before the first one that counts, so the player has the beat
 * before their taps start being measured. */
const LEAD_IN_BEATS = 2;
const COUNTED_BEATS = 8;
const TOTAL_BEATS = LEAD_IN_BEATS + COUNTED_BEATS;

export function renderSettingsScreen(
  container: HTMLElement,
  audioContext: AudioContext,
  initialSettings: GameSettings,
  callbacks: SettingsCallbacks,
): void {
  let settings = initialSettings;
  let stopCalibration: (() => void) | null = null;

  function render(): void {
    const { calibrationOffsetMs, hitWindowsMs, scrollPxPerMs } = settings;
    const limits = SETTINGS_LIMITS;

    container.innerHTML = `
      <div class="screen settings">
        <button id="back-btn" type="button">&larr; Voltar</button>
        <h1>Configurações</h1>

        <section>
          <h2>Calibração de áudio/input</h2>
          <p>Offset atual: <strong id="offset-value">${calibrationOffsetMs} ms</strong>
             (positivo = suas teclas chegam atrasadas em relação ao áudio)</p>
          <p>Ao iniciar, ${TOTAL_BEATS} cliques tocarão em ritmo constante. Aperte
             <kbd>ESPAÇO</kbd> junto com cada clique, começando do segundo.</p>
          <button id="calibrate-btn" type="button">Iniciar calibração</button>
          <p id="calibration-status" class="status"></p>
        </section>

        <section>
          <h2>Janelas de julgamento (ms)</h2>
          <label>Perfeito: <input id="window-perfect" type="number" min="${limits.hitWindowMs.min}" max="${limits.hitWindowMs.max}" value="${hitWindowsMs.perfect}" /></label>
          <label>Bom: <input id="window-good" type="number" min="${limits.hitWindowMs.min}" max="${limits.hitWindowMs.max}" value="${hitWindowsMs.good}" /></label>
          <label>Aceitável: <input id="window-ok" type="number" min="${limits.hitWindowMs.min}" max="${limits.hitWindowMs.max}" value="${hitWindowsMs.ok}" /></label>
        </section>

        <section>
          <h2>Velocidade de scroll (px/ms)</h2>
          <label><input id="scroll-speed" type="number" step="0.05" min="${limits.scrollPxPerMs.min}" max="${limits.scrollPxPerMs.max}" value="${scrollPxPerMs}" /></label>
        </section>

        <button id="save-btn" type="button">Salvar</button>
        <button id="reset-btn" type="button">Restaurar padrões</button>
      </div>
    `;

    container.querySelector<HTMLButtonElement>("#back-btn")!.addEventListener("click", () => {
      stopCalibration?.();
      callbacks.onBack();
    });

    container.querySelector<HTMLButtonElement>("#calibrate-btn")!.addEventListener("click", () => {
      stopCalibration?.();
      stopCalibration = runCalibration(container, audioContext, (offsetMs) => {
        settings = { ...settings, calibrationOffsetMs: offsetMs };
        render();
      });
    });

    container.querySelector<HTMLButtonElement>("#reset-btn")!.addEventListener("click", () => {
      settings = DEFAULT_GAME_SETTINGS;
      render();
    });

    container.querySelector<HTMLButtonElement>("#save-btn")!.addEventListener("click", () => {
      const perfect = readNumber("#window-perfect", hitWindowsMs.perfect);
      const good = readNumber("#window-good", hitWindowsMs.good);
      const ok = readNumber("#window-ok", hitWindowsMs.ok);
      // Keep the tightest-to-widest ordering `classifyTiming` assumes, even
      // if the player typed them in a different order.
      const [orderedPerfect, orderedGood, orderedOk] = [perfect, good, ok].sort((a, b) => a - b);

      settings = {
        calibrationOffsetMs: settings.calibrationOffsetMs,
        hitWindowsMs: { perfect: orderedPerfect, good: orderedGood, ok: orderedOk },
        scrollPxPerMs: readNumber("#scroll-speed", scrollPxPerMs),
      };
      callbacks.onSave(settings);
    });

    function readNumber(selector: string, fallback: number): number {
      const raw = container.querySelector<HTMLInputElement>(selector)!.value;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
  }

  render();
}

/**
 * Runs the tap-along beat sequence: schedules `TOTAL_BEATS` short beeps at
 * `BEAT_INTERVAL_SEC` apart starting slightly in the future (so the first
 * beep isn't clipped by scheduling latency), collects a `context.currentTime`
 * timestamp for every non-repeat spacebar press during the run, then hands
 * the computed offset to `onResult`. Returns a function that cancels the
 * run early (e.g. the player navigates away) without reporting a result.
 */
function runCalibration(container: HTMLElement, context: AudioContext, onResult: (offsetMs: number) => void): () => void {
  const statusEl = container.querySelector<HTMLParagraphElement>("#calibration-status")!;
  const startAt = context.currentTime + 0.2;
  const beatTimesMs: number[] = [];
  const tapTimesMs: number[] = [];
  let cancelled = false;

  for (let i = 0; i < TOTAL_BEATS; i++) {
    const beatTimeSec = startAt + i * BEAT_INTERVAL_SEC;
    playClick(context, beatTimeSec);
    if (i >= LEAD_IN_BEATS) beatTimesMs.push(beatTimeSec * 1000);
  }

  statusEl.textContent = "Ouvindo... aperte ESPAÇO no ritmo dos cliques.";

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== "Space" || event.repeat) return;
    tapTimesMs.push(context.currentTime * 1000);
  };
  window.addEventListener("keydown", onKeyDown);

  const totalDurationMs = (TOTAL_BEATS - 1) * BEAT_INTERVAL_SEC * 1000 + 500;
  const timeoutHandle = window.setTimeout(() => {
    window.removeEventListener("keydown", onKeyDown);
    if (cancelled) return;

    const offsetMs = computeCalibrationOffsetMs(beatTimesMs, tapTimesMs);
    statusEl.textContent =
      tapTimesMs.length >= 3
        ? `Calibração concluída: offset de ${offsetMs} ms.`
        : "Poucas batidas detectadas — tente novamente.";
    onResult(offsetMs);
  }, totalDurationMs);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutHandle);
    window.removeEventListener("keydown", onKeyDown);
  };
}

/** A short, percussive click — an oscillator burst with a fast decay
 * envelope, cheaper than decoding a real audio asset for a UI beep. */
function playClick(context: AudioContext, whenSec: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.001, whenSec);
  gain.gain.exponentialRampToValueAtTime(0.5, whenSec + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, whenSec + 0.05);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(whenSec);
  oscillator.stop(whenSec + 0.06);
}
