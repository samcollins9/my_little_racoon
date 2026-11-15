# Decisions log

Real project decisions that don't belong to a single sprint's requirements.
Newest first.

## 2026-11-15: Date pages (PRD v3, Sprint 28)

Decided by the user, in a Master Controller session:

1. **Readings become findable by date.** This reverses Sprint 4's link-only access
   model on purpose. The reason given: a reading holds no personal data (a date,
   computed positions, public Wikipedia events, generated text). The `readings`
   table still has **no select policy**. Date access goes only through narrow
   `security definer` functions.
2. **When a date has more than one reading, show the newest one with a horoscope.**
   Duplicates are neither merged nor deleted, and no unique constraint is added on
   `event_date`.
3. **Viewing a date writes nothing.** A row is written only when someone casts a
   horoscope.
4. **"Today" means the UTC date.**
