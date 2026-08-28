---
id: 21
title: "Horoscope tone"
epic: "Synthesis PoC"
status: done
created: 2026-08-23T03:58:09+00:00
---

# Master Controller Sprint Definition — Sprint 21

**Epic:** Synthesis PoC
**Sprint Objective:** Change the horoscope register from effusive to plain and declarative, without weakening the grounding that keeps the output tied to supplied data.

### Context

The shipped register comes from three lines in `SYSTEM_PROMPT`: "playful", "Warm
and a little grand", and the paragraph allowance. The wanted register is
declarative and concrete — poetry from the collision of a planet and a real place,
not from ornament.

**The change is not purely stylistic, and that is the whole content of this sprint.**
Asking for concreteness raises fabrication pressure: a model told to name specific
places and things, working from event text that may not contain them, will supply
them. The product's entire demonstration is that the LLM synthesised *the inputs it
was handed* — GroundTruth verified clean event attribution at Sprint 17's gate,
including on the `matchedYear: false` path where events come from other years. A tone
change that quietly costs that would trade the thing being proved for the way it reads.

So the grounding rule is strengthened in the same edit, not left as it was.

### Requirements

1. `SYSTEM_PROMPT` in `lib/llm/horoscope.ts` revised: drop "playful"; replace "Warm
   and a little grand. Never ominous." with rules for a plain, declarative register —
   no grandeur, no rhetorical flourish, one placement/event/connection per sentence
   where possible, concrete nouns over adjectives.
2. **The grounding rule is extended** to cover event detail, not only astrological
   data: invent no detail about the events beyond what is supplied. The existing
   "invent no astrological data" clause stays.
3. A single worked exemplar included in the prompt showing the target register. Any
   real-world detail in it must be factually correct — an exemplar containing an error
   teaches that approximate detail is acceptable, in the one prompt where it is not.
4. Everything else in the prompt unchanged: top-6 aspects, two-decimal rounding, the
   no-hedging rule, the paragraph count, temperature 0.9.
5. `lib/llm/horoscope.test.ts` updated. It asserts the exact assembled prompt, so it
   will fail — that is the test working, and it must be updated to the new expected
   string rather than loosened to stop checking.

**Added 23 Aug 2026 from GroundTruth round 1 — a regression this sprint introduced.**
**R6 and R7 shipped at `db915b8` and did not achieve the outcome; the criterion they
served has since been withdrawn. They remain in the code as implemented.**

6. **Every cited event carries its year in the prose.** Unconditionally, not only when
   `matchedYear` is false: the years already reach the model as `{year}: {text}`, so
   this is a rule rather than plumbing, and an unconditional rule cannot be wrong. On
   the matched path the year is the reading's own and repeating it is harmless; on the
   fallback path it is the difference between honest and misleading.

   GroundTruth generated three times on the `matchedYear: false` reading — temperature
   0.9 means one sample settles nothing — and got one event dated, then none, then all
   four. **Nothing was fabricated in any run**; no event was ever attributed to 1977.
   But run 2 narrates Pashinyan's walk and Selena's murder as consequences of that sky
   with no dates attached, and a reader finishes believing they happened on the
   reading's date. The nearest is eighteen years later.

   It is a regression from this sprint specifically: Sprint 17's effusive register
   dated every event it cited, framing them as echoes across time. The plain register
   drops the connective framing that carried the years, inconsistently.
7. **The exemplar is reframed to operate on supplied event text**, along the lines QA1
   proposed at round 1 — given an input line such as `1919: dockworkers struck`, show
   the sentence built from it. The current exemplar says "that week a labor strike shut
   the harbor down": an event cited with a temporal gesture and no year, which is
   exactly the behaviour run 2 reproduced. It must keep R3's property of asserting no
   falsifiable real-world claim.

**On the risk register.** This sprint named "concreteness bought with fabrication" as
its central risk and it was pointed at the right area with the wrong mechanism. The
model does not invent detail; it *omits* it. Misleading by omission is a narrower
fault than fabrication, and the reader ends up believing the same false thing.
QA1 flagged the exemplar as pulling toward this at round 1; I declined to act without
evidence, and the evidence arrived one gate later.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: the three register-setting elements are gone, replaced rather than softened.
- R2: **the criterion that matters most here.** The grounding rule covers event detail
  as well as astrological data. A diff that changes register without it fails —
  concreteness and fabrication pull in the same direction, and this sprint asks for
  concreteness.
- R3: the exemplar's real-world facts are correct. QA1 checks them.
- R4: no change to aspect count, rounding, temperature, or the no-hedging rule. This
  sprint changes register and grounding, nothing else about how the prompt is built.
- R5: the prompt test asserts the new exact string. A test relaxed to a substring or
  a regex to avoid updating it fails — that is the check that would catch an
  accidental prompt change later.
- R6: the rule is unconditional and states the requirement plainly. A rule phrased as a
  preference ("where possible", "generally") fails — the failure mode is a model
  reasonably omitting under a soft instruction, which is what already happened.
- R7: the exemplar shows an input line and the sentence built from it, and still
  asserts no falsifiable real-world fact.
- No change to `generate.ts`, the write path, the kill switch, or any UI.

**GroundTruth — live, after Pipeman pushes:**

- Generation still succeeds and persists, and a reload renders the stored text.
- **The generated text still references only supplied data** — placements that appear
  in the stored positions, aspects within the supplied set, and events attributed to
  their own years rather than narrated as happening on the reading's date. *This is
  the sprint's actual proof*: the register changed and the grounding held.
- The `matchedYear: false` path specifically, since that is where fabrication would
  show first and where it is the normal case.

**Grounding criteria withdrawn — 23 Aug 2026, at the user's direction.**
**This supersedes an earlier amendment of the same date, which was factually wrong.**

### The correction first

The earlier amendment stated: "Nothing was fabricated in any run… every placement and
aspect traced to the stored payload," and concluded round 2 failed because "the
behaviour is not reliably fixable by a prompt line."

**That was accurate for round 1 at `dff8775` and is not accurate for the shipped build
at `db915b8`.** I drafted it from round 1's report without having seen round 2's, and
inferred that round 2 failed for the same reason. It did not. GroundTruth flagged the
disagreement between the account and the deployed behaviour, which is precisely the
gap an amendment exists to close — and I authored the gap.

### What actually ships

**False cross-date astronomical assertions, in 5 of 5 runs.** Sixteen sentences
asserting the reading's sky as obtaining on other dates. The payload describes
1977-03-31 and nothing else. Verified against JPL:

| Claim | Actual | |
|---|---|---|
| Sun opposed Pluto, 1995-03-31 | Sun Aries 10.31, Pluto Sagittarius 0.40 — 129.91° apart | **false** |
| Saturn square Uranus, 1995 | separation 48.12° | **false** |
| Saturn square Uranus, 2004 | separation 121.92° | **false** |
| Mercury in Aries, 2018 | Aries 12.96 | true by coincidence |
| Moon in Leo, 2023 | Leo 6.66 | true by coincidence |

The two correct ones are correct by luck. All five are ungrounded identically.

This is worse than round 1's fault, not a variant of it. A reader is no longer left to
infer something false — they are told it.

### R6 caused this, and R6 was mine

Round 1's defect was omission: events cited without dates. I required, unconditionally,
that every cited event carry its year. The model complied by attaching years to
*astronomical* claims rather than to event citations — asserting the 1977 sky obtained
in 1995. The fix converted misleading-by-omission into stating-something-false.

Round 2's run 4 produced the correct shape unprompted, so the behaviour is reachable;
the prompt does not reliably steer it.

### What held

Placements for the reading's own date, every aspect real and inside the supplied top-6
set, no invented event detail. **The entire defect is which date each aspect is
attached to.**

### The decision

Accepted and deferred. All data-quality and usability defects move to a separate epic;
this sprint is accepted on the register change, which shipped as specified.

The surviving grounding clause — "references only supplied data — placements that
appear in the stored positions, aspects within the supplied set" — **is withdrawn
too.** It is not met. It is not being made to pass. Both withdrawals are recorded
rather than deleted, because a criterion quietly removed to close a sprint is
indistinguishable afterwards from one that was satisfied.

### For the data-quality epic

**The app asserts astronomically false statements.** Named plainly, because it is a
sharper defect than "inconsistent dating" and the follow-up should be scoped against
what it actually is. Not fabricated placements — real placements attached to wrong
dates.

A fix needs testing across at least five generations with a cross-date detector.
Temperature 0.9 means one sample settles nothing: round 1 needed three runs to reveal
omission, and this needed five to establish it as consistent rather than occasional.

**GroundTruth:** this amendment replaces the previous one. Verify it is present and
that it describes false cross-date assertions rather than omission before recording.
If it still describes omission, you are reading the superseded text — hold the verdict.

### Out of Scope

- Model selection, temperature, token limits, streaming.
- Prompt-tuning tooling, A/B comparison, stored prompt versions.
- Regenerating or backfilling existing horoscopes. Stored readings keep the prose they
  were written with; `horoscope_model` and `horoscope_generated_at` already record
  which generation produced what.
- Any change to the display, the write path, or the kill switch.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing.
- **Blocked by:** Nothing. Independent of Sprints 19 and 20 — different file, no
  shared surface — but should be sequenced after them rather than run in parallel.
  Sprint 11's tree-hash incident came from a second checkout, and this sprint is far
  too small to be worth that risk.
- **External:** None. `OPENAI_API_KEY` and the spend cap are already in place.

### Risks & Mitigations

- **Concreteness bought with fabrication.** The direct risk of this exact change, and
  it would be invisible in a diff — the prompt would look better and the output would
  quietly stop being grounded. — R2, plus GroundTruth's second criterion targeting the
  `matchedYear: false` path where it shows first.
- **An exemplar with a factual error.** It teaches approximation in the one prompt
  where approximation is the failure mode. — R3, checked rather than assumed.
- **The prompt test loosened instead of updated.** It exists to catch unintended prompt
  changes; relaxing it to a substring match removes that protection permanently and
  looks like routine test maintenance. — R5.
- **Scope drift into prompt engineering.** Once the file is open, temperature, model,
  and aspect count are all right there. — R4 and Out of Scope.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
