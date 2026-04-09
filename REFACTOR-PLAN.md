# App.jsx Refactor Plan

**Goal:** Break the 2305-line monolith `src/App.jsx` into small, manageable files.

**Rules:**
1. One step per message — don't combine steps
2. Read only the lines needed for that step (never the whole file)
3. Run `npm run build` after every step to verify
4. Work bottom-up (extract from end of file first so line numbers don't shift)
5. Views receive everything as props — no reaching back into App for state
6. After completing a step, update this file to mark it done

---

## Phase 1 — Zero-risk extractions (no logic changes)

- [x] **Step 1** — Extract `S` styles object (~line 2111–2305) → `src/styles.js` ✅
- [x] **Step 2** — Extract constants (~line 3–16) → `src/constants.js` ✅
- [x] **Step 3** — Extract utils (~line 18–28) → `src/utils.js` ✅
- [x] **Step 4** — Extract `Nav` component (~line 2059–2110) → `src/components/Nav.jsx` ✅

## Phase 2 — Extract views (smallest/simplest first)

- [x] **Step 5** — settings view (~line 1916–1943) → `src/views/Settings.jsx` ✅
- [x] **Step 6** — addExpense view (~line 1815–1848) → `src/views/AddExpense.jsx` ✅
- [x] **Step 7** — overheads view (~line 1849–1880) → `src/views/Overheads.jsx` ✅
- [x] **Step 8** — clients view (~line 1881–1915) → `src/views/Clients.jsx` ✅
- [x] **Step 9** — month view (~line 1944–2058) → `src/views/Month.jsx` ✅
- [x] **Step 10** — entry view (~line 1687–1814) → `src/views/Entry.jsx` ✅
- [x] **Step 11** — schedule view (~line 1553–1686) → `src/views/Schedule.jsx` ✅
- [x] **Step 12** — editSchedule view (~line 1474–1552) → `src/views/EditSchedule.jsx` ✅
- [x] **Step 13** — editBooking view (~line 1351–1473) → `src/views/EditBooking.jsx` ✅
- [x] **Step 14** — bookRange view (~line 1244–1350) → `src/views/BookRange.jsx` ✅
- [x] **Step 15** — jobs view (~line 1141–1243) → `src/views/Jobs.jsx` ✅
- [x] **Step 16** — activeJobDetail view (~line 987–1140) → `src/views/ActiveJobDetail.jsx` ✅
- [x] **Step 17** — createActiveJob view (~line 954–986) → `src/views/CreateActiveJob.jsx` ✅
- [x] **Step 18** — editJob view (~line 861–953) → `src/views/EditJob.jsx` ✅
- [x] **Step 19** — completeJob/logJob view (~line 765–860) → `src/views/LogJob.jsx` ✅
- [x] **Step 20** — dashboard (remaining return JSX) → `src/views/Dashboard.jsx` ✅

## Phase 3 — Clean up

- [x] **Step 21** — Clean up App.jsx (should be just imports, state, save helpers, view router) ✅
- [x] **Step 22** — Update CLAUDE.md to reflect new file structure ✅

---

## How to use this plan

Start a new Claude session and say:
> "Read REFACTOR-PLAN.md and CLAUDE.md, then do the next unchecked step."

That's it. Claude will:
1. Read this file to find the next step
2. Read only the lines it needs from App.jsx
3. Do the extraction
4. Build-check
5. Mark the step done in this file

If a session gets too long, just start a new one with the same message.
