# Changelog

A plain-English log of what changed in this project and why. Newest at top.
Each entry has three short sections — **What** (in human terms), **Why**
(the reason behind it), and **Risk** (how worried to be if something feels
off afterwards).

This file is the source of truth for "what's been done lately?" — easier
to read than `git log` and survives across Claude sessions and tools.

---

## 2026-04-12 — Restore lost features: invoicing, multi-country, client profiles, quick actions

**What:** Ported back three groups of features that were lost during the
refactor: (1) **Invoicing** — full invoice generation from completed jobs
with auto-incrementing numbers, professional layout, share/print/PDF,
business and bank details pulled from Settings. New `Invoice.jsx` view.
(2) **Multi-country support** — 6 countries (GB, US, AU, IE, NZ, CA)
with automatic currency and tax year mapping, 3 extra currencies (AUD,
NZD, CAD), country selector in Settings. (3) **Client profiles** — add
and edit client contact details (company, address, email, phone), shown
on client cards and pulled into invoices. New `AddClient.jsx` and
`EditClientProfile.jsx` views. (4) **Quick actions menu** — restored
"View all jobs" and "Add client" shortcuts, plus the Daily/Jobs/Other
section headers. Also restored the full Settings page with business
profile, bank/payment details, and VAT number fields.

**Why:** The April 7–8 refactor split the monolith into view files but
these features weren't carried across. The code existed in pre-refactor
commits (`d995b97` for country/clients, `230b294` for invoicing) and was
manually ported into the new multi-file structure.

**Risk:** Low. Build passes cleanly (40 modules, 332 kB). All changes
follow the established pattern — new view files receive everything as
props, App.jsx handles state and routing. The invoice view is
self-contained and only reachable from EditJob. Client profiles are
stored in a new `builder-client-profiles` localStorage key and wired
into export/import/reset.

---

## 2026-04-12 — Port supplier field and quote rename into refactored structure

**What:** Two features that were added to the old monolith App.jsx before
the refactor — the supplier field on job expenses and the rename of
"Expected Revenue" to "Quote" (with inline editing) — have been ported
into the new multi-file structure. The supplier field now appears on the
Add Expense form in ActiveJobDetail, auto-suggests from previously used
suppliers, and shows in the expense history. The Quote label replaces
"Expected Revenue" everywhere (CreateActiveJob, Jobs cards,
ActiveJobDetail) and can be tapped to edit directly on the job detail
screen. Also fixed a latent bug where the JobExpPicker wasn't resetting
the supplier field when opening a job.

**Why:** These two commits existed on the remote branch but were made
against the old single-file App.jsx. The refactor replaced that file, so
the features needed to be manually ported into the new view files
(ActiveJobDetail.jsx, Jobs.jsx, CreateActiveJob.jsx, JobExpPicker.jsx)
and the slimmed-down App.jsx.

**Risk:** Low. The build passes cleanly (37 modules, 310 kB bundle). The
changes touch well-understood UI code — form fields, labels, and a small
inline-edit interaction. If the quote edit feels wrong, it's isolated to
ActiveJobDetail.jsx and easy to tweak.

---

## 2026-04-11 — Cleanup pass after the refactor

**What:** Removed four unused pieces from `src/App.jsx` that were left
behind by the refactor — one orphan state variable (`addDayToJob`) and
three helper functions that nothing called anymore (`updateBooking`,
`bookedJobsFromCalendar`, `openBookingForEdit`). Also deleted the
completed `REFACTOR-PLAN.md` file (preserved in git history) and tidied
up two stale items on the desktop outside the project (an old standalone
copy of `builder_tracker.jsx` and an empty `Cursor coding` folder).

**Why:** After splitting `App.jsx` into 17 view files, some old code was
no longer reachable. Removing it shrank `App.jsx` from 841 to 763 lines
and trimmed the bundle from 308.84 kB to 308.24 kB — proof the dead code
was actually being shipped to the browser, not just sitting in source.

**Risk:** Low. Every removal was confirmed unused with grep across the
whole project (App.jsx + all 17 view files + components + utils). The
build still passes and produces the same 37 modules. If anything does
feel off later, `git revert 460eca6` rolls just this cleanup back without
touching the refactor.

---

## 2026-04-07 → 2026-04-08 — Refactor App.jsx into per-view files

**What:** Split the 2,305-line `src/App.jsx` monolith into a structured
project: 17 small view components in `src/views/`, a shared `Nav`
component in `src/components/`, and three helper modules at the top of
`src/` for styles, constants, and utilities. `App.jsx` now contains only
the app's state, the load/save helpers, the derived stats, and the view
router that decides which view to show — about 840 lines instead of 2,300.

**Why:** The single file had grown too big to navigate or understand at
a glance. Splitting it means future changes to (say) the Schedule view
only touch `src/views/Schedule.jsx`, not a 2,000-line haystack. It also
makes it possible for Claude to read just the relevant file instead of
the whole monolith every time.

**Risk:** Medium when it was happening — a 22-step refactor with lots of
moving parts. Now low: the work is preserved as commit `e726d7f` with
the git tag `post-refactor-baseline`, plus there's a USB backup of the
folder. If the refactor ever turns out to have a hidden bug, rollback is
`git reset --hard post-refactor-baseline`.

---
