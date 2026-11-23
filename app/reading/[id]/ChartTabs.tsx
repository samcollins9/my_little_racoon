"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import styles from "./chartTabs.module.css";

/**
 * Sprint 37, R1/R2: the chart panel's tabs (Chart, Planets, Signs, Aspects).
 *
 * The only client component in the panel. Every tab's content is rendered
 * on the server by ReadingView and passed in as `content`; this component
 * only decides which one is visible.
 *
 * Two renderings, one markup tree:
 * - **Stacked** (the server render, and what stays on screen without
 *   JavaScript): every section visible, one under another, each under its
 *   own visible heading. No tab strip, because buttons that do nothing
 *   without JavaScript would be worse than none. Nothing is hidden.
 * - **Tabs** (once hydrated): the WAI-ARIA tabs pattern. A tablist of
 *   role="tab" buttons with aria-selected/aria-controls, role="tabpanel"
 *   sections with aria-labelledby, only the selected panel shown (the
 *   `hidden` attribute), roving tabindex, Left/Right/Home/End. Switching
 *   is a state change: no request, no URL change.
 *
 * The switch between the two is `useHydrated()` below. The panels are the
 * same <section> elements in both, so hydrating patches attributes on them
 * instead of re-creating the chart.
 */

export type ChartTab = {
  id: string;
  /** The tab's text, and the section heading in the stacked rendering. */
  label: string;
  content: ReactNode;
};

/**
 * The tab a key moves the selection to, or null for any other key. Left and
 * Right wrap around, as the WAI-ARIA pattern's examples do.
 */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

const subscribeNever = () => () => {};

/**
 * False in the server render and during hydration, true from the first
 * client render after it. useSyncExternalStore's server snapshot is what
 * React hydrates against, so the client starts out matching the stacked
 * server HTML and then re-renders as tabs. No effect, so there's no
 * setState inside one (react-hooks/set-state-in-effect).
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
}

/** R1: the first tab (Chart) is selected on every page load. Nothing remembers a choice. */
export const INITIAL_TAB_INDEX = 0;

export function ChartTabs({ tabs, label }: { tabs: ChartTab[]; label: string }) {
  const enhanced = useHydrated();
  const [selected, setSelected] = useState(INITIAL_TAB_INDEX);
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const idBase = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextTabIndex(event.key, selected, tabs.length);
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    // Roving tabindex: focus follows the selection.
    tabButtons.current[next]?.focus();
  };

  return (
    <ChartTabsView
      tabs={tabs}
      label={label}
      enhanced={enhanced}
      selected={selected}
      idBase={idBase}
      onSelect={setSelected}
      onKeyDown={onKeyDown}
      tabButtonRef={(index, element) => {
        tabButtons.current[index] = element;
      }}
    />
  );
}

type ChartTabsViewProps = {
  tabs: ChartTab[];
  /** The tablist's accessible name. */
  label: string;
  /** Hydrated: render as tabs. Otherwise stacked. */
  enhanced: boolean;
  selected: number;
  idBase: string;
  onSelect?: (index: number) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  tabButtonRef?: (index: number, element: HTMLButtonElement | null) => void;
};

/**
 * The markup for both renderings, with no hooks, so tests can render either
 * one directly (ChartTabs.test.tsx).
 */
export function ChartTabsView({
  tabs,
  label,
  enhanced,
  selected,
  idBase,
  onSelect,
  onKeyDown,
  tabButtonRef,
}: ChartTabsViewProps) {
  const tabId = (id: string) => `${idBase}-tab-${id}`;
  const panelId = (id: string) => `${idBase}-panel-${id}`;
  const headingId = (id: string) => `${idBase}-heading-${id}`;

  return (
    <div className={enhanced ? `${styles.tabs} ${styles.enhanced}` : `${styles.tabs} ${styles.stacked}`}>
      {enhanced ? (
        <div role="tablist" aria-label={label} className={styles.tablist}>
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(element) => tabButtonRef?.(i, element)}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={i === selected}
              aria-controls={panelId(tab.id)}
              tabIndex={i === selected ? 0 : -1}
              className={styles.tab}
              onClick={() => onSelect?.(i)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}
      {tabs.map((tab, i) => (
        <section
          key={tab.id}
          id={panelId(tab.id)}
          className={styles.panel}
          data-tab={tab.id}
          role={enhanced ? "tabpanel" : undefined}
          aria-labelledby={enhanced ? tabId(tab.id) : headingId(tab.id)}
          tabIndex={enhanced ? 0 : undefined}
          hidden={enhanced && i !== selected}
        >
          {/* Stacked only: the tab names the panel once there are tabs. */}
          <h2 id={headingId(tab.id)} className={styles.stackedHeading} hidden={enhanced}>
            {tab.label}
          </h2>
          {tab.content}
        </section>
      ))}
    </div>
  );
}
