import styles from "./flow-indicator.module.css";

/**
 * Sprint 24, R2-R4: the three-step journey (chart -> reading -> horoscope)
 * signposted on both /chart and /reading/[id], as one shared module
 * imported by both routes rather than duplicated per route (R4).
 *
 * Entirely presentational. `completedSteps` is the only prop, and it is a
 * plain number derived server-side by each caller from data it already
 * has -- app/chart/page.tsx from whether positions were computed,
 * app/reading/[id]/page.tsx from reading.horoscope being non-null. This
 * component holds no state of its own (no useState/useEffect/"use
 * client", R3): every render is a pure function of the prop.
 *
 * The step after the last completed one (if any) is "current"; anything
 * further along is "ahead". That single number is enough to reach all
 * four states R2's table lists:
 *   completedSteps 0 -> 1 current, 2/3 ahead        (/chart, no date)
 *   completedSteps 1 -> 1 done, 2 current, 3 ahead  (/chart, positions)
 *   completedSteps 2 -> 1/2 done, 3 current         (/reading, no horoscope)
 *   completedSteps 3 -> 1/2/3 done                  (/reading, horoscope)
 */

export type FlowIndicatorProps = {
  completedSteps: 0 | 1 | 2 | 3;
};

export type StepState = "done" | "current" | "ahead";

const STEP_LABELS = ["Chart", "Reading", "Horoscope"] as const;

/**
 * Pure and exported on its own so the four-state requirement (R2) can be
 * unit tested directly -- this project has no React rendering test setup
 * (every existing test targets a plain function), and adding one just for
 * this component would be new test infrastructure this sprint doesn't
 * need, when the state logic itself has no dependency on JSX at all.
 */
export function stepState(stepNumber: number, completedSteps: number): StepState {
  if (stepNumber <= completedSteps) return "done";
  if (stepNumber === completedSteps + 1) return "current";
  return "ahead";
}

export function FlowIndicator({ completedSteps }: FlowIndicatorProps) {
  return (
    <ol className={styles.flow} aria-label="Progress through chart, reading, and horoscope">
      {STEP_LABELS.map((label, index) => {
        const stepNumber = index + 1;
        const state = stepState(stepNumber, completedSteps);
        const isLast = stepNumber === STEP_LABELS.length;

        return (
          <li
            key={label}
            className={styles.step}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className={`${styles.marker} ${styles[state]}`} aria-hidden="true">
              {state === "done" ? "✓" : stepNumber}
            </span>
            <span className={`${styles.label} ${styles[state]}`}>{label}</span>
            {isLast ? null : (
              <span
                className={`${styles.connector} ${state === "done" ? styles.connectorDone : ""}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
