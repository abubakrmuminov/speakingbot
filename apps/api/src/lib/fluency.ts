import { FLUENCY_WEIGHTS } from '@speaking-coach/shared';

interface FluencyInput {
  wordsPerMinute: number;
  pauseCount: number;
  errorCount: number;
  confidenceLevel: number; // 1–5
}

/**
 * Calculates fluency score (0–100) from Gemini-provided metrics.
 *
 * Formula:
 *   base = 60
 *   + confidenceLevel * 4          (max +20)
 *   + min(wpm - 80, 20)            (speed bonus, capped at +20)
 *   - errorCount * 4               (penalty per error)
 *   - pauseCount * 2               (penalty per long pause >1.5s)
 *   clamped to [0, 100]
 */
export function calculateFluencyScore({
  wordsPerMinute,
  pauseCount,
  errorCount,
  confidenceLevel,
}: FluencyInput): number {
  const { BASE, CONFIDENCE_MULTIPLIER, SPEED_BONUS_CAP, SPEED_BASELINE_WPM, ERROR_PENALTY, PAUSE_PENALTY } =
    FLUENCY_WEIGHTS;

  const confidenceBonus = confidenceLevel * CONFIDENCE_MULTIPLIER;
  const speedBonus = Math.min(wordsPerMinute - SPEED_BASELINE_WPM, SPEED_BONUS_CAP);
  const errorDeduction = errorCount * ERROR_PENALTY;
  const pauseDeduction = pauseCount * PAUSE_PENALTY;

  const raw = BASE + confidenceBonus + speedBonus - errorDeduction - pauseDeduction;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
