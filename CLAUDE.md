# Builder Tracker — Project Map

A mobile-first PWA for construction workers and subcontractors to track earnings, jobs, expenses, and cash flow. Built in React. Dark theme. Currency defaults to GBP (£). Philosophy: simple like a gauge, not accounting software.

---

## What's Built

### 5 Tab Navigation (bottom nav)
| Tab | Icon | Views it covers |
|-----|------|-----------------|
| Home | 📊 | Dashboard with year stats, monthly profit chart, top clients |
| Calendar | 📆 | Schedule (week/month toggle) + Month Earnings view |
| + | orange button | Quick action menu (floating) |
| Jobs | 🔨 | Active jobs + Completed jobs |
| Money | 💰 | Clients profitability + Business Costs |

There is also a **Settings** tab (⚙️) for currency and data export/import/reset.

---

## Data & Storage

### Storage pattern (dual — critical)
```js
// In artifact preview (Claude.ai): uses window.storage
// In standalone PWA / Vercel: uses localStorage
// The shim in main.jsx handles this automatically — never break it
```

### Storage keys
| Key | What it holds |
|-----|---------------|
| `builder-entries` | Daily earnings entries, keyed by date string |
| `builder-expenses` | One-off business expenses |
| `builder-recurring` | Monthly recurring overheads |
| `builder-schedule` | Calendar bookings, keyed by date string |
| `builder-jobs` | Completed job summaries |
| `builder-active-jobs` | Jobs currently in progress |
| `builder-settings` | User settings (currency etc.) |

### Date formatting — CRITICAL RULE
Always use the `dateKey()` function for date strings, never `toISOString()`.
```js
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
```
Using `toISOString()` causes a timezone bug that skips Mondays in date ranges.

### Save pattern
Always update state AND storage together via the save helpers:
```js
const saveEntries = (e) => { setEntries(e); save("builder-entries", e); };
```
Never call `setEntries` without also calling `save`, or data won't persist.

---

## Key Data Shapes

### Entry (daily log)
```js
{ client, job, description, hours, estimated, actual, materials, labour, miles, fuelCost }
// stored in entries["YYYY-MM-DD"]
```

### Schedule item
```js
{ client, job, expectedEarnings, bookingId?, dateFrom?, dateTo? }
// stored in schedule["YYYY-MM-DD"] as an array (multiple jobs per day)
// bookingId links multi-day range bookings together
```

### Completed job
```js
{ id, client, job, dateFrom, dateTo, days, totalEarnings, totalHours, materials, labour, fuel, notes, profit, completedAt }
```

### Active job
```js
{ id, client, job, startDate, expectedRevenue, daysWorked: [], expenses: [], status: "active", createdAt }
```

### Expense (one-off)
```js
{ id, category, description, amount, date, spreadOverYear }
// spreadOverYear: true = splits amount ÷12 across monthly overhead calculations
```

### Recurring overhead
```js
{ id, category, description, amount }
// amount is per month
```

---

## Views / Screens

All views are controlled by a single `view` state string. Here's every view:

| view value | What it shows |
|------------|--------------|
| `"dashboard"` | Home screen, year stats, monthly bar chart |
| `"month"` | Month earnings calendar with week breakdown |
| `"schedule"` | Calendar schedule (week or month grid) |
| `"entry"` | Daily earnings form (single day or date range) |
| `"addExpense"` | Add/edit a business expense |
| `"overheads"` | Business costs list (recurring + one-off) |
| `"clients"` | Client profitability rankings |
| `"jobs"` | Jobs tab (active/completed toggle) |
| `"logJob"` | Log a completed job form |
| `"completeJob"` | Complete a booked job (pre-filled from booking) |
| `"editJob"` | Edit a completed job |
| `"createActiveJob"` | Start a new active job |
| `"activeJobDetail"` | View/manage an active job (expenses, days, complete) |
| `"bookRange"` | Book a job across a date range on the calendar |
| `"editSchedule"` | Edit a single day on the schedule |
| `"editBooking"` | Edit an entire range booking |
| `"settings"` | Currency, export/import/reset |

---

## Key Features & Logic

### True Profit calculation
```
True Profit = earnings - materials - labour - fuel - recurring overheads (×12) - one-off expenses
```
This is the headline figure on the dashboard.

### Overhead spreading
One-off expenses can be toggled to `spreadOverYear: true`, which divides them by 12 for monthly overhead charts. The full amount still counts in yearly totals.

### Job logging flow
Two paths to log a job:
1. **Active job** → Start Job → track expenses/days as you go → Complete Job → becomes a completed job summary
2. **Log completed job** → enter totals directly → splits daily earnings across all days → creates daily entries automatically

### Booking → Job flow
Bookings on the calendar can be "completed" from the edit booking screen. This pre-fills the log job form and removes the booking from the calendar on save.

### Quick Actions menu (+ button)
Opens a floating menu with shortcuts:
- Add today's entry
- Start a job (active)
- Add job expense / labour (routes to active job picker)
- Book a job (calendar)
- Add business expense
- Log completed job

### Undo system
Deletes queue a 6-second undo via `queueUndo(label, restoreFn)`. Shown in an undo bar above the nav.

### Swipe navigation
Month and schedule views support left/right swipe to change month/week using touch events.

### Repeat last entry
On the entry form, if the day is blank, a "Repeat last" button pre-fills from the most recent entry with data.

---

## Currencies
Supported: GBP (£), EUR (€), USD ($). Set in Settings. All formatting goes through:
```js
const fmt = (v) => fmtBase(v, currencyMeta.symbol, currencyMeta.locale);
```
Never hardcode £ — always use `fmt()`.

---

## Component Structure
`src/App.jsx` is the orchestrator: state, save helpers, computed memos, handlers, and a view router. Each screen is its own file under `src/views/`. Views are pure presentational components — they receive everything as props and never reach back into App for state.

- **Constants** (`src/constants.js`) — `MONTHS`, `FULL_MONTHS`, `DAYS`, `YEAR`, `CURRENCIES`, `EXPENSE_CATEGORIES`, `CAT_ICONS`, `JOB_EXPENSE_CATS`, `JOB_CAT_ICONS`, `defaultSettings`
- **Utils** (`src/utils.js`) — `dateKey`, `fmtBase`, `fmtNum`, `getWeekNumber`, `getMonday`, `load`, `save`, `withTimeout`, `defaultEntry`, `defaultScheduleItem`
- **Styles** (`src/styles.js`) — the `S` object (default export)
- **Nav** (`src/components/Nav.jsx`) — bottom tab bar + quick actions menu + undo bar + toast + confirm dialog
- **Views** (`src/views/*.jsx`) — one file per `view` value; the App router picks which one to render

### Adding a new view
1. Create `src/views/MyView.jsx` — `import S from "../styles.js";` plus any needed constants/utils. Export a default component that takes everything it needs as props.
2. Add `import MyView from "./views/MyView.jsx";` at the top of `App.jsx`.
3. Add an `if (view === "myView") return <MyView ... />;` branch to the router section.
4. Run `npm run build` to verify.

---

## Files
```
src/
  App.jsx              — state, save helpers, memos, handlers, view router (~840 lines)
  main.jsx             — entry point + localStorage/window.storage shim
  constants.js         — MONTHS, CURRENCIES, EXPENSE_CATEGORIES, defaultSettings, etc.
  utils.js             — dateKey, fmtBase, load, save, defaultEntry, etc.
  styles.js            — the S styles object (default export)
  App.css              — intentionally empty (all styles in S object)
  index.css            — base resets
  components/
    Nav.jsx            — bottom nav, quick actions, undo bar, toast, confirm
  views/
    Dashboard.jsx      — home (year stats, monthly profit chart, top clients)
    Month.jsx          — month earnings calendar with week breakdown
    Schedule.jsx       — calendar schedule (week/month grid)
    Entry.jsx          — daily earnings form (single day or range)
    AddExpense.jsx     — add/edit a business expense
    Overheads.jsx      — business costs list (recurring + one-off)
    Clients.jsx        — client profitability rankings
    Jobs.jsx           — Jobs tab (active/completed toggle)
    LogJob.jsx         — log a completed job (or complete a booked job)
    EditJob.jsx        — edit a completed job
    CreateActiveJob.jsx — start a new active job
    ActiveJobDetail.jsx — view/manage an active job (expenses, days, complete)
    JobExpPicker.jsx   — picker shown when adding expense/labour without a selected job
    BookRange.jsx      — book a job across a date range on the calendar
    EditSchedule.jsx   — edit a single day on the schedule
    EditBooking.jsx    — edit an entire range booking
    Settings.jsx       — currency, export/import/reset
```

---

## Tech Stack
- React 19 (JSX, hooks)
- Vite build
- PWA (deployed via Vercel + GitHub)
- No external UI libraries — all styles are inline via the S object
- No routing library — view state managed manually

---

## Known Issues & Gotchas
- **Timezone bug**: never use `toISOString()` for dates. Always use `dateKey()`.
- **Loading state**: storage reads use a 2-second timeout via `withTimeout()` to prevent infinite loading.
- **Fuel costs**: must be included in overhead calculations on week headers — easy to miss when adding new summary views.
- **bookingId**: range bookings are stored as individual day entries but linked by a shared `bookingId`. Deleting a booking requires sweeping all days to remove matching entries.
- **Active jobs state sync**: after mutating active jobs, always update both `saveActiveJobs()` and `setViewingActiveJob()` if the user is currently viewing that job.
