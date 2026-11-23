import type { ReactNode } from "react";
import type { PlanetPosition } from "@/lib/ephemeris/adapter";
import type { Aspect } from "@/lib/ephemeris/aspects";
import {
  aspectKeyRows,
  aspectRows,
  planetRows,
  signRows,
  type AspectLineStyle,
  type KeySymbol,
} from "./chartKey";
import { RETROGRADE_GLYPH } from "./constellation";
import styles from "./chartTabs.module.css";

/**
 * Sprint 37, R3–R5: the Planets, Signs and Aspects tabs' contents. Server
 * components; ChartTabs receives them already rendered. Each table is a key
 * first and a data table second: the symbol-and-name column is the row
 * header, is never hidden, and stays pinned if a table ever has to scroll
 * sideways (R6, chartTabs.module.css).
 */

/** A glyph and its name. The glyph is decoration for a screen reader, which reads the name. */
function GlyphName({ symbol }: { symbol: KeySymbol }) {
  return (
    <span className={styles.symbol}>
      <span className={styles.glyph} aria-hidden="true">
        {symbol.glyph}
      </span>
      {symbol.name}
    </span>
  );
}

/** R5a: a short length of an aspect's line, drawn with the chart's own stroke values. */
function AspectSwatch({ line }: { line: AspectLineStyle }) {
  return (
    <svg className={styles.swatch} width="36" height="10" viewBox="0 0 36 10" aria-hidden="true" focusable="false">
      <line
        x1="3"
        y1="5"
        x2="33"
        y2="5"
        stroke={line.color}
        strokeWidth={line.width}
        strokeDasharray={line.dash}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The table's own horizontal scroll container: R6's last resort, never the page. */
function KeyTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.keyTable}>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function PlanetsTable({ positions }: { positions: PlanetPosition[] }) {
  return (
    <div className={styles.keyPanel}>
      <KeyTable caption="Planets in this chart">
        <thead>
          <tr>
            <th scope="col">Planet</th>
            <th scope="col">Sign</th>
            <th scope="col" className={styles.coordinate}>
              Position
            </th>
            <th scope="col" className={styles.markColumn}>
              <span aria-hidden="true">{RETROGRADE_GLYPH}</span>
              <span className={styles.visuallyHidden}>Retrograde</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {planetRows(positions).map((row) => (
            <tr key={row.planet.name}>
              <th scope="row" className={styles.symbolCell}>
                <GlyphName symbol={row.planet} />
              </th>
              <td>
                <GlyphName symbol={row.sign} />
              </td>
              <td className={styles.coordinate}>{row.position}</td>
              <td className={styles.markColumn}>
                {row.retrograde ? (
                  <>
                    <span aria-hidden="true">{RETROGRADE_GLYPH}</span>
                    <span className={styles.visuallyHidden}>retrograde</span>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </KeyTable>
      <p className={styles.keyNote}>{RETROGRADE_GLYPH} = retrograde (apparent backward motion)</p>
    </div>
  );
}

export function SignsTable({ positions }: { positions: PlanetPosition[] }) {
  return (
    <div className={styles.keyPanel}>
      <KeyTable caption="The twelve signs, and the planets in each">
        <thead>
          <tr>
            <th scope="col">Sign</th>
            <th scope="col">Element</th>
            <th scope="col">Modality</th>
            <th scope="col">Planets</th>
          </tr>
        </thead>
        <tbody>
          {signRows(positions).map((row) => (
            <tr key={row.sign.name} className={row.occupied ? styles.occupied : styles.unoccupied}>
              <th scope="row" className={styles.symbolCell}>
                <GlyphName symbol={row.sign} />
              </th>
              <td>{row.element}</td>
              <td>{row.modality}</td>
              <td>
                {row.occupied ? (
                  <ul className={styles.planetList}>
                    {row.planets.map((planet) => (
                      <li key={planet.name}>
                        <GlyphName symbol={planet} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.visuallyHidden}>none</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </KeyTable>
      <p className={styles.keyNote}>Highlighted signs hold at least one planet.</p>
    </div>
  );
}

/** Shown in place of the aspects table when a chart has none (R5b). */
export const NO_ASPECTS_TEXT = "No aspects in this chart.";

export function AspectsPanel({ aspects }: { aspects: Aspect[] }) {
  const rows = aspectRows(aspects);

  return (
    <div className={styles.keyPanel}>
      <h3 className={styles.keySubheading}>Line key</h3>
      <KeyTable caption="What each line on the chart means">
        <thead>
          <tr>
            <th scope="col">Aspect</th>
            <th scope="col">Angle</th>
          </tr>
        </thead>
        <tbody>
          {aspectKeyRows().map((row) => (
            <tr key={row.aspect}>
              <th scope="row" className={styles.symbolCell}>
                <span className={styles.symbol}>
                  <AspectSwatch line={row.line} />
                  {row.label}
                </span>
              </th>
              <td>{row.angle}</td>
            </tr>
          ))}
        </tbody>
      </KeyTable>
      {/* computeThreads/ReadingView: stroke width is ASPECT_BASE_WIDTH, fixed
          per aspect type; tightness sets the line's opacity (0.35 + 0.5 ×
          tightness). So weight means type and brightness means tightness. */}
      <p className={styles.keyNote}>
        A line&rsquo;s weight and dash show its aspect type. The brighter the line, the tighter the
        aspect.
      </p>

      <h3 className={styles.keySubheading}>This chart&rsquo;s aspects</h3>
      {rows.length === 0 ? (
        <p className={styles.keyEmpty}>{NO_ASPECTS_TEXT}</p>
      ) : (
        <KeyTable caption="This chart's aspects, tightest first">
          <thead>
            <tr>
              <th scope="col">Planet</th>
              <th scope="col">Aspect</th>
              <th scope="col">Planet</th>
              <th scope="col" className={styles.coordinate}>
                Orb
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.planetA.name}-${row.planetB.name}`}>
                <th scope="row" className={styles.symbolCell}>
                  <GlyphName symbol={row.planetA} />
                </th>
                <td>
                  <span className={styles.symbol}>
                    <AspectSwatch line={row.line} />
                    {row.label}
                  </span>
                </td>
                <td>
                  <GlyphName symbol={row.planetB} />
                </td>
                <td className={styles.coordinate}>{row.orb}</td>
              </tr>
            ))}
          </tbody>
        </KeyTable>
      )}
    </div>
  );
}
