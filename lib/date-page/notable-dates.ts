/** One entry of the date page's "Notable dates" list. */
export type NotableDate = {
  /** A YYYY-MM-DD the date page accepts (parseDatePageParam). */
  isoDate: string;
  /** Shown as the link's tooltip on desktop and as a line under it on phones. */
  description: string;
};

/**
 * Sprint 45, R1/R2: the fixed list that replaced Sprint 29's recent-readings
 * list. Twenty dates since 1900 from a one-time web search Master Controller
 * ran on 24 Nov 2026, each checked that day against the Wikipedia feed the
 * page uses, so each has an event for its own year (Sprint 39). The text is
 * the sprint file's R1 table, verbatim, oldest first.
 *
 * Built into the app on purpose: this module imports nothing, so the list
 * renders without the database or the network, including when the date
 * navigation's lookup fails.
 */
export const NOTABLE_DATES: readonly NotableDate[] = [
  { isoDate: "1912-04-15", description: "The Titanic sinks in the North Atlantic" },
  { isoDate: "1914-06-28", description: "Archduke Franz Ferdinand is assassinated in Sarajevo" },
  { isoDate: "1918-11-11", description: "The armistice ends fighting in World War I" },
  { isoDate: "1929-10-24", description: "Black Thursday begins the Wall Street Crash" },
  { isoDate: "1939-09-01", description: "Germany invades Poland, starting World War II" },
  { isoDate: "1944-06-06", description: "D-Day: the Allies land in Normandy" },
  { isoDate: "1945-05-08", description: "VE Day: the war in Europe ends" },
  { isoDate: "1945-08-06", description: "An atomic bomb is dropped on Hiroshima" },
  { isoDate: "1945-10-24", description: "The United Nations is founded" },
  { isoDate: "1947-08-15", description: "India becomes independent" },
  { isoDate: "1955-12-01", description: "Rosa Parks is arrested in Montgomery" },
  { isoDate: "1961-04-12", description: "Yuri Gagarin becomes the first person in space" },
  { isoDate: "1963-08-28", description: 'Martin Luther King Jr. gives his "I Have a Dream" speech' },
  { isoDate: "1963-11-22", description: "President John F. Kennedy is assassinated" },
  { isoDate: "1969-07-20", description: "Apollo 11 lands on the Moon" },
  { isoDate: "1986-01-28", description: "The Space Shuttle Challenger breaks apart" },
  { isoDate: "1989-11-09", description: "The Berlin Wall falls" },
  { isoDate: "1990-02-11", description: "Nelson Mandela is released from prison" },
  { isoDate: "2001-09-11", description: "The September 11 attacks" },
  { isoDate: "2020-03-11", description: "The WHO declares COVID-19 a pandemic" },
];
