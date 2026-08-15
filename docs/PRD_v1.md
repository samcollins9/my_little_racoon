Retroactive Horoscope — Product Requirements Document

Status: Draft v1 Author: Sam Collins Date: August 15, 2026

1. Summary

A web tool for practicing astrologers that reconstructs the astrological conditions of any past date and explains what happened on that date in terms of those conditions. The astrologer enters a date (and place), optionally describes the event, and receives two things: a ranked evidence sheet of the astrological factors in play, and a draft reading built from those factors in which every sentence traces back to a specific factor.

V1 is a single-practitioner web app using mundane (transit-only) charts — no natal data required.

2. Problem

Astrologers routinely do retrospective work: a client asks why a hard year was hard, a practitioner builds a case study, a teacher demonstrates technique on a historical event. Today that means manually casting a chart in one program, cross-referencing significations from books or memory, deciding which of forty simultaneous factors actually mattered, and writing it up from scratch. It is slow, and the hardest part — deciding what mattered — gets no support at all.

The bottleneck is not chart calculation. Free ephemeris software has solved that for thirty years. The bottleneck is selection and articulation: which of the many things happening in the sky on a given day deserve to carry the explanation, and how to write that up in language a client will find meaningful rather than generic.

3. Users

Primary: the working astrologer. Runs a consultation practice, sees clients, charges for readings. Opinionated about technique — has a house system, a zodiac, and an orb policy, and will abandon a tool that quietly disagrees with them. Values speed but will not trade away defensibility; if a client asks "why do you say that," they need an answer.

Secondary: the astrology teacher / content producer. Builds case studies of historical events for courses, newsletters, or social content. Cares more about volume and presentation than about client-specific nuance.

Jobs to be done

"A client asked about a specific hard period. Show me what was going on so I can explain it."
"I want to demonstrate that the technique works, in a way that doesn't look like I fit the story to the answer."
"I need a case study written up by Thursday."
4. Positioning: what "accurate" can mean here

Worth stating plainly at the top, because it drives a major design decision.

A prediction made after the event is not a prediction, and everyone in the room knows it. Any tool that produces post-hoc explanations will produce something that feels accurate, because with enough factors in the sky on any given day, some subset will always match any story. That is a property of the method, not evidence for it. If the product's entire value proposition is "it explains what happened," it delivers a result that cannot fail — and a result that cannot fail cannot persuade anyone who isn't already persuaded.

So the product should be honest about which of two distinct values it delivers:

Interpretive labor (informed mode). The astrologer knows the event and wants the chart work done fast and well. Value is time saved and articulation quality. No epistemic claim is being made; this is a professional's drafting tool. This is most of the daily usage.

Unprimed reading (blind mode). The tool reads the date's conditions without being told what happened, and the astrologer or client compares afterward. This is the only mode that produces anything like a testable claim, and it is therefore the mode that carries the product's credibility. It is also the mode that will look worse on any given trial — which is the point.

Design implication: blind mode must be genuinely blind, and the UI must make that visible. If a reading is generated in blind mode, it is timestamped and locked before the event description field is enabled, and the saved record shows the order of operations. Without that lock, blind mode is a UI affordance rather than a claim, and sophisticated users will notice.

5. Goals and non-goals

Goals

Cast an accurate mundane chart for any date/time/place from roughly 1500 CE to present.
Extract and rank the astrological factors in play, with transparent scoring.
Produce a client-ready draft reading in which every claim is traceable to a factor.
Respect the astrologer's own technical settings rather than imposing a house style.
Preserve the integrity of blind mode as a distinct, verifiable operation.

Non-goals for v1

Natal charts, transits-to-natal, synastry, progressions, time-lord techniques.
Forward prediction. (Deliberate — see §11.)
Multi-user practices, client rosters, billing.
Mobile apps.
Automated interpretation of why a factor means what it means. The tool cites tradition; it does not invent doctrine.
6. Core concepts

Chart — the calculated sky for a moment and place: planetary positions, angles, houses, aspects, dignities, sect.

Factor — one discrete, scoreable astrological condition. Saturn square Sun, 1°14' applying is a factor. Mars retrograde in Cancer, in fall is a factor. Each factor gets a stable ID (F-07) used for traceability.

Reading — a saved artifact combining a chart, a mode (blind/informed), a ranked factor set, a draft, and the astrologer's edits. Immutable once locked in blind mode.

7. Requirements
7.1 Input
Field	Required	Notes
Date	Yes	Calendar picker with manual entry; must accept historical dates
Time	No	Defaults to noon local when unknown; UI must flag that angles and houses are unreliable without a time
Place	Yes	Geocoded; resolves to lat/long and historical timezone
Mode	Yes	Blind or Informed — chosen before generation, not after
Event description	Informed only	Free text; disabled and greyed in blind mode
Event category	Informed only	Optional taxonomy tag (career, relationship, finance, health, relocation, loss, travel, legal, creative) used to weight significators

Time-unknown handling is not a footnote. Most retrospective events have a date but not a timestamp. When time is absent, the tool must suppress all house-based and angle-based factors rather than silently computing them from a noon default, and must say so in the UI. Producing an Ascendant for an event whose time nobody knows is the single fastest way to lose a professional user's trust.

7.2 Chart engine
Positions for the seven traditional planets plus Uranus, Neptune, Pluto; Chiron and the mean/true lunar nodes as options.
Configurable house system: Whole Sign, Placidus, Regiomontanus, Equal, Koch, Campanus. Whole Sign and Placidus are the two that matter; the rest are table stakes for credibility.
Configurable zodiac: tropical or sidereal, with ayanamsa selection (Lahiri, Fagan–Bradley) when sidereal.
Aspects: the five Ptolemaic aspects by default (conjunction, sextile, square, trine, opposition); minor aspects (semisextile, semisquare, sesquiquadrate, quincunx) as an opt-in.
Applying vs. separating must be computed and displayed. For event work this distinction carries real interpretive weight and its absence would be conspicuous.
Configurable orbs, per aspect and per planet, with a sensible default set the user can override and save.
Essential dignity: domicile, exaltation, triplicity, bound/term, face/decan, detriment, fall. Term and triplicity tables vary by author — expose the choice (Egyptian vs. Ptolemaic terms; Dorothean vs. Ptolemaic triplicity rulers) rather than picking one silently.
Sect: diurnal/nocturnal determination and sect-based benefic/malefic weighting.
Additional conditions: retrograde status, stations (within N days), combustion and cazimi, void-of-course Moon, lunar phase, eclipses (with proximity to the date), planetary ingresses near the date, outer-planet sign changes.

Historical accuracy constraints. Timezone data before roughly 1900 is genuinely uncertain and local mean time was common; the tool must degrade honestly, showing a confidence note rather than a false precision. Julian-to-Gregorian calendar transition varies by country (1582 in Catholic Europe, 1752 in Britain and its colonies, 1918 in Russia) — dates in the ambiguous window must prompt the user to confirm which calendar their source used. Both of these will otherwise produce silently wrong charts for exactly the historical events users most want to analyze.

7.3 Factor extraction and scoring

Every chart yields dozens of candidate factors. The product's core intelligence is ranking them. Proposed scoring inputs:

Orb tightness — inverse-weighted; a 0°20' square outranks a 6° square.
Applying vs. separating — applying weighted higher for event causation.
Angularity — planets on the angles weighted up (suppressed when time is unknown).
Dignity and debility — a planet in fall or detriment scores higher as a difficulty signifier; a dignified planet scores higher as a benefit signifier.
Speed and station — a stationing planet weighted substantially up.
Rarity — outer-planet configurations, eclipses, and great conjunctions weighted up because they are uncommon and therefore more explanatory.
Sect status — malefic contrary to sect weighted up for difficulty.
Category match (informed mode only) — factors involving the significators of the stated event category weighted up. Career weights Sun, Saturn, MC and the 10th; relationship weights Venus, the 7th; finance weights Jupiter, Venus, the 2nd and 8th; and so on. This mapping must be visible and editable, not a black box.

The scoring weights themselves must be inspectable and adjustable in settings. An astrologer who disagrees with the ranking and cannot change it will conclude the tool doesn't know what it's doing.

Blind mode runs the same pipeline with category weighting disabled and no event text in scope. It must be architecturally impossible for event text to reach the scorer in blind mode — not merely conditionally skipped.

7.4 Evidence sheet

For each ranked factor:

Factor ID and plain-language name (F-03 · Saturn square Sun, applying, 1°14')
Score and a short explanation of the score's components
Traditional signification, with attribution to a named source tradition rather than an unsourced assertion
Applying/separating, exact date of perfection
Pin / dismiss controls — the astrologer curates the set before drafting
Manual factor addition, for anything the engine missed or the astrologer sees differently

Astrologer curation is a requirement, not a convenience. It is also the highest-value data the product collects (see §9).

7.5 Draft generation

Given the curated factor set, generate a written retroactive reading.

Traceability is the defining constraint. Every substantive sentence in the draft carries a reference to the factor(s) it derives from, rendered as an inline marker in the editor and available as a hover. A sentence that cannot be traced to a pinned factor cannot appear in the draft. This is what lets the astrologer defend the reading line by line when a client pushes back, and it is the feature most likely to distinguish this product from a generic chatbot prompt.

Draft structure:

Conditions overview — the shape of the sky that day
Primary signature — the two or three highest-scored factors, developed
Supporting conditions — secondary factors
Timing — when the configuration perfected, when it began and released
Interpretation — the astrologer's territory; the tool provides a scaffold, not a conclusion

The astrologer edits freely. Edits are diffed against the generated text and retained (§9).

7.6 Quality bar: the specificity requirement

Generated astrological prose drifts toward statements that are true of everyone. "This was a period of change and inner tension" is the failure mode, and it is a seductive one because it makes any reading appear to fit. It also makes the product worthless to a professional, whose entire craft is the part that isn't generic.

Enforce at generation:

Every claim names a specific factor and makes a specific assertion about a specific domain.
Banned constructions: unfalsifiable hedges ("you may have felt..."), universal emotional claims, and second-person predictions with no astrological referent.
Prefer concrete timing language ("the square perfected on the 14th and separated through early April") over atmospheric language.
Ship an automated check that flags draft sentences with no factor reference or with hedge-phrase density above a threshold.
7.7 Save, export, share
Readings saved to a personal library, searchable by date, place, category, and factor.
Blind-mode readings locked with a generation timestamp and an audit trail showing the event description was added afterward.
Export to PDF and to formatted text. PDF gets a simple, professional layout the astrologer can send to a client, with optional practice name and logo.
Chart wheel rendered as an image in the export.
8. User flow
Astrologer creates a new reading, picks mode.
Enters date, time (or marks unknown), place.
Blind: generates immediately; reading locks. Event description unlocks only after the lock. Informed: enters event description and/or category, generates.
Reviews the evidence sheet, pins and dismisses factors, adds any of their own.
Generates draft from the curated set.
Edits in place with traceability markers visible.
Exports or saves.
9. Metrics

Conventional accuracy metrics don't apply — there is no ground truth for whether a reading is right. Measure the things that are actually observable:

Primary — draft retention rate. Proportion of generated draft text surviving to export, measured by diff. If astrologers rewrite 80% of what the tool produces, the drafting feature isn't working regardless of how much they like the evidence sheet. Target: >50% retention by month three.

Factor acceptance rate. Proportion of top-ranked factors the astrologer pins vs. dismisses. This is a direct signal on ranking quality and the cleanest training input available. Target: >60% of the top five pinned.

Manual factor additions. How often the astrologer adds something the engine missed, and what. Each addition is a gap in extraction — track and close them.

Time to completed reading. Against a self-reported baseline for their current manual process.

Blind-mode usage rate. Low usage tells you the credibility positioning isn't landing and the product is really just a drafting tool. That's a legitimate outcome but you want to know it early.

Retention. Weekly active practitioners at week 8. For a professional tool, sporadic usage means it didn't enter the workflow.

10. Risks
Risk	Response
Technical settings mismatch. An astrologer sees a Placidus chart when they use Whole Sign and stops trusting everything.	Settings configured at onboarding, before first reading. House system and zodiac shown on every chart.
Barnum drift. Drafts converge on universally-true prose.	Specificity requirement (§7.6) enforced at generation with an automated check.
Doctrine invention. The generator asserts astrological rules that don't exist in any tradition.	Interpretations drawn from a curated signification database with source attribution, not free generation. The model composes prose from retrieved meanings; it does not supply the meanings.
Silent historical errors. Wrong timezone or calendar produces a confidently wrong chart for a 1740 event.	Explicit confidence flags and calendar confirmation prompts (§7.2).
Blind mode as theater. If the lock is cosmetic, users notice and the credibility claim inverts into a liability.	Enforce architecturally; expose the audit trail in the UI and the export.
Ephemeris licensing. Swiss Ephemeris is dual-licensed: AGPL, or a paid professional license from Astrodienst. Running it in a hosted web service under the AGPL triggers source-disclosure obligations for the whole service.	Decide before build, not after. Either buy the professional license, or build on Skyfield with JPL DE440/DE441, which is permissively licensed and more than accurate enough here. libephemeris wraps Skyfield behind a pyswisseph-compatible API, which keeps the option open in both directions if the call is made early.
Tradition wars. Traditional and modern practitioners want materially different readings from the same chart.	Interpretation profile setting (traditional / modern / hybrid) affecting both which factors score highly and which significations are retrieved.
Liability. Client-facing readings touching health, finance, or legal matters.	Terms of service and an optional export disclaimer. Category taxonomy avoids diagnostic framing.
11. Deliberate omission: forward prediction

The obvious extension is running the same engine forward. Resist it for v1, for two reasons.

The first is focus: retrospective work has a clear, unmet need and a defensible differentiator in traceability. Forward prediction puts you in a crowded market against established software.

The second is that forward prediction changes the product's risk profile entirely. A retrospective reading is interpretation. A forward reading is advice, delivered to a client who may act on it. The disclaimer requirements, the category restrictions, and the support burden are all different. Ship the retrospective tool, learn what astrologers actually keep from the drafts, then decide.

12. Open questions
Signification database sourcing. Building a defensible, attributed corpus of planetary and house significations is the single largest content task in this project and it isn't a technical one. Licensed from an existing reference, compiled from public-domain traditional sources (Lilly, Ptolemy, Firmicus), or authored? This drives timeline more than anything in §7.
Interpretation profiles. Are traditional/modern/hybrid three distinct signification sets, or one set with different weights? Three sets triples the content work.
How much do astrologers actually want a draft? The evidence sheet may be the whole product, with the draft a distraction from work they consider theirs. Worth testing directly with five practitioners before building §7.5.
Pricing. Per-seat subscription is the obvious shape, but usage may be bursty — an astrologer might do twenty retrospective readings in a week of case-study work and none for a month. Credits may fit the workflow better.
Blind mode as marketing. If blind readings hold up in practitioners' own judgment, that's the strongest story the product has. Is there a way to collect and publish that evidence without it becoming a claim the company can't support?
13. Appendix: v1 build sequence
Ephemeris integration and chart calculation, with historical date handling
Settings: house system, zodiac, orbs, dignity tables, interpretation profile
Factor extraction and scoring engine, weights exposed
Evidence sheet UI with pin/dismiss/add
Signification database
Draft generation with traceability
Blind-mode lock and audit trail
Library, PDF export, chart wheel rendering