import { useState, useEffect, useMemo, useRef, useCallback } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FULL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const YEAR = new Date().getFullYear();
const EXPENSE_CATEGORIES = ["Public Liability Insurance","Van Payment / Finance","Tools & Equipment","Phone / Internet","Accountant Fees","Other"];
const CAT_ICONS = {"Public Liability Insurance":"🛡️","Van Payment / Finance":"🚐","Tools & Equipment":"🔧","Phone / Internet":"📱","Accountant Fees":"📋","Other":"📦"};
const CURRENCIES = {
  GBP: { label: "British Pound (GBP)", symbol: "£", locale: "en-GB" },
  EUR: { label: "Euro (EUR)", symbol: "€", locale: "de-DE" },
  USD: { label: "US Dollar (USD)", symbol: "$", locale: "en-US" },
};
const defaultSettings = () => ({ currency: "GBP" });
const JOB_EXPENSE_CATS = ["Materials","Fuel","Tools/Parts","Labour","Other"];
const JOB_CAT_ICONS = {"Materials":"🧱","Fuel":"⛽","Tools/Parts":"🔧","Labour":"👷","Other":"📦"};

const getWeekNumber = (d) => { const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); const ys = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); return Math.ceil(((date - ys) / 86400000 + 1) / 7); };
const fmtBase = (v, symbol = "£", locale = "en-GB") => { if (!v && v !== 0) return `${symbol}0`; return symbol + Number(v).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
const fmtNum = (v, decimals = 0) => { if (!v && v !== 0) return "0"; return Number(v).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); };
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const defaultEntry = () => ({ client:"", job:"", description:"", hours:"", estimated:"", actual:"", materials:"", labour:"", miles:"", fuelCost:"" });
const defaultScheduleItem = () => ({ client:"", job:"", expectedEarnings:"" });
const getMonday = (d) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.getFullYear(), date.getMonth(), diff); };

const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
const load = async (key, fb) => { try { if (!window.storage) return fb; const r = await withTimeout(window.storage.get(key), 2000); return r ? JSON.parse(r.value) : fb; } catch { return fb; } };
const save = async (key, val) => { try { if (window.storage) await window.storage.set(key, JSON.stringify(val)); } catch {} };

export default function App() {
  const [entries, setEntries] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [jobs, setJobs] = useState([]);
  const [settings, setSettings] = useState(defaultSettings());
  const [view, setView] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingDate, setEditingDate] = useState(null);
  const [form, setForm] = useState(defaultEntry());
  const [loaded, setLoaded] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [expForm, setExpForm] = useState({ category: EXPENSE_CATEGORIES[0], description:"", amount:"", date: dateKey(new Date()), isRecurring: false, recurringMonthly:"", spreadOverYear: false });
  const [editingExp, setEditingExp] = useState(null);
  // Schedule state
  const [schedView, setSchedView] = useState("week"); // "week" or "month"
  const [schedWeekStart, setSchedWeekStart] = useState(getMonday(new Date()));
  const [schedMonth, setSchedMonth] = useState(new Date().getMonth());
  const [editingSchedDate, setEditingSchedDate] = useState(null);
  const [schedForm, setSchedForm] = useState([defaultScheduleItem()]);
  const importRef = useRef(null);
  const undoTimerRef = useRef(null);
  const [undoItem, setUndoItem] = useState(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [clientSearch, setClientSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const touchStartRef = useRef(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [jobsSubView, setJobsSubView] = useState("active");
  const [viewingActiveJob, setViewingActiveJob] = useState(null);
  const [activeJobForm, setActiveJobForm] = useState({ client:"", job:"", startDate: dateKey(new Date()), expectedRevenue:"" });
  const [jobExpForm, setJobExpForm] = useState({ date: dateKey(new Date()), amount:"", category:"Materials", note:"", supplier:"" });
  const [jobExpPickerOpen, setJobExpPickerOpen] = useState(false);
  const [jobExpPickerCategory, setJobExpPickerCategory] = useState(null);
  const [addDayToJob, setAddDayToJob] = useState(null);
  const [completeMode, setCompleteMode] = useState(false);
  const [finalRevInput, setFinalRevInput] = useState("");
  const [quoteEditMode, setQuoteEditMode] = useState(false);
  const [quoteEditVal, setQuoteEditVal] = useState("");
  const showToast = (msg, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };
  const currencyMeta = CURRENCIES[settings.currency] || CURRENCIES.GBP;
  const fmt = (v) => fmtBase(v, currencyMeta.symbol, currencyMeta.locale);

  const onTouchStart = useCallback((e) => { touchStartRef.current = e.touches[0].clientX; }, []);
  const makeSwipeEnd = useCallback((onLeft, onRight) => (e) => {
    if (touchStartRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) onLeft(); else onRight();
  }, []);

  const lastEntry = useMemo(() => {
    const keys = Object.keys(entries).sort().reverse();
    for (const k of keys) {
      const e = entries[k];
      if (e && (e.client || e.job || e.actual)) return e;
    }
    return null;
  }, [entries]);

  useEffect(() => {
    Promise.all([load("builder-entries",{}), load("builder-expenses",[]), load("builder-recurring",[]), load("builder-schedule",{}), load("builder-jobs",[]), load("builder-settings", defaultSettings()), load("builder-active-jobs",[])]).then(([e,ex,rc,sc,jb,st,aj]) => {
      setEntries(e); setExpenses(ex); setRecurring(rc); setSchedule(sc); setJobs(jb); setSettings({ ...defaultSettings(), ...(st || {}) }); setActiveJobs(aj || []); setLoaded(true);
    });
  }, []);

  const saveEntries = (e) => { setEntries(e); save("builder-entries", e); };
  const saveExpenses = (e) => { setExpenses(e); save("builder-expenses", e); };
  const saveRecurring = (r) => { setRecurring(r); save("builder-recurring", r); };
  const saveSchedule = (s) => { setSchedule(s); save("builder-schedule", s); };
  const saveJobs = (j) => { setJobs(j); save("builder-jobs", j); };
  const saveActiveJobs = (aj) => { setActiveJobs(aj); save("builder-active-jobs", aj); };
  const saveSettings = (s) => { setSettings(s); save("builder-settings", s); };

  const updateForm = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const updateSetting = (f, v) => saveSettings({ ...settings, [f]: v });
  const queueUndo = (label, restore) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem({ label, restore });
    undoTimerRef.current = setTimeout(() => setUndoItem(null), 6000);
  };
  const runUndo = () => {
    if (!undoItem) return;
    undoItem.restore();
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoItem(null);
  };
  const openQuickAction = (action) => {
    setQuickActionsOpen(false);
    if (action === "entry") openDay(dateKey(new Date()));
    if (action === "book") { setRangeForm({ client:"", job:"", jobPrice:"", expectedEarnings:"", dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false }); setView("bookRange"); }
    if (action === "expense") { setExpForm({ category: EXPENSE_CATEGORIES[0], description:"", amount:"", date: dateKey(new Date()), isRecurring: false, recurringMonthly:"", spreadOverYear: false }); setEditingExp(null); setView("addExpense"); }
    if (action === "job") { setJobForm(defaultJobForm()); setCompletingBooking(null); setView("logJob"); }
    if (action === "newActiveJob") { setActiveJobForm({ client:"", job:"", startDate: dateKey(new Date()), expectedRevenue:"" }); setView("createActiveJob"); }
    if (action === "jobExpense") { setJobExpPickerCategory(null); setJobExpPickerOpen(true); }
    if (action === "jobLabour") { setJobExpPickerCategory("Labour"); setJobExpPickerOpen(true); }
  };

  const createActiveJob = () => {
    if (!activeJobForm.client.trim() && !activeJobForm.job.trim()) return;
    const newJob = {
      id: "aj_" + Date.now(),
      client: activeJobForm.client.trim(),
      job: activeJobForm.job.trim(),
      startDate: activeJobForm.startDate,
      expectedRevenue: Number(activeJobForm.expectedRevenue) || 0,
      daysWorked: [],
      expenses: [],
      status: "active",
      createdAt: dateKey(new Date()),
    };
    saveActiveJobs([newJob, ...activeJobs]);
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setView("jobs"); setJobsSubView("active");
  };

  const addExpenseToJob = (jobId) => {
    const amt = Number(jobExpForm.amount) || 0;
    if (amt <= 0) return;
    const expense = {
      id: "je_" + Date.now(),
      date: jobExpForm.date,
      amount: amt,
      category: jobExpPickerCategory || jobExpForm.category,
      note: jobExpForm.note.trim(),
      supplier: jobExpForm.supplier.trim(),
    };
    const updated = activeJobs.map(j => j.id === jobId ? { ...j, expenses: [...j.expenses, expense] } : j);
    saveActiveJobs(updated);
    const updatedJob = updated.find(j => j.id === jobId);
    if (updatedJob) setViewingActiveJob(updatedJob);
    setJobExpForm({ date: dateKey(new Date()), amount:"", category: jobExpForm.category, note:"", supplier:"" });
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setJobExpPickerOpen(false); setJobExpPickerCategory(null);
  };

  const addDayWorked = (jobId, day) => {
    const updated = activeJobs.map(j => {
      if (j.id !== jobId) return j;
      if (j.daysWorked.includes(day)) return j;
      return { ...j, daysWorked: [...j.daysWorked, day].sort() };
    });
    saveActiveJobs(updated);
    const updatedJob = updated.find(j => j.id === jobId);
    if (updatedJob && viewingActiveJob?.id === jobId) setViewingActiveJob(updatedJob);
  };

  const removeDayWorked = (jobId, day) => {
    const updated = activeJobs.map(j => j.id === jobId ? { ...j, daysWorked: j.daysWorked.filter(d => d !== day) } : j);
    saveActiveJobs(updated);
    const updatedJob = updated.find(j => j.id === jobId);
    if (updatedJob && viewingActiveJob?.id === jobId) setViewingActiveJob(updatedJob);
  };

  const removeJobExpense = (jobId, expId) => {
    const prev = activeJobs;
    const updated = activeJobs.map(j => j.id === jobId ? { ...j, expenses: j.expenses.filter(e => e.id !== expId) } : j);
    saveActiveJobs(updated);
    const updatedJob = updated.find(j => j.id === jobId);
    if (updatedJob && viewingActiveJob?.id === jobId) setViewingActiveJob(updatedJob);
    queueUndo("Expense removed", () => saveActiveJobs(prev));
  };

  const completeActiveJob = (jobId, finalRevenue) => {
    const aj = activeJobs.find(j => j.id === jobId);
    if (!aj) return;
    const totalExpenses = aj.expenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
    const rev = Number(finalRevenue) || 0;
    const jobSummary = {
      id: aj.id, client: aj.client, job: aj.job, dateFrom: aj.startDate, dateTo: dateKey(new Date()),
      days: aj.daysWorked.length, totalEarnings: rev, totalHours: 0,
      materials: aj.expenses.filter(e => e.category === "Materials").reduce((t, e) => t + (Number(e.amount) || 0), 0),
      labour: aj.expenses.filter(e => e.category === "Labour").reduce((t, e) => t + (Number(e.amount) || 0), 0),
      fuel: aj.expenses.filter(e => e.category === "Fuel").reduce((t, e) => t + (Number(e.amount) || 0), 0),
      notes: "", profit: rev - totalExpenses, completedAt: dateKey(new Date()),
    };
    saveJobs([jobSummary, ...jobs]);
    saveActiveJobs(activeJobs.filter(j => j.id !== jobId));
    setViewingActiveJob(null);
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setView("jobs"); setJobsSubView("completed");
  };

  const deleteActiveJob = (jobId) => {
    const prev = activeJobs;
    saveActiveJobs(activeJobs.filter(j => j.id !== jobId));
    setViewingActiveJob(null);
    queueUndo("Job deleted", () => saveActiveJobs(prev));
    setView("jobs"); setJobsSubView("active");
  };
  const updateExpForm = (f, v) => setExpForm(p => {
    const next = { ...p, [f]: v };
    if (f === "isRecurring" && v === true) next.spreadOverYear = false;
    return next;
  });

  // Entry mode: single day or date range
  const [entryMode, setEntryMode] = useState("single"); // "single" or "range"
  const [entryRange, setEntryRange] = useState({ dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false });
  const updateEntryRange = (f, v) => setEntryRange(p => ({ ...p, [f]: v }));

  const doSaveEntry = () => {
    if (entryMode === "range") {
      const ne = { ...entries };
      const sp = entryRange.dateFrom.split("-").map(Number);
      const ep = entryRange.dateTo.split("-").map(Number);
      const startD = new Date(sp[0], sp[1]-1, sp[2]);
      const endD = new Date(ep[0], ep[1]-1, ep[2]);
      for (let t = startD.getTime(); t <= endD.getTime(); t += 86400000) {
        const dd = new Date(t);
        const dow = dd.getDay();
        if (dow === 6 && !entryRange.includeSaturday) continue;
        if (dow === 0 && !entryRange.includeSunday) continue;
        const dk = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
        ne[dk] = { ...form };
      }
      saveEntries(ne);
      setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
      setEditingDate(null); setForm(defaultEntry()); setEntryMode("single"); setView("month");
    } else {
      if (!editingDate) return;
      saveEntries({ ...entries, [editingDate]: { ...form } });
      setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
      setEditingDate(null); setForm(defaultEntry()); setView("month");
    }
  };
  const deleteEntry = () => {
    if (!editingDate) return;
    const deletedDate = editingDate;
    const deletedValue = entries[editingDate];
    const ne = { ...entries }; delete ne[editingDate]; saveEntries(ne);
    if (deletedValue) queueUndo("Entry deleted", () => saveEntries({ ...ne, [deletedDate]: deletedValue }));
    setEditingDate(null); setForm(defaultEntry()); setView("month");
  };
  const openDay = (ds) => { setEditingDate(ds); setForm(entries[ds] ? { ...entries[ds] } : defaultEntry()); setEntryMode("single"); setEntryRange({ dateFrom: ds, dateTo: ds, includeSaturday: false, includeSunday: false }); setView("entry"); };

  const doSaveExpense = () => {
    if (expForm.isRecurring) {
      const item = { id: Date.now(), category: expForm.category, description: expForm.description, amount: Number(expForm.recurringMonthly) || 0 };
      if (editingExp !== null) saveRecurring(recurring.map((r, i) => i === editingExp ? item : r));
      else saveRecurring([...recurring, item]);
    } else {
      const item = { id: Date.now(), category: expForm.category, description: expForm.description, amount: Number(expForm.amount) || 0, date: expForm.date, spreadOverYear: !!expForm.spreadOverYear };
      if (editingExp !== null) saveExpenses(expenses.map((e, i) => i === editingExp ? item : e));
      else saveExpenses([...expenses, item]);
    }
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setExpForm({ category: EXPENSE_CATEGORIES[0], description:"", amount:"", date: dateKey(new Date()), isRecurring: false, recurringMonthly:"", spreadOverYear: false });
    setEditingExp(null); setView("overheads");
  };
  const deleteExpense = (type, target) => {
    if (type === "recurring") {
      const prev = recurring;
      const next = recurring.filter((_, i) => i !== target);
      saveRecurring(next);
      queueUndo("Recurring expense deleted", () => saveRecurring(prev));
    }
    // One-off list is sorted by date in the UI; remove by object identity so indices never mismatch.
    else {
      const prev = expenses;
      const next = expenses.filter((e) => e !== target);
      saveExpenses(next);
      queueUndo("Expense deleted", () => saveExpenses(prev));
    }
  };
  const toggleExpenseSpread = (target) => {
    const next = expenses.map((e) => (e === target ? { ...e, spreadOverYear: !e.spreadOverYear } : e));
    saveExpenses(next);
  };

  const exportAllData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      settings,
      entries,
      expenses,
      recurring,
      schedule,
      jobs,
      activeJobs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `builder-tracker-backup-${dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const data = JSON.parse(raw);
      const nextEntries = data.entries && typeof data.entries === "object" ? data.entries : {};
      const nextExpenses = Array.isArray(data.expenses) ? data.expenses : [];
      const nextRecurring = Array.isArray(data.recurring) ? data.recurring : [];
      const nextSchedule = data.schedule && typeof data.schedule === "object" ? data.schedule : {};
      const nextJobs = Array.isArray(data.jobs) ? data.jobs : [];
      const nextActiveJobs = Array.isArray(data.activeJobs) ? data.activeJobs : [];
      const nextSettings = { ...defaultSettings(), ...(data.settings || {}) };
      saveEntries(nextEntries);
      saveExpenses(nextExpenses);
      saveRecurring(nextRecurring);
      saveSchedule(nextSchedule);
      saveJobs(nextJobs);
      saveActiveJobs(nextActiveJobs);
      saveSettings(nextSettings);
      setView("dashboard");
      setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
      showToast("Backup imported.");
    } catch {
      showToast("Import failed — select a valid backup file.", "error");
    } finally {
      ev.target.value = "";
    }
  };

  const resetAllData = () => {
    const snapshot = { entries, expenses, recurring, schedule, jobs, settings, activeJobs };
    saveEntries({});
    saveExpenses([]);
    saveRecurring([]);
    saveSchedule({});
    saveJobs([]);
    saveActiveJobs([]);
    saveSettings(defaultSettings());
    setForm(defaultEntry());
    setExpForm({ category: EXPENSE_CATEGORIES[0], description:"", amount:"", date: dateKey(new Date()), isRecurring: false, recurringMonthly:"", spreadOverYear: false });
    setSchedForm([defaultScheduleItem()]);
    setEditingDate(null);
    setEditingSchedDate(null);
    setEditingExp(null);
    setView("dashboard");
    queueUndo("All data reset", () => {
      saveEntries(snapshot.entries);
      saveExpenses(snapshot.expenses);
      saveRecurring(snapshot.recurring);
      saveSchedule(snapshot.schedule);
      saveJobs(snapshot.jobs);
      saveActiveJobs(snapshot.activeJobs);
      saveSettings(snapshot.settings);
    });
  };

  // Schedule save — now supports date ranges
  const [rangeForm, setRangeForm] = useState({ client:"", job:"", jobPrice:"", expectedEarnings:"", dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false });
  const updateRangeForm = (f, v) => setRangeForm(p => ({ ...p, [f]: v }));

  const doSaveScheduleRange = () => {
    const { client, job, jobPrice, expectedEarnings, dateFrom, dateTo, includeSaturday, includeSunday } = rangeForm;
    if (!client.trim() && !job.trim()) return;
    const ns = { ...schedule };
    const bookingId = "bk_" + Date.now();
    const item = { client: client.trim(), job: job.trim(), jobPrice: jobPrice || "", expectedEarnings: expectedEarnings || "", bookingId, dateFrom, dateTo };
    const startParts = dateFrom.split("-").map(Number);
    const endParts = dateTo.split("-").map(Number);
    const startD = new Date(startParts[0], startParts[1]-1, startParts[2]);
    const endD = new Date(endParts[0], endParts[1]-1, endParts[2]);
    for (let t = startD.getTime(); t <= endD.getTime(); t += 86400000) {
      const dd = new Date(t);
      const dow = dd.getDay();
      if (dow === 6 && !includeSaturday) continue;
      if (dow === 0 && !includeSunday) continue;
      const dk = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
      if (!ns[dk]) ns[dk] = [];
      ns[dk] = [...ns[dk], { ...item }];
    }
    saveSchedule(ns);
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setRangeForm({ client:"", job:"", jobPrice:"", expectedEarnings:"", dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false });
    setView("schedule");
  };

  // Delete entire booking by bookingId
  const deleteBooking = (bid) => {
    const prev = schedule;
    const ns = { ...schedule };
    Object.keys(ns).forEach(dk => {
      ns[dk] = ns[dk].filter(item => item.bookingId !== bid);
      if (ns[dk].length === 0) delete ns[dk];
    });
    saveSchedule(ns);
    queueUndo("Booking removed", () => saveSchedule(prev));
  };

  // Update entire booking by bookingId
  const updateBooking = (bid, newData) => {
    const ns = { ...schedule };
    Object.keys(ns).forEach(dk => {
      ns[dk] = ns[dk].map(item => item.bookingId === bid ? { ...item, ...newData } : item);
    });
    saveSchedule(ns);
  };

  // Editing a booking
  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingEditForm, setBookingEditForm] = useState({ client:"", job:"", jobPrice:"", expectedEarnings:"" });
  const updateBookingEditForm = (f, v) => setBookingEditForm(p => ({ ...p, [f]: v }));

  // Job completion
  const defaultJobForm = () => ({ client:"", job:"", dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false, totalEarnings:"", totalHours:"", hoursMode:"total", materials:"", labour:"", fuel:"", fuelMode:"total", notes:"" });
  const [jobForm, setJobForm] = useState(defaultJobForm());
  const [completingBooking, setCompletingBooking] = useState(null);
  const updateJobForm = (f, v) => setJobForm(p => ({ ...p, [f]: v }));

  // Job editing
  const [editingJob, setEditingJob] = useState(null);
  const [jobEditForm, setJobEditForm] = useState(defaultJobForm());
  const updateJobEditForm = (f, v) => setJobEditForm(p => ({ ...p, [f]: v }));
  const openJobEdit = (j) => {
    setEditingJob(j);
    setJobEditForm({ client: j.client || "", job: j.job || "", dateFrom: j.dateFrom || dateKey(new Date()), dateTo: j.dateTo || dateKey(new Date()), includeSaturday: false, includeSunday: false, totalEarnings: String(j.totalEarnings || ""), totalHours: String(j.totalHours || ""), hoursMode: "total", materials: String(j.materials || ""), labour: String(j.labour || ""), fuel: String(j.fuel || ""), fuelMode: "total", notes: j.notes || "" });
    setView("editJob");
  };
  const saveJobEdit = () => {
    if (!editingJob) return;
    const { client, job, dateFrom, dateTo, includeSaturday, includeSunday, totalEarnings, totalHours, materials, labour, fuel, notes } = jobEditForm;
    let numDays = editingJob.days;
    if (dateFrom && dateTo) {
      const sp = dateFrom.split("-").map(Number), ep = dateTo.split("-").map(Number);
      const startD = new Date(sp[0], sp[1]-1, sp[2]), endD = new Date(ep[0], ep[1]-1, ep[2]);
      numDays = 0;
      for (let t = startD.getTime(); t <= endD.getTime(); t += 86400000) {
        const dow = new Date(t).getDay();
        if (dow === 6 && !includeSaturday) continue;
        if (dow === 0 && !includeSunday) continue;
        numDays++;
      }
    }
    const totalE = Number(totalEarnings) || 0;
    const totalM = Number(materials) || 0;
    const totalL = Number(labour) || 0;
    const rawFuel = Number(fuel) || 0;
    const effectiveDays = numDays || editingJob.days;
    const totalF = jobEditForm.fuelMode === "perday" ? rawFuel * effectiveDays : rawFuel;
    const rawHours = Number(totalHours) || 0;
    const totalHrs = jobEditForm.hoursMode === "perday" ? rawHours * effectiveDays : rawHours;
    const updated = { ...editingJob, client: client.trim(), job: job.trim(), dateFrom, dateTo, days: effectiveDays, totalEarnings: totalE, totalHours: totalHrs, materials: totalM, labour: totalL, fuel: totalF, notes: notes.trim(), profit: totalE - totalM - totalL - totalF };
    saveJobs(jobs.map(j => j === editingJob ? updated : j));
    // Update daily hours on linked entries
    if (editingJob.id && totalHrs > 0 && effectiveDays > 0) {
      const dailyHours = Math.round(totalHrs / effectiveDays * 100) / 100;
      const ne = { ...entries };
      Object.keys(ne).forEach(dk => { if (ne[dk]?.jobId === editingJob.id) ne[dk] = { ...ne[dk], hours: String(dailyHours) }; });
      saveEntries(ne);
    }
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setEditingJob(null); setView("jobs");
  };

  const completeJob = () => {
    const { client, job, dateFrom, dateTo, includeSaturday, includeSunday, totalEarnings, totalHours, materials, labour, fuel, notes } = jobForm;
    if (!client.trim() && !job.trim()) return;

    // Calculate days
    const dayKeys = [];
    const sp = dateFrom.split("-").map(Number);
    const ep = dateTo.split("-").map(Number);
    const startD = new Date(sp[0], sp[1]-1, sp[2]);
    const endD = new Date(ep[0], ep[1]-1, ep[2]);
    for (let t = startD.getTime(); t <= endD.getTime(); t += 86400000) {
      const dd = new Date(t);
      const dow = dd.getDay();
      if (dow === 6 && !includeSaturday) continue;
      if (dow === 0 && !includeSunday) continue;
      dayKeys.push(`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`);
    }

    const numDays = dayKeys.length;
    if (numDays === 0) return;

    const jobId = "job_" + Date.now();
    const rawFuel = Number(fuel) || 0;
    const totalFuelAmt = jobForm.fuelMode === "perday" ? rawFuel * numDays : rawFuel;
    const rawHours = Number(totalHours) || 0;
    const totalHoursAmt = jobForm.hoursMode === "perday" ? rawHours * numDays : rawHours;
    const dailyEarnings = Math.round((Number(totalEarnings) || 0) / numDays * 100) / 100;
    const dailyHours = Math.round(totalHoursAmt / numDays * 100) / 100;
    const dailyMat = Math.round((Number(materials) || 0) / numDays * 100) / 100;
    const dailyLab = Math.round((Number(labour) || 0) / numDays * 100) / 100;
    const dailyFuel = Math.round(totalFuelAmt / numDays * 100) / 100;

    // Create entries for each day
    const ne = { ...entries };
    dayKeys.forEach(dk => {
      ne[dk] = { client: client.trim(), job: job.trim(), description: "", hours: dailyHours > 0 ? String(dailyHours) : "", estimated: "", actual: String(dailyEarnings), materials: String(dailyMat), labour: String(dailyLab), miles: "", fuelCost: String(dailyFuel), jobId };
    });
    saveEntries(ne);

    // Save job summary
    const jobSummary = {
      id: jobId, client: client.trim(), job: job.trim(), dateFrom, dateTo,
      days: numDays, totalEarnings: Number(totalEarnings)||0, totalHours: totalHoursAmt, materials: Number(materials)||0,
      labour: Number(labour)||0, fuel: totalFuelAmt, notes: notes.trim(),
      profit: (Number(totalEarnings)||0) - (Number(materials)||0) - (Number(labour)||0) - totalFuelAmt,
      completedAt: dateKey(new Date()),
    };
    saveJobs([jobSummary, ...jobs]);

    // If completing a booking, remove it from schedule
    if (completingBooking) {
      deleteBooking(completingBooking.bookingId);
      setCompletingBooking(null);
    }

    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setJobForm(defaultJobForm()); setView("jobs");
  };

  // Single day schedule edit (from tapping a day)
  const doSaveSchedule = () => {
    if (!editingSchedDate) return;
    const singles = schedForm.filter(s => s.client.trim() || s.job.trim());
    const ns = { ...schedule };
    // Keep existing bookings on this day
    const existing = ns[editingSchedDate] || [];
    const bookings = existing.filter(it => it.bookingId);
    const combined = [...bookings, ...singles];
    if (combined.length > 0) ns[editingSchedDate] = combined;
    else delete ns[editingSchedDate];
    saveSchedule(ns);
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setEditingSchedDate(null); setSchedForm([defaultScheduleItem()]); setView("schedule");
  };
  const openSchedDay = (ds) => {
    setEditingSchedDate(ds);
    const items = schedule[ds] || [];
    const singles = items.filter(s => !s.bookingId);
    setSchedForm(singles.length > 0 ? singles.map(s => ({...s})) : [defaultScheduleItem()]);
    setView("editSchedule");
  };
  const addSchedSlot = () => setSchedForm([...schedForm, defaultScheduleItem()]);
  const removeSchedSlot = (idx) => { const nf = schedForm.filter((_, i) => i !== idx); setSchedForm(nf.length ? nf : [defaultScheduleItem()]); };
  const updateSchedForm = (idx, f, v) => setSchedForm(schedForm.map((s, i) => i === idx ? { ...s, [f]: v } : s));

  // Stats
  const monthStats = useMemo(() => MONTHS.map((_, mi) => {
    let est=0,act=0,mat=0,lab=0,hrs=0,days=0,miles=0,fuel=0;
    const dim = new Date(YEAR, mi+1, 0).getDate();
    for (let d=1; d<=dim; d++) {
      const key = `${YEAR}-${String(mi+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const e = entries[key];
      if (e) { est+=Number(e.estimated)||0; act+=Number(e.actual)||0; mat+=Number(e.materials)||0; lab+=Number(e.labour)||0; hrs+=Number(e.hours)||0; miles+=Number(e.miles)||0; fuel+=Number(e.fuelCost)||0; if ((Number(e.actual)||0)>0) days++; }
    }
    return { est, act, mat, lab, hrs, days, miles, fuel, profit: act-mat-lab-fuel };
  }), [entries]);

  const clientStats = useMemo(() => {
    const cl = {};
    Object.values(entries).forEach(e => {
      const n = e.client?.trim(); if (!n) return;
      if (!cl[n]) cl[n] = { earned:0, materials:0, labour:0, hours:0, fuel:0, jobs:0 };
      cl[n].earned+=Number(e.actual)||0; cl[n].materials+=Number(e.materials)||0; cl[n].labour+=Number(e.labour)||0; cl[n].hours+=Number(e.hours)||0; cl[n].fuel+=Number(e.fuelCost)||0; cl[n].jobs++;
    });
    return Object.entries(cl).map(([name, s]) => ({ name, ...s, profit: s.earned-s.materials-s.labour-s.fuel, perHour: s.hours>0 ? (s.earned-s.materials-s.labour-s.fuel)/s.hours : 0 })).sort((a,b) => b.profit-a.profit);
  }, [entries]);

  const yearStats = useMemo(() => {
    const s = { est:0,act:0,mat:0,lab:0,hrs:0,days:0,miles:0,fuel:0 };
    monthStats.forEach(m => { Object.keys(s).forEach(k => s[k]+=m[k]); });
    s.jobProfit = s.act-s.mat-s.lab-s.fuel;
    s.avgHourly = s.hrs>0 ? s.act/s.hrs : 0;
    const recurringMonthly = recurring.reduce((t,r) => t+(Number(r.amount)||0), 0);
    const spreadMonthly = expenses
      .filter((e) => e.spreadOverYear)
      .reduce((t, e) => t + (Number(e.amount) || 0) / 12, 0);
    const recurringYearly = recurringMonthly * 12;
    const oneOffs = expenses.reduce((t,e) => t+(Number(e.amount)||0), 0);
    s.overheads = recurringYearly + oneOffs;
    s.recurringMonthly = recurringMonthly;
    s.spreadMonthly = spreadMonthly;
    s.monthlyOverheads = recurringMonthly + spreadMonthly;
    s.recurringYearly = recurringYearly;
    s.oneOffs = oneOffs;
    s.trueProfit = s.jobProfit - s.overheads;
    return s;
  }, [monthStats, recurring, expenses]);

  const monthOverheads = useMemo(() => {
    const mo = recurring.reduce((t,r) => t+(Number(r.amount)||0), 0);
    const spreadMonthly = expenses
      .filter((e) => e.spreadOverYear)
      .reduce((t, e) => t + (Number(e.amount) || 0) / 12, 0);
    return MONTHS.map((_, mi) => {
      const mk = `${YEAR}-${String(mi + 1).padStart(2, "0")}`;
      const lumpInMonth = expenses
        .filter((e) => !e.spreadOverYear && e.date?.startsWith(mk))
        .reduce((t, e) => t + (Number(e.amount) || 0), 0);
      return mo + lumpInMonth + spreadMonthly;
    });
  }, [recurring, expenses]);

  const getWeeksInMonth = (mi) => {
    const weeks = {}; const dim = new Date(YEAR, mi+1, 0).getDate();
    for (let d=1; d<=dim; d++) {
      const date = new Date(YEAR, mi, d); const wk = getWeekNumber(date);
      if (!weeks[wk]) weeks[wk] = { days:[], actual:0, estimated:0, materials:0, labour:0, fuel:0 };
      const key = dateKey(date);
      weeks[wk].days.push({ date, key, entry: entries[key]||null, dayOfWeek: date.getDay() });
      const e = entries[key];
      if (e) {
        weeks[wk].actual+=Number(e.actual)||0;
        weeks[wk].estimated+=Number(e.estimated)||0;
        weeks[wk].materials+=Number(e.materials)||0;
        weeks[wk].labour+=Number(e.labour)||0;
        weeks[wk].fuel+=Number(e.fuelCost)||0;
      }
      if (!e || !(Number(e.estimated) > 0)) {
        const si = schedule[key] || [];
        weeks[wk].estimated += si.reduce((t, it) => t + (Number(it.expectedEarnings)||0), 0);
      }
    }
    // Add profit to each week
    Object.values(weeks).forEach(w => { w.profit = w.actual - w.materials - w.labour - w.fuel; });
    return weeks;
  };

  const maxMonthActual = Math.max(...monthStats.map(m => m.act), 1);
  const knownClients = useMemo(() => {
    const s = new Set();
    Object.values(entries).forEach(e => { if (e.client?.trim()) s.add(e.client.trim()); });
    Object.values(schedule).flat().forEach(s2 => { if (s2.client?.trim()) s.add(s2.client.trim()); });
    return [...s].sort();
  }, [entries, schedule]);
  const knownJobs = useMemo(() => {
    const s = new Set();
    Object.values(entries).forEach(e => { if (e.job?.trim()) s.add(e.job.trim()); });
    Object.values(schedule).flat().forEach(s2 => { if (s2.job?.trim()) s.add(s2.job.trim()); });
    jobs.forEach((j) => { if (j.job?.trim()) s.add(j.job.trim()); });
    return [...s].sort();
  }, [entries, schedule, jobs]);
  const knownDescriptions = useMemo(() => {
    const s = new Set();
    Object.values(entries).forEach(e => { if (e.description?.trim()) s.add(e.description.trim()); });
    return [...s].sort();
  }, [entries]);

  const knownSuppliers = useMemo(() => {
    const s = new Set();
    activeJobs.forEach(aj => aj.expenses.forEach(e => { if (e.supplier?.trim()) s.add(e.supplier.trim()); }));
    return [...s].sort();
  }, [activeJobs]);

  // Schedule helpers
  const getWeekDays = (monday) => Array.from({length: 7}, (_, i) => { const d = new Date(monday); d.setDate(d.getDate()+i); return d; });
  const weekForecast = useMemo(() => {
    const days = getWeekDays(schedWeekStart);
    return days.reduce((t, d) => {
      const items = schedule[dateKey(d)] || [];
      return t + items.reduce((s, it) => s + (Number(it.expectedEarnings)||0), 0);
    }, 0);
  }, [schedule, schedWeekStart]);

  /** Range bookings from the calendar (same data as schedule) for the Jobs tab */
  const bookedJobsFromCalendar = useMemo(() => {
    const master = new Map();
    Object.values(schedule).forEach((arr) => {
      (arr || []).forEach((it) => {
        if (it.bookingId && !master.has(it.bookingId)) master.set(it.bookingId, it);
      });
    });
    const list = [];
    master.forEach((item, bookingId) => {
      let days = 0;
      Object.values(schedule).forEach((arr) => {
        if ((arr || []).some((x) => x.bookingId === bookingId)) days += 1;
      });
      const exp = Number(item.expectedEarnings) || 0;
      const forecastTurnover = days * exp;
      const jp = Number(item.jobPrice) || 0;
      list.push({
        bookingId,
        client: item.client || "",
        job: item.job || "",
        dateFrom: item.dateFrom || "",
        dateTo: item.dateTo || "",
        days,
        forecastTurnover,
        jobPrice: jp,
        forecastProfit: jp > 0 ? jp - forecastTurnover : null,
      });
    });
    return list.sort((a, b) => (b.dateFrom || "").localeCompare(a.dateFrom || ""));
  }, [schedule]);

  const openBookingForEdit = (bookingId) => {
    let foundDk = null;
    for (const dk of Object.keys(schedule).sort()) {
      if (schedule[dk]?.some((it) => it.bookingId === bookingId)) {
        foundDk = dk;
        break;
      }
    }
    if (!foundDk) return;
    const bk = schedule[foundDk].find((it) => it.bookingId === bookingId);
    if (!bk) return;
    let hasSat = false;
    let hasSun = false;
    Object.keys(schedule).forEach((dk) => {
      if (!schedule[dk]?.some((it) => it.bookingId === bookingId)) return;
      const dParts = dk.split("-").map(Number);
      if (dParts.length < 3) return;
      const dow = new Date(dParts[0], dParts[1] - 1, dParts[2]).getDay();
      if (dow === 6) hasSat = true;
      if (dow === 0) hasSun = true;
    });
    setEditingSchedDate(foundDk);
    setEditingBooking(bk);
    setBookingEditForm({
      client: bk.client || "",
      job: bk.job || "",
      jobPrice: bk.jobPrice || "",
      expectedEarnings: bk.expectedEarnings || "",
      dateFrom: bk.dateFrom || "",
      dateTo: bk.dateTo || "",
      includeSaturday: hasSat,
      includeSunday: hasSun,
    });
    setView("editBooking");
  };

  const navProps = {
    view, setView, openDay, onQuickAdd: openQuickAction,
    quickActionsOpen, setQuickActionsOpen, undoItem, onUndo: runUndo,
    toast, onDismissToast: () => setToast(null),
    confirmAction, onConfirm: () => { confirmAction?.action(); setConfirmAction(null); }, onDismissConfirm: () => setConfirmAction(null),
  };

  if (!loaded) return <div style={S.loadWrap}><div style={S.loadIcon}>🏗️</div><div style={S.loadText}>Loading...</div></div>;

  // ═══ COMPLETE JOB / LOG JOB ═══
  if (view === "completeJob" || view === "logJob") {
    const jf = jobForm;
    const sp = (jf.dateFrom||"").split("-").map(Number);
    const ep = (jf.dateTo||"").split("-").map(Number);
    let jDays = 0;
    if (sp.length===3 && ep.length===3) {
      const s = new Date(sp[0],sp[1]-1,sp[2]), e = new Date(ep[0],ep[1]-1,ep[2]);
      for (let t=s.getTime(); t<=e.getTime(); t+=86400000) {
        const dow = new Date(t).getDay();
        if (dow===6 && !jf.includeSaturday) continue;
        if (dow===0 && !jf.includeSunday) continue;
        jDays++;
      }
    }
    const totalE = Number(jf.totalEarnings)||0;
    const totalC = (Number(jf.materials)||0)+(Number(jf.labour)||0)+(Number(jf.fuel)||0);
    const profit = totalE - totalC;

    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setView(completingBooking ? "editSchedule" : "jobs"); setCompletingBooking(null); setJobForm(defaultJobForm()); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>{completingBooking ? "Complete Job" : "Log a Job"}</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Client</label>
            <input style={S.input} list="job-clients" placeholder="e.g. Mr Smith" value={jf.client} onChange={e => updateJobForm("client", e.target.value)} />
            <datalist id="job-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={S.fieldGroup}><label style={S.label}>Job</label><input style={S.input} list="job-names" placeholder="e.g. Kitchen refit" value={jf.job} onChange={e => updateJobForm("job", e.target.value)} /></div>
          <datalist id="job-names">{knownJobs.map(j => <option key={j} value={j} />)}</datalist>

          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>📅 Dates Worked</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={jf.dateFrom} onChange={e => updateJobForm("dateFrom", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={jf.dateTo} onChange={e => updateJobForm("dateTo", e.target.value)} /></div>
          </div>
          <div style={S.weekendToggles}>
            <button onClick={() => updateJobForm("includeSaturday", !jf.includeSaturday)} style={S.weekendToggle}><div style={{...S.weekendBox,...(jf.includeSaturday?S.weekendBoxChecked:{})}}>{jf.includeSaturday&&"✓"}</div><span>Include Saturday</span></button>
            <button onClick={() => updateJobForm("includeSunday", !jf.includeSunday)} style={S.weekendToggle}><div style={{...S.weekendBox,...(jf.includeSunday?S.weekendBoxChecked:{})}}>{jf.includeSunday&&"✓"}</div><span>Include Sunday</span></button>
          </div>

          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#E67E22", fontWeight: 700, marginBottom: 8 }}>💰 Job Totals</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Total Earnings £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.totalEarnings} onChange={e => updateJobForm("totalEarnings", e.target.value)} /></div>
            <div style={S.half}>
              <label style={S.label}>{jf.hoursMode === "perday" ? "Hours (per day)" : "Hours (total)"}</label>
              <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.totalHours} onChange={e => updateJobForm("totalHours", e.target.value)} />
              <div style={{...S.toggleRow, marginTop: 6}}>
                <button type="button" onClick={() => updateJobForm("hoursMode", "total")} style={jf.hoursMode !== "perday" ? S.toggleBtnActive : S.toggleBtn}>Total</button>
                <button type="button" onClick={() => updateJobForm("hoursMode", "perday")} style={jf.hoursMode === "perday" ? S.toggleBtnActive : S.toggleBtn}>Per day</button>
              </div>
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Materials £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.materials} onChange={e => updateJobForm("materials", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>Labour £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.labour} onChange={e => updateJobForm("labour", e.target.value)} /></div>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>{jf.fuelMode === "perday" ? "Fuel / Travel (per day)" : "Fuel / Travel (total)"}</label>
            <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.fuel} onChange={e => updateJobForm("fuel", e.target.value)} />
            <div style={{...S.toggleRow, marginTop: 6}}>
              <button type="button" onClick={() => updateJobForm("fuelMode", "total")} style={jf.fuelMode !== "perday" ? S.toggleBtnActive : S.toggleBtn}>Total</button>
              <button type="button" onClick={() => updateJobForm("fuelMode", "perday")} style={jf.fuelMode === "perday" ? S.toggleBtnActive : S.toggleBtn}>Per day</button>
            </div>
            {jf.fuelMode === "perday" && jDays > 0 && Number(jf.fuel) > 0 && (
              <div style={{fontSize: 11, color: "#888", marginTop: 4}}>Total fuel: {fmt((Number(jf.fuel)||0) * jDays)} across {jDays} days</div>
            )}
          </div>
          <div style={S.fieldGroup}><label style={S.label}>Notes</label><input style={S.input} placeholder="e.g. Extra day needed for plumbing" value={jf.notes} onChange={e => updateJobForm("notes", e.target.value)} /></div>

          {/* Preview */}
          {(() => {
            const effectiveFuel = jf.fuelMode === "perday" && jDays > 0 ? (Number(jf.fuel)||0) * jDays : (Number(jf.fuel)||0);
            const previewC = (Number(jf.materials)||0) + (Number(jf.labour)||0) + effectiveFuel;
            const previewProfit = totalE - previewC;
            return jDays > 0 && totalE > 0 ? (
              <div style={S.rangePreview}>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Days</span><span style={S.rangePreviewVal}>{jDays}</span></div>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Daily rate</span><span style={S.rangePreviewVal}>{fmt(Math.round(totalE/jDays))}/day</span></div>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Total costs</span><span style={{...S.rangePreviewVal, color:"#E74C3C"}}>{fmt(previewC)}</span></div>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Profit</span><span style={{...S.rangePreviewVal, color: previewProfit>=0?"#27AE60":"#E74C3C", fontWeight:800}}>{fmt(previewProfit)}</span></div>
              </div>
            ) : null;
          })()}

          <button onClick={completeJob} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Done!" : `Log Job (${jDays} days)`}</button>
        </div>
      </div>
    );
  }

  // ═══ EDIT COMPLETED JOB ═══
  if (view === "editJob" && editingJob) {
    const jf = jobEditForm;
    const sp = (jf.dateFrom||"").split("-").map(Number);
    const ep = (jf.dateTo||"").split("-").map(Number);
    let jDays = 0;
    if (sp.length===3 && ep.length===3) {
      const s = new Date(sp[0],sp[1]-1,sp[2]), e = new Date(ep[0],ep[1]-1,ep[2]);
      for (let t=s.getTime(); t<=e.getTime(); t+=86400000) {
        const dow = new Date(t).getDay();
        if (dow===6 && !jf.includeSaturday) continue;
        if (dow===0 && !jf.includeSunday) continue;
        jDays++;
      }
    }
    const totalE = Number(jf.totalEarnings)||0;
    const totalC = (Number(jf.materials)||0)+(Number(jf.labour)||0)+(Number(jf.fuel)||0);
    const profit = totalE - totalC;
    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setEditingJob(null); setView("jobs"); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>Edit Job</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Client</label>
            <input style={S.input} list="jedit-clients" placeholder="e.g. Mr Smith" value={jf.client} onChange={e => updateJobEditForm("client", e.target.value)} />
            <datalist id="jedit-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Job</label>
            <input style={S.input} list="jedit-names" placeholder="e.g. Kitchen refit" value={jf.job} onChange={e => updateJobEditForm("job", e.target.value)} />
            <datalist id="jedit-names">{knownJobs.map(j => <option key={j} value={j} />)}</datalist>
          </div>
          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>📅 Dates Worked</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={jf.dateFrom} onChange={e => updateJobEditForm("dateFrom", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={jf.dateTo} onChange={e => updateJobEditForm("dateTo", e.target.value)} /></div>
          </div>
          <div style={S.weekendToggles}>
            <button onClick={() => updateJobEditForm("includeSaturday", !jf.includeSaturday)} style={S.weekendToggle}><div style={{...S.weekendBox,...(jf.includeSaturday?S.weekendBoxChecked:{})}}>{jf.includeSaturday&&"✓"}</div><span>Include Saturday</span></button>
            <button onClick={() => updateJobEditForm("includeSunday", !jf.includeSunday)} style={S.weekendToggle}><div style={{...S.weekendBox,...(jf.includeSunday?S.weekendBoxChecked:{})}}>{jf.includeSunday&&"✓"}</div><span>Include Sunday</span></button>
          </div>
          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#E67E22", fontWeight: 700, marginBottom: 8 }}>💰 Job Totals</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Total Earnings</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.totalEarnings} onChange={e => updateJobEditForm("totalEarnings", e.target.value)} /></div>
            <div style={S.half}>
              <label style={S.label}>{jf.hoursMode === "perday" ? "Hours (per day)" : "Hours (total)"}</label>
              <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.totalHours} onChange={e => updateJobEditForm("totalHours", e.target.value)} />
              <div style={{...S.toggleRow, marginTop: 6}}>
                <button type="button" onClick={() => updateJobEditForm("hoursMode", "total")} style={jf.hoursMode !== "perday" ? S.toggleBtnActive : S.toggleBtn}>Total</button>
                <button type="button" onClick={() => updateJobEditForm("hoursMode", "perday")} style={jf.hoursMode === "perday" ? S.toggleBtnActive : S.toggleBtn}>Per day</button>
              </div>
            </div>
          </div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Materials</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.materials} onChange={e => updateJobEditForm("materials", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>Labour</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.labour} onChange={e => updateJobEditForm("labour", e.target.value)} /></div>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>{jf.fuelMode === "perday" ? "Fuel / Travel (per day)" : "Fuel / Travel (total)"}</label>
            <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jf.fuel} onChange={e => updateJobEditForm("fuel", e.target.value)} />
            <div style={{...S.toggleRow, marginTop: 6}}>
              <button type="button" onClick={() => updateJobEditForm("fuelMode", "total")} style={jf.fuelMode !== "perday" ? S.toggleBtnActive : S.toggleBtn}>Total</button>
              <button type="button" onClick={() => updateJobEditForm("fuelMode", "perday")} style={jf.fuelMode === "perday" ? S.toggleBtnActive : S.toggleBtn}>Per day</button>
            </div>
            {jf.fuelMode === "perday" && jDays > 0 && Number(jf.fuel) > 0 && (
              <div style={{fontSize: 11, color: "#888", marginTop: 4}}>Total fuel: {fmt((Number(jf.fuel)||0) * jDays)} across {jDays} days</div>
            )}
          </div>
          <div style={S.fieldGroup}><label style={S.label}>Notes</label><input style={S.input} placeholder="e.g. Extra day needed for plumbing" value={jf.notes} onChange={e => updateJobEditForm("notes", e.target.value)} /></div>
          {(() => {
            const effectiveFuel = jf.fuelMode === "perday" && jDays > 0 ? (Number(jf.fuel)||0) * jDays : (Number(jf.fuel)||0);
            const previewC = (Number(jf.materials)||0) + (Number(jf.labour)||0) + effectiveFuel;
            const previewProfit = totalE - previewC;
            return jDays > 0 && totalE > 0 ? (
              <div style={S.rangePreview}>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Days</span><span style={S.rangePreviewVal}>{jDays}</span></div>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Total costs</span><span style={{...S.rangePreviewVal, color:"#E74C3C"}}>{fmt(previewC)}</span></div>
                <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Profit</span><span style={{...S.rangePreviewVal, color: previewProfit>=0?"#27AE60":"#E74C3C", fontWeight:800}}>{fmt(previewProfit)}</span></div>
              </div>
            ) : null;
          })()}
          <button onClick={saveJobEdit} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Saved!" : "Save Changes"}</button>
          <button type="button" onClick={() => setConfirmAction({ label: "Delete this completed job?", action: () => { const prev = jobs; saveJobs(jobs.filter(j => j !== editingJob)); queueUndo("Job deleted", () => saveJobs(prev)); setEditingJob(null); setView("jobs"); } })} style={S.deleteBtn}>Delete Job</button>
        </div>
      </div>
    );
  }

  // ═══ CREATE ACTIVE JOB ═══
  if (view === "createActiveJob") {
    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => setView("jobs")} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>Start a Job</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Client</label>
            <input style={S.input} list="aj-clients" placeholder="e.g. Mr Smith" value={activeJobForm.client} onChange={e => setActiveJobForm({...activeJobForm, client: e.target.value})} />
            <datalist id="aj-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Job</label>
            <input style={S.input} list="aj-jobs" placeholder="e.g. Kitchen refit" value={activeJobForm.job} onChange={e => setActiveJobForm({...activeJobForm, job: e.target.value})} />
            <datalist id="aj-jobs">{knownJobs.map(j => <option key={j} value={j} />)}</datalist>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Start Date</label>
            <input style={S.input} type="date" value={activeJobForm.startDate} onChange={e => setActiveJobForm({...activeJobForm, startDate: e.target.value})} />
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Quote (optional)</label>
            <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={activeJobForm.expectedRevenue} onChange={e => setActiveJobForm({...activeJobForm, expectedRevenue: e.target.value})} />
          </div>
          <button onClick={createActiveJob} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Started!" : "Start Job"}</button>
        </div>
      </div>
    );
  }

  // ═══ ACTIVE JOB DETAIL ═══
  if (view === "activeJobDetail" && viewingActiveJob) {
    const aj = activeJobs.find(j => j.id === viewingActiveJob.id) || viewingActiveJob;
    const totalExp = aj.expenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
    const byCategory = {};
    aj.expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0); });
    const expectedRev = Number(aj.expectedRevenue) || 0;
    const runningProfit = expectedRev > 0 ? expectedRev - totalExp : null;

    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setViewingActiveJob(null); setView("jobs"); setJobsSubView("active"); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDate}>
            <div style={S.entryDay}>Active</div>
            <div style={S.entryDateNum}>{aj.client}</div>
          </div>
        </div>

        <div style={S.formWrap}>
          <div style={{...S.rangePreview, marginBottom: 14}}>
            <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Job</span><span style={S.rangePreviewVal}>{aj.job || "—"}</span></div>
            <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Started</span><span style={S.rangePreviewVal}>{aj.startDate}</span></div>
            <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Days worked</span><span style={S.rangePreviewVal}>{aj.daysWorked.length}</span></div>
            <div style={S.rangePreviewRow}>
              <span style={S.rangePreviewLabel}>Quote</span>
              {quoteEditMode ? (
                <div style={{display:"flex", gap:6, alignItems:"center"}}>
                  <input style={{...S.input, width:100, padding:"4px 8px", fontSize:13}} type="number" inputMode="decimal" value={quoteEditVal} onChange={e => setQuoteEditVal(e.target.value)} autoFocus />
                  <button type="button" onClick={() => { saveActiveJobs(activeJobs.map(j => j.id === aj.id ? {...j, expectedRevenue: Number(quoteEditVal)||0} : j)); setViewingActiveJob({...aj, expectedRevenue: Number(quoteEditVal)||0}); setQuoteEditMode(false); }} style={{...S.editBookingBtn, padding:"4px 10px"}}>Save</button>
                  <button type="button" onClick={() => setQuoteEditMode(false)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13}}>Cancel</button>
                </div>
              ) : (
                <div style={{display:"flex", gap:8, alignItems:"center"}}>
                  <span style={{...S.rangePreviewVal, color: expectedRev > 0 ? "#E67E22" : "#555"}}>{expectedRev > 0 ? fmt(expectedRev) : "Not set"}</span>
                  <button type="button" onClick={() => { setQuoteEditVal(String(aj.expectedRevenue || "")); setQuoteEditMode(true); }} style={{...S.editBookingBtn, padding:"2px 8px", fontSize:11}}>Edit</button>
                </div>
              )}
            </div>
            <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Expenses so far</span><span style={{...S.rangePreviewVal, color:"#E74C3C"}}>{fmt(totalExp)}</span></div>
            {runningProfit !== null && <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Estimated profit</span><span style={{...S.rangePreviewVal, color: runningProfit >= 0 ? "#27AE60" : "#E74C3C", fontWeight:800}}>{fmt(runningProfit)}</span></div>}
          </div>

          {Object.keys(byCategory).length > 0 && (
            <div style={{...S.miniRow, marginBottom: 10, flexWrap: "wrap"}}>
              {Object.entries(byCategory).map(([cat, amt]) => (
                <div key={cat} style={{...S.miniCard, flex:"0 0 auto", minWidth: 80}}>
                  <div style={S.miniLabel}>{JOB_CAT_ICONS[cat] || "📦"} {cat}</div>
                  <div style={{...S.miniVal, fontSize: 14, color:"#E74C3C"}}>{fmt(amt)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Add expense */}
          <div style={S.sectionTitle}>Add Expense</div>
          <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
            {JOB_EXPENSE_CATS.map(cat => (
              <button key={cat} type="button" onClick={() => setJobExpForm({...jobExpForm, category: cat})} style={jobExpForm.category === cat ? {...S.toggleBtnActive, flex:"0 0 auto", padding:"8px 12px", borderRadius:20, fontSize:12} : {...S.toggleBtn, flex:"0 0 auto", padding:"8px 12px", borderRadius:20, fontSize:12, border:"1px solid #333"}}>
                {JOB_CAT_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Amount</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={jobExpForm.amount} onChange={e => setJobExpForm({...jobExpForm, amount: e.target.value})} /></div>
            <div style={S.half}><label style={S.label}>Date</label><input style={S.input} type="date" value={jobExpForm.date} onChange={e => setJobExpForm({...jobExpForm, date: e.target.value})} /></div>
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Supplier (optional)</label>
              <input style={S.input} list="known-suppliers" placeholder="e.g. Screwfix" value={jobExpForm.supplier} onChange={e => setJobExpForm({...jobExpForm, supplier: e.target.value})} />
              <datalist id="known-suppliers">{knownSuppliers.map(s => <option key={s} value={s} />)}</datalist>
            </div>
            <div style={S.half}><label style={S.label}>Note (optional)</label><input style={S.input} placeholder="e.g. screws and sealant" value={jobExpForm.note} onChange={e => setJobExpForm({...jobExpForm, note: e.target.value})} /></div>
          </div>
          <button onClick={() => addExpenseToJob(aj.id)} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Added!" : `+ Add ${jobExpForm.category}`}</button>

          {/* Days worked */}
          <div style={S.sectionTitle}>Days Worked</div>
          <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
            {aj.daysWorked.map(d => (
              <div key={d} style={{background:"#22252C", borderRadius:8, padding:"6px 10px", fontSize:12, display:"flex", alignItems:"center", gap:6}}>
                <span>{new Date(d+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span>
                <button type="button" onClick={() => removeDayWorked(aj.id, d)} style={{background:"none",border:"none",color:"#555",fontSize:14,cursor:"pointer",padding:0}}>✕</button>
              </div>
            ))}
          </div>
          <div style={S.row}>
            <div style={{flex:1}}>
              <input id="add-day-input" style={S.input} type="date" defaultValue={dateKey(new Date())} />
            </div>
            <button type="button" onClick={() => { const inp = document.getElementById("add-day-input"); if (inp?.value) { addDayWorked(aj.id, inp.value); } }} style={{...S.editBookingBtn, padding:"10px 16px", alignSelf:"flex-end"}}>+ Add Day</button>
          </div>

          {/* Expense history */}
          {aj.expenses.length > 0 && <div style={S.sectionTitle}>Expense History</div>}
          {[...aj.expenses].reverse().map(exp => (
            <div key={exp.id} style={S.expRow}>
              <div style={S.expIcon}>{JOB_CAT_ICONS[exp.category] || "📦"}</div>
              <div style={S.expInfo}>
                <div style={S.expName}>{exp.note || exp.category}{exp.supplier ? ` — ${exp.supplier}` : ""}</div>
                <div style={S.expCat}>{new Date(exp.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})} · {exp.category}{exp.supplier ? ` · ${exp.supplier}` : ""}</div>
              </div>
              <div style={S.expAmount}>{fmt(exp.amount)}</div>
              <button onClick={() => removeJobExpense(aj.id, exp.id)} style={S.expDel}>✕</button>
            </div>
          ))}

          <div style={S.divider} />

          {/* Complete job */}
          {!completeMode ? (
            <button onClick={() => { setCompleteMode(true); setFinalRevInput(String(aj.expectedRevenue || "")); }} style={S.completeJobBtn}>✓ Complete Job</button>
          ) : (
            <div style={{...S.rangePreview, marginTop: 8}}>
              <div style={{fontSize:13,fontWeight:700,color:"#27AE60",marginBottom:8}}>Complete this job</div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Final Revenue</label>
                <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={finalRevInput} onChange={e => setFinalRevInput(e.target.value)} />
              </div>
              {Number(finalRevInput) > 0 && (
                <div style={{...S.rangePreviewRow, marginBottom:8}}>
                  <span style={S.rangePreviewLabel}>Final profit</span>
                  <span style={{...S.rangePreviewVal, color: (Number(finalRevInput) - totalExp) >= 0 ? "#27AE60" : "#E74C3C", fontWeight:800}}>{fmt(Number(finalRevInput) - totalExp)}</span>
                </div>
              )}
              <div style={{display:"flex", gap:8}}>
                <button onClick={() => setCompleteMode(false)} style={{...S.confirmCancel, flex:1}}>Cancel</button>
                <button onClick={() => completeActiveJob(aj.id, finalRevInput)} style={{...S.saveBtn, flex:1, marginTop:0}}>Complete</button>
              </div>
            </div>
          )}

          <button type="button" onClick={() => setConfirmAction({ label: `Delete "${aj.client} — ${aj.job}"?`, action: () => deleteActiveJob(aj.id) })} style={S.deleteBtn}>Delete Job</button>
        </div>
      </div>
    );
  }

  // ═══ ADD EXPENSE TO JOB (picker) ═══
  if (jobExpPickerOpen && activeJobs.length > 0) {
    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setJobExpPickerOpen(false); setJobExpPickerCategory(null); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>{jobExpPickerCategory ? `Add ${jobExpPickerCategory}` : "Add Job Expense"}</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.sectionTitle}>Pick a job</div>
          {activeJobs.map(aj => {
            const totalExp = aj.expenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
            return (
              <button key={aj.id} type="button" onClick={() => {
                setViewingActiveJob(aj);
                setJobExpForm({ date: dateKey(new Date()), amount:"", category: jobExpPickerCategory || "Materials", note:"" });
                setJobExpPickerOpen(false);
                setCompleteMode(false);
                setView("activeJobDetail");
              }} style={{...S.jobCard, display:"block", textAlign:"left", border:"none", cursor:"pointer", fontFamily:"inherit", color:"#F0F0F0", width:"calc(100% - 40px)", borderLeft:"3px solid #E67E22"}}>
                <div style={S.jobCardHeader}>
                  <div>
                    <div style={S.jobCardClient}>{aj.client}</div>
                    <div style={S.jobCardJob}>{aj.job}</div>
                  </div>
                  <div style={{...S.jobCardProfit, color:"#E74C3C", fontSize:16}}>{fmt(totalExp)}</div>
                </div>
                <div style={S.jobCardDates}>Started {aj.startDate} · {aj.daysWorked.length} days · {aj.expenses.length} expenses</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══ JOBS LIST ═══
  if (view === "jobs") {
    const totalJobProfit = jobs.reduce((t, j) => t + (j.profit||0), 0);
    const totalJobEarnings = jobs.reduce((t, j) => t + (j.totalEarnings||0), 0);
    const completedSorted = [...jobs].sort((a, b) => (b.completedAt || b.dateFrom || "").localeCompare(a.completedAt || a.dateFrom || ""));
    const filteredCompleted = jobSearch.trim() ? completedSorted.filter(j => (j.client + " " + j.job).toLowerCase().includes(jobSearch.toLowerCase())) : completedSorted;
    const totalActiveExp = activeJobs.reduce((t, aj) => t + aj.expenses.reduce((t2, e) => t2 + (Number(e.amount) || 0), 0), 0);

    return (
      <div style={S.app}>
        <div style={S.dashHeader}><div style={S.dashIcon}>🔨</div><div style={S.dashTitle}>Jobs</div></div>

        <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
          <button onClick={() => setJobsSubView("active")} style={jobsSubView === "active" ? S.toggleBtnActive : S.toggleBtn}>Active Jobs</button>
          <button onClick={() => setJobsSubView("completed")} style={jobsSubView === "completed" ? S.toggleBtnActive : S.toggleBtn}>Completed</button>
        </div>

        {jobsSubView === "active" ? (
          <>
            <button onClick={() => openQuickAction("newActiveJob")} style={S.bookRangeBtn}>+ Start a New Job</button>

            {activeJobs.length > 0 && (
              <div style={{...S.miniRow, padding: "0 20px 8px"}}>
                <div style={S.miniCard}><div style={S.miniLabel}>Active jobs</div><div style={S.miniVal}>{activeJobs.length}</div></div>
                <div style={S.miniCard}><div style={S.miniLabel}>Total expenses</div><div style={{...S.miniVal, color:"#E74C3C"}}>{fmt(totalActiveExp)}</div></div>
              </div>
            )}

            {activeJobs.length === 0 && <div style={S.emptyWrap}><div style={{fontSize:40,marginBottom:12}}>🔨</div><div style={S.emptyText}>No active jobs</div><div style={{...S.emptyText,fontSize:12,marginTop:4}}>Start a job to track expenses as you go</div></div>}

            {activeJobs.map(aj => {
              const totalExp = aj.expenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
              const expectedRev = Number(aj.expectedRevenue) || 0;
              const estProfit = expectedRev > 0 ? expectedRev - totalExp : null;
              return (
                <button key={aj.id} type="button" onClick={() => { setViewingActiveJob(aj); setJobExpForm({ date: dateKey(new Date()), amount:"", category:"Materials", note:"" }); setCompleteMode(false); setQuoteEditMode(false); setView("activeJobDetail"); }} style={{...S.jobCard, display:"block", textAlign:"left", border:"none", cursor:"pointer", fontFamily:"inherit", color:"#F0F0F0", width:"calc(100% - 40px)", borderLeft:"3px solid #E67E22"}}>
                  <div style={S.jobCardHeader}>
                    <div>
                      <div style={S.jobCardClient}>{aj.client}</div>
                      <div style={S.jobCardJob}>{aj.job}</div>
                    </div>
                    <div style={{...S.jobCardProfit, color: estProfit !== null ? (estProfit >= 0 ? "#27AE60" : "#E74C3C") : "#E74C3C", fontSize: estProfit !== null ? 20 : 16}}>
                      {estProfit !== null ? fmt(estProfit) : fmt(totalExp)}
                    </div>
                  </div>
                  <div style={S.jobCardDates}>Started {aj.startDate} · {aj.daysWorked.length} days worked</div>
                  <div style={S.jobCardStats}>
                    {expectedRev > 0 && <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Quote</span>{fmt(expectedRev)}</div>}
                    <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Expenses</span><span style={{color:"#E74C3C"}}>{fmt(totalExp)}</span></div>
                    <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Days</span>{aj.daysWorked.length}</div>
                    {estProfit !== null && <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Est. Profit</span><span style={{color:estProfit>=0?"#27AE60":"#E74C3C"}}>{fmt(estProfit)}</span></div>}
                  </div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Tap to add expenses →</div>
                </button>
              );
            })}
          </>
        ) : (
          <>
            <button onClick={() => { setJobForm(defaultJobForm()); setCompletingBooking(null); setView("logJob"); }} style={S.bookRangeBtn}>+ Log a Completed Job</button>

            {jobs.length > 0 && (
              <div style={{...S.miniRow, padding: "0 20px 8px"}}>
                <div style={S.miniCard}><div style={S.miniLabel}>Completed · earned</div><div style={{...S.miniVal, color:"#E67E22"}}>{fmt(totalJobEarnings)}</div></div>
                <div style={S.miniCard}><div style={S.miniLabel}>Completed · profit</div><div style={{...S.miniVal, color: totalJobProfit>=0?"#27AE60":"#E74C3C"}}>{fmt(totalJobProfit)}</div></div>
              </div>
            )}

            {jobs.length > 0 && (
              <div style={{ padding: "0 20px 8px" }}>
                <input style={S.searchInput} placeholder="Search completed jobs..." value={jobSearch} onChange={e => setJobSearch(e.target.value)} />
              </div>
            )}
            {filteredCompleted.length === 0 && jobs.length > 0 && jobSearch.trim() && <div style={S.emptyText}>No jobs match "{jobSearch}"</div>}
            {jobs.length === 0 && <div style={S.emptyWrap}><div style={{fontSize:40,marginBottom:12}}>✓</div><div style={S.emptyText}>No completed jobs yet</div></div>}
            {filteredCompleted.map((j, ji) => (
              <button type="button" key={j.id || `job-${ji}-${j.dateFrom}-${j.client}`} onClick={() => openJobEdit(j)} style={{...S.jobCard, display:"block", textAlign:"left", border:"none", cursor:"pointer", fontFamily:"inherit", color:"#F0F0F0", width:"calc(100% - 40px)"}}>
                <div style={S.jobCardHeader}>
                  <div>
                    <div style={S.jobCardClient}>{j.client}</div>
                    <div style={S.jobCardJob}>{j.job}</div>
                  </div>
                  <div style={{...S.jobCardProfit, color: j.profit>=0?"#27AE60":"#E74C3C"}}>{fmt(j.profit)}</div>
                </div>
                <div style={S.jobCardDates}>{j.dateFrom} → {j.dateTo} · {j.days} days</div>
                <div style={S.jobCardStats}>
                  <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Earned</span>{fmt(j.totalEarnings)}</div>
                  <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Materials</span>{fmt(j.materials)}</div>
                  <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Labour</span>{fmt(j.labour)}</div>
                  <div style={S.jobCardStat}><span style={S.jobCardStatLbl}>Fuel</span>{fmt(j.fuel)}</div>
                </div>
                {j.notes && <div style={S.jobCardNotes}>📝 {j.notes}</div>}
                <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Tap to edit →</div>
              </button>
            ))}
          </>
        )}
        <div style={{height:40}} />
        <Nav {...navProps} />
      </div>
    );
  }

  // ═══ BOOK DATE RANGE ═══
  if (view === "bookRange") {
    const start = new Date(rangeForm.dateFrom + "T12:00:00");
    const end = new Date(rangeForm.dateTo + "T12:00:00");
    let dayCount = 0, satCount = 0, sunCount = 0, weekdayCount = 0;
    if (end >= start) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow === 6) { if (rangeForm.includeSaturday) { dayCount++; satCount++; } }
        else if (dow === 0) { if (rangeForm.includeSunday) { dayCount++; sunCount++; } }
        else { dayCount++; weekdayCount++; }
      }
    }
    const totalExpected = dayCount * (Number(rangeForm.expectedEarnings) || 0);
    const jobPrice = Number(rangeForm.jobPrice) || 0;

    // Day label
    let dayLabel = `${weekdayCount} weekday${weekdayCount !== 1 ? "s" : ""}`;
    if (satCount > 0) dayLabel += ` + ${satCount} Sat`;
    if (sunCount > 0) dayLabel += ` + ${sunCount} Sun`;

    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => setView("schedule")} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>Book a Job</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Client</label>
            <input style={S.input} list="range-clients" placeholder="e.g. Mr Smith" value={rangeForm.client} onChange={e => updateRangeForm("client", e.target.value)} />
            <datalist id="range-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Job</label>
            <input style={S.input} list="job-names" placeholder="e.g. Kitchen refit" value={rangeForm.job} onChange={e => updateRangeForm("job", e.target.value)} />
          </div>
          <div style={S.row}>
            <div style={S.half}>
              <label style={S.label}>Job Price £ (total)</label>
              <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={rangeForm.jobPrice} onChange={e => updateRangeForm("jobPrice", e.target.value)} />
            </div>
            <div style={S.half}>
              <label style={S.label}>Expected £ / day</label>
              <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={rangeForm.expectedEarnings} onChange={e => updateRangeForm("expectedEarnings", e.target.value)} />
            </div>
          </div>

          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>📅 Dates</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={rangeForm.dateFrom} onChange={e => updateRangeForm("dateFrom", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={rangeForm.dateTo} onChange={e => updateRangeForm("dateTo", e.target.value)} /></div>
          </div>

          {/* Separate Saturday / Sunday toggles */}
          <div style={S.weekendToggles}>
            <button onClick={() => updateRangeForm("includeSaturday", !rangeForm.includeSaturday)} style={S.weekendToggle}>
              <div style={{ ...S.weekendBox, ...(rangeForm.includeSaturday ? S.weekendBoxChecked : {}) }}>
                {rangeForm.includeSaturday && "✓"}
              </div>
              <span>Include Saturday</span>
            </button>
            <button onClick={() => updateRangeForm("includeSunday", !rangeForm.includeSunday)} style={S.weekendToggle}>
              <div style={{ ...S.weekendBox, ...(rangeForm.includeSunday ? S.weekendBoxChecked : {}) }}>
                {rangeForm.includeSunday && "✓"}
              </div>
              <span>Include Sunday</span>
            </button>
          </div>

          {/* Preview */}
          {dayCount > 0 && (
            <div style={S.rangePreview}>
              <div style={S.rangePreviewRow}>
                <span style={S.rangePreviewLabel}>Days</span>
                <span style={S.rangePreviewVal}>{dayLabel}</span>
              </div>
              {jobPrice > 0 && (
                <div style={S.rangePreviewRow}>
                  <span style={S.rangePreviewLabel}>Job price</span>
                  <span style={{ ...S.rangePreviewVal, color: "#F0F0F0", fontWeight: 700 }}>{fmt(jobPrice)}</span>
                </div>
              )}
              {totalExpected > 0 && (
                <div style={S.rangePreviewRow}>
                  <span style={S.rangePreviewLabel}>Daily forecast × {dayCount}</span>
                  <span style={{ ...S.rangePreviewVal, color: "#E67E22", fontWeight: 800 }}>{fmt(totalExpected)}</span>
                </div>
              )}
              {jobPrice > 0 && totalExpected > 0 && totalExpected !== jobPrice && (
                <div style={S.rangePreviewRow}>
                  <span style={{ ...S.rangePreviewLabel, color: totalExpected > jobPrice ? "#27AE60" : "#E74C3C" }}>
                    {totalExpected > jobPrice ? "▲ Over job price by" : "▼ Under job price by"}
                  </span>
                  <span style={{ ...S.rangePreviewVal, color: totalExpected > jobPrice ? "#27AE60" : "#E74C3C" }}>{fmt(Math.abs(totalExpected - jobPrice))}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={doSaveScheduleRange} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Booked!" : `Book ${dayCount} Day${dayCount !== 1 ? "s" : ""}`}</button>
        </div>
      </div>
    );
  }

  // ═══ EDIT BOOKING ═══
  if (view === "editBooking" && editingBooking) {
    const bf = bookingEditForm;
    // Calculate new day count based on edited dates
    const bfStartParts = (bf.dateFrom||"").split("-").map(Number);
    const bfEndParts = (bf.dateTo||"").split("-").map(Number);
    let newDayCount = 0, newWeekdays = 0, newSats = 0, newSuns = 0;
    if (bfStartParts.length === 3 && bfEndParts.length === 3) {
      const bfStart = new Date(bfStartParts[0], bfStartParts[1]-1, bfStartParts[2]);
      const bfEnd = new Date(bfEndParts[0], bfEndParts[1]-1, bfEndParts[2]);
      for (let t = bfStart.getTime(); t <= bfEnd.getTime(); t += 86400000) {
        const dow = new Date(t).getDay();
        if (dow === 6) { if (bf.includeSaturday) { newDayCount++; newSats++; } }
        else if (dow === 0) { if (bf.includeSunday) { newDayCount++; newSuns++; } }
        else { newDayCount++; newWeekdays++; }
      }
    }
    const newTotal = newDayCount * (Number(bf.expectedEarnings) || 0);
    const newJobPrice = Number(bf.jobPrice) || 0;

    let newDayLabel = `${newWeekdays} weekday${newWeekdays !== 1 ? "s" : ""}`;
    if (newSats > 0) newDayLabel += ` + ${newSats} Sat`;
    if (newSuns > 0) newDayLabel += ` + ${newSuns} Sun`;

    const doUpdateBooking = () => {
      // Delete old booking
      deleteBooking(editingBooking.bookingId);
      // Create new booking with updated details
      const ns = { ...schedule };
      // Remove old first (deleteBooking already did via state, but ns is from current)
      Object.keys(ns).forEach(dk => {
        ns[dk] = (ns[dk] || []).filter(it => it.bookingId !== editingBooking.bookingId);
        if (ns[dk].length === 0) delete ns[dk];
      });
      const newBid = "bk_" + Date.now();
      const item = { client: bf.client.trim(), job: bf.job.trim(), jobPrice: bf.jobPrice || "", expectedEarnings: bf.expectedEarnings || "", bookingId: newBid, dateFrom: bf.dateFrom, dateTo: bf.dateTo };
      if (bfStartParts.length === 3 && bfEndParts.length === 3) {
        const bfStart = new Date(bfStartParts[0], bfStartParts[1]-1, bfStartParts[2]);
        const bfEnd = new Date(bfEndParts[0], bfEndParts[1]-1, bfEndParts[2]);
        for (let t = bfStart.getTime(); t <= bfEnd.getTime(); t += 86400000) {
          const dd = new Date(t);
          const dow = dd.getDay();
          if (dow === 6 && !bf.includeSaturday) continue;
          if (dow === 0 && !bf.includeSunday) continue;
          const dk = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
          if (!ns[dk]) ns[dk] = [];
          ns[dk] = [...ns[dk], { ...item }];
        }
      }
      saveSchedule(ns);
      setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
      setEditingBooking(null); setView("schedule");
    };

    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setView("editSchedule"); setEditingBooking(null); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>Edit Booking</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Client</label>
            <input style={S.input} list="bk-clients" value={bf.client} onChange={e => updateBookingEditForm("client", e.target.value)} />
            <datalist id="bk-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={S.fieldGroup}>
            <label style={S.label}>Job</label>
            <input style={S.input} list="job-names" value={bf.job} onChange={e => updateBookingEditForm("job", e.target.value)} />
          </div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Job Price £ (total)</label><input style={S.input} type="number" inputMode="decimal" value={bf.jobPrice} onChange={e => updateBookingEditForm("jobPrice", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>Expected £ / day</label><input style={S.input} type="number" inputMode="decimal" value={bf.expectedEarnings} onChange={e => updateBookingEditForm("expectedEarnings", e.target.value)} /></div>
          </div>

          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>📅 Dates</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={bf.dateFrom} onChange={e => updateBookingEditForm("dateFrom", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={bf.dateTo} onChange={e => updateBookingEditForm("dateTo", e.target.value)} /></div>
          </div>
          <div style={S.weekendToggles}>
            <button onClick={() => updateBookingEditForm("includeSaturday", !bf.includeSaturday)} style={S.weekendToggle}>
              <div style={{ ...S.weekendBox, ...(bf.includeSaturday ? S.weekendBoxChecked : {}) }}>{bf.includeSaturday && "✓"}</div>
              <span>Include Saturday</span>
            </button>
            <button onClick={() => updateBookingEditForm("includeSunday", !bf.includeSunday)} style={S.weekendToggle}>
              <div style={{ ...S.weekendBox, ...(bf.includeSunday ? S.weekendBoxChecked : {}) }}>{bf.includeSunday && "✓"}</div>
              <span>Include Sunday</span>
            </button>
          </div>

          {newDayCount > 0 && (
            <div style={S.rangePreview}>
              <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Days</span><span style={S.rangePreviewVal}>{newDayLabel}</span></div>
              {newJobPrice > 0 && <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Job price</span><span style={S.rangePreviewVal}>{fmt(newJobPrice)}</span></div>}
              {newTotal > 0 && <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Daily forecast × {newDayCount}</span><span style={{ ...S.rangePreviewVal, color: "#E67E22", fontWeight: 800 }}>{fmt(newTotal)}</span></div>}
              {newJobPrice > 0 && newTotal > 0 && newTotal !== newJobPrice && (
                <div style={S.rangePreviewRow}>
                  <span style={{ ...S.rangePreviewLabel, color: newTotal > newJobPrice ? "#27AE60" : "#E74C3C" }}>{newTotal > newJobPrice ? "▲ Over by" : "▼ Under by"}</span>
                  <span style={{ ...S.rangePreviewVal, color: newTotal > newJobPrice ? "#27AE60" : "#E74C3C" }}>{fmt(Math.abs(newTotal - newJobPrice))}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={doUpdateBooking} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Updated!" : `Update Booking (${newDayCount} days)`}</button>
          <button onClick={() => {
            // Pre-fill job form from booking
            const hasSat = bf.includeSaturday, hasSun = bf.includeSunday;
            setJobForm({ client: bf.client, job: bf.job, dateFrom: bf.dateFrom, dateTo: bf.dateTo, includeSaturday: hasSat, includeSunday: hasSun, totalEarnings: bf.jobPrice||"", materials:"", labour:"", fuel:"", notes:"" });
            setCompletingBooking(editingBooking);
            setEditingBooking(null); setView("completeJob");
          }} style={S.completeJobBtn}>✓ Complete Job</button>
          <button onClick={() => {
            deleteBooking(editingBooking.bookingId);
            setEditingBooking(null); setEditingSchedDate(null); setView("schedule");
          }} style={S.deleteBtn}>Delete Entire Booking</button>
        </div>
      </div>
    );
  }

  // ═══ EDIT SCHEDULE DAY ═══
  if (view === "editSchedule") {
    const d = editingSchedDate ? new Date(editingSchedDate + "T12:00:00") : new Date();
    const dayItems = schedule[editingSchedDate] || [];
    // Find unique bookings on this day
    const bookings = dayItems.filter(it => it.bookingId);
    const singles = dayItems.filter(it => !it.bookingId);
    // Unique booking IDs
    const uniqueBookings = [];
    const seenBids = new Set();
    bookings.forEach(b => { if (!seenBids.has(b.bookingId)) { seenBids.add(b.bookingId); uniqueBookings.push(b); } });

    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setView("schedule"); setEditingSchedDate(null); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDate}>
            <div style={S.entryDay}>{DAYS[d.getDay()===0?6:d.getDay()-1]}</div>
            <div style={S.entryDateNum}>{d.getDate()} {MONTHS[d.getMonth()]}</div>
          </div>
        </div>
        <div style={S.formWrap}>
          {/* Show linked bookings with edit button */}
          {uniqueBookings.map(bk => (
            <div key={bk.bookingId} style={S.schedSlot}>
              <div style={S.schedSlotHeader}>
                <div style={S.schedSlotTitle}>{bk.client || "Job"}</div>
                <button onClick={() => {
                  setEditingBooking(bk);
                  // Figure out if booking includes sat/sun by checking existing days
                  let hasSat = false, hasSun = false;
                  Object.entries(schedule).forEach(([dk, items]) => {
                    if (items.some(it => it.bookingId === bk.bookingId)) {
                      const dParts = dk.split("-").map(Number);
                      const dow = new Date(dParts[0], dParts[1]-1, dParts[2]).getDay();
                      if (dow === 6) hasSat = true;
                      if (dow === 0) hasSun = true;
                    }
                  });
                  setBookingEditForm({ client: bk.client||"", job: bk.job||"", jobPrice: bk.jobPrice||"", expectedEarnings: bk.expectedEarnings||"", dateFrom: bk.dateFrom||"", dateTo: bk.dateTo||"", includeSaturday: hasSat, includeSunday: hasSun });
                  setView("editBooking");
                }} style={S.editBookingBtn}>Edit booking</button>
              </div>
              <div style={S.bookingInfo}>{bk.job}{bk.expectedEarnings ? ` · ${fmt(bk.expectedEarnings)}/day` : ""}</div>
              {bk.dateFrom && <div style={S.bookingDates}>{bk.dateFrom} → {bk.dateTo}</div>}
            </div>
          ))}

          {/* Editable single-day items */}
          <div style={S.sectionTitle2}>Day schedule</div>
          {schedForm.map((slot, idx) => (
            <div key={idx} style={S.schedSlot}>
              <div style={S.schedSlotHeader}>
                <div style={S.schedSlotTitle}>Job {idx + 1}</div>
                {schedForm.length > 1 && <button onClick={() => removeSchedSlot(idx)} style={S.schedSlotDel}>✕</button>}
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Client</label>
                <input style={S.input} list="sched-clients" placeholder="e.g. Mr Smith" value={slot.client} onChange={e => updateSchedForm(idx, "client", e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Job</label>
                <input style={S.input} list="job-names" placeholder="e.g. Kitchen refit" value={slot.job} onChange={e => updateSchedForm(idx, "job", e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Expected Earnings £</label>
                <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={slot.expectedEarnings} onChange={e => updateSchedForm(idx, "expectedEarnings", e.target.value)} />
              </div>
            </div>
          ))}
          <datalist id="sched-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          <button onClick={addSchedSlot} style={S.addSlotBtn}>+ Add another job</button>
          <button onClick={doSaveSchedule} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Saved!" : "Save Schedule"}</button>
          {schedule[editingSchedDate] && <button onClick={() => { const ns={...schedule}; delete ns[editingSchedDate]; saveSchedule(ns); setEditingSchedDate(null); setView("schedule"); }} style={S.deleteBtn}>Clear Day</button>}
        </div>
      </div>
    );
  }

  // ═══ SCHEDULE VIEW ═══
  if (view === "schedule") {
    const weekDays = getWeekDays(schedWeekStart);
    const todayStr = dateKey(new Date());

    return (
      <div style={S.app}>
        <div style={S.dashHeader}>
          <div style={S.dashIcon}>📆</div>
          <div style={S.dashTitle}>Calendar</div>
        </div>

        {/* Schedule / Month toggle */}
        <div style={{ ...S.toggleRow, margin: "0 20px 8px" }}>
          <button onClick={() => setView("schedule")} style={S.toggleBtnActive}>Schedule</button>
          <button onClick={() => setView("month")} style={S.toggleBtn}>Month Earnings</button>
        </div>

        {/* Book a job button */}
        <button onClick={() => { setRangeForm({ client:"", job:"", jobPrice:"", expectedEarnings:"", dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false }); setView("bookRange"); }} style={S.bookRangeBtn}>📋 Book a Job (date range)</button>
        <div style={S.calJobsHint}>These bookings also show in the <strong style={{ color: "#E67E22" }}>Jobs</strong> tab for forecast vs price.</div>

        {/* Week / Month toggle */}
        <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
          <button onClick={() => setSchedView("week")} style={schedView==="week" ? S.toggleBtnActive : S.toggleBtn}>Week</button>
          <button onClick={() => setSchedView("month")} style={schedView==="month" ? S.toggleBtnActive : S.toggleBtn}>Month</button>
        </div>

        {schedView === "week" ? (
          <>
            {/* Week navigation */}
            <div style={S.monthNav}>
              <button onClick={() => { const d=new Date(schedWeekStart); d.setDate(d.getDate()-7); setSchedWeekStart(d); }} style={S.navArrow}>◀</button>
              <div style={S.monthTitle}>W{getWeekNumber(schedWeekStart)}</div>
              <button onClick={() => { const d=new Date(schedWeekStart); d.setDate(d.getDate()+7); setSchedWeekStart(d); }} style={S.navArrow}>▶</button>
            </div>

            {/* Week forecast */}
            <div style={S.schedForecast}>
              <div style={S.schedForecastLabel}>Week Forecast</div>
              <div style={S.schedForecastVal}>{fmt(weekForecast)}</div>
            </div>

            {/* Day cards */}
            <div style={S.schedDayList}>
              {weekDays.map(d => {
                const dk = dateKey(d);
                const items = schedule[dk] || [];
                const isToday = dk === todayStr;
                const isWknd = d.getDay() === 0 || d.getDay() === 6;
                const dayTotal = items.reduce((t, it) => t + (Number(it.expectedEarnings)||0), 0);
                const hasActual = entries[dk];

                return (
                  <button key={dk} onClick={() => openSchedDay(dk)} style={{ ...S.schedDayCard, ...(isToday ? S.schedDayToday : {}), ...(isWknd && !items.length ? S.schedDayWknd : {}) }}>
                    <div style={S.schedDayLeft}>
                      <div style={S.schedDayName}>{DAYS[d.getDay()===0?6:d.getDay()-1]}</div>
                      <div style={S.schedDayNum}>{d.getDate()}</div>
                      <div style={S.schedDayMonth}>{MONTHS[d.getMonth()]}</div>
                    </div>
                    <div style={S.schedDayRight}>
                      {items.length === 0 && <div style={S.schedEmpty}>Tap to schedule</div>}
                      {items.map((it, i) => (
                        <div key={i} style={S.schedJobPill}>
                          <div style={S.schedJobClient}>{it.client || "No client"}</div>
                          <div style={S.schedJobName}>{it.job || ""}</div>
                        </div>
                      ))}
                    </div>
                    <div style={S.schedDayEarn}>
                      {dayTotal > 0 && <div style={S.schedDayExpected}>{fmt(dayTotal)}</div>}
                      {hasActual && Number(hasActual.actual) > 0 && <div style={S.schedDayActual}>✓ {fmt(hasActual.actual)}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div onTouchStart={onTouchStart} onTouchEnd={makeSwipeEnd(() => setSchedMonth(Math.max(0, schedMonth-1)), () => setSchedMonth(Math.min(11, schedMonth+1)))}>
            {/* Month view */}
            <div style={S.monthNav}>
              <button onClick={() => setSchedMonth(Math.max(0, schedMonth-1))} style={S.navArrow}>◀</button>
              <div style={S.monthTitle}>{MONTHS[schedMonth]} {YEAR}</div>
              <button onClick={() => setSchedMonth(Math.min(11, schedMonth+1))} style={S.navArrow}>▶</button>
            </div>

            {/* Month forecast */}
            {(() => {
              const dim = new Date(YEAR, schedMonth+1, 0).getDate();
              let mForecast = 0;
              for (let d=1; d<=dim; d++) {
                const dk = `${YEAR}-${String(schedMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                (schedule[dk]||[]).forEach(it => mForecast += Number(it.expectedEarnings)||0);
              }
              return (
                <div style={S.schedForecast}>
                  <div style={S.schedForecastLabel}>Month Forecast</div>
                  <div style={S.schedForecastVal}>{fmt(mForecast)}</div>
                </div>
              );
            })()}

            {/* Calendar grid */}
            <div style={{ padding: "0 20px" }}>
              <div style={S.calHeader}>{DAYS.map(d => <div key={d} style={S.calHeaderDay}>{d}</div>)}</div>
              {(() => {
                const first = new Date(YEAR, schedMonth, 1);
                const dim = new Date(YEAR, schedMonth+1, 0).getDate();
                let startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
                const cells = [];
                for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} style={S.calCell} />);
                for (let d = 1; d <= dim; d++) {
                  const dk = `${YEAR}-${String(schedMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                  const items = schedule[dk] || [];
                  const isToday = dk === todayStr;
                  cells.push(
                    <button key={dk} onClick={() => openSchedDay(dk)} style={{ ...S.calCell, ...S.calCellBtn, ...(isToday ? S.calCellToday : {}), ...(items.length > 0 ? S.calCellFilled : {}) }}>
                      <div style={S.calCellNum}>{d}</div>
                      {items.length > 0 && <div style={S.calCellDot}>{items.length > 1 ? items.length : ""}</div>}
                      {items.length > 0 && <div style={S.calCellClient}>{items[0].client?.slice(0,6) || "Job"}</div>}
                    </button>
                  );
                }
                return <div style={S.calGrid}>{cells}</div>;
              })()}
            </div>
          </div>
        )}
        <Nav {...navProps} />
      </div>
    );
  }

  // ═══ ENTRY VIEW ═══
  if (view === "entry") {
    const d = editingDate ? new Date(editingDate + "T12:00:00") : new Date();
    const hasData = entries[editingDate] && Object.values(entries[editingDate]).some(v => v !== "");
    const schedItems = schedule[editingDate] || [];

    // Range day count
    let entryDayCount = 0;
    if (entryMode === "range") {
      const rs = new Date(entryRange.dateFrom + "T12:00:00");
      const re = new Date(entryRange.dateTo + "T12:00:00");
      if (re >= rs) {
        for (let dd = new Date(rs); dd <= re; dd.setDate(dd.getDate() + 1)) {
          const dow = dd.getDay();
          if (dow === 6 && !entryRange.includeSaturday) continue;
          if (dow === 0 && !entryRange.includeSunday) continue;
          entryDayCount++;
        }
      }
    }

    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setView("month"); setEditingDate(null); setEntryMode("single"); }} style={S.backBtn}>← Back</button>
          {entryMode === "single" ? (
            <div style={S.entryDate}>
              <div style={S.entryDay}>{DAYS[d.getDay()===0?6:d.getDay()-1]}</div>
              <div style={S.entryDateNum}>{d.getDate()} {MONTHS[d.getMonth()]}</div>
            </div>
          ) : (
            <div style={S.entryDateNum}>Log Multiple Days</div>
          )}
        </div>

        {/* Single / Range toggle */}
        <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
          <button onClick={() => setEntryMode("single")} style={entryMode==="single" ? S.toggleBtnActive : S.toggleBtn}>Single Day</button>
          <button onClick={() => { setEntryMode("range"); setEntryRange(r => ({ ...r, dateFrom: editingDate || dateKey(new Date()), dateTo: editingDate || dateKey(new Date()) })); }} style={entryMode==="range" ? S.toggleBtnActive : S.toggleBtn}>Date Range</button>
        </div>

        {/* Date range fields */}
        {entryMode === "range" && (
          <div style={{ padding: "0 20px 8px" }}>
            <div style={S.row}>
              <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={entryRange.dateFrom} onChange={e => updateEntryRange("dateFrom", e.target.value)} /></div>
              <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={entryRange.dateTo} onChange={e => updateEntryRange("dateTo", e.target.value)} /></div>
            </div>
            <div style={S.weekendToggles}>
              <button onClick={() => updateEntryRange("includeSaturday", !entryRange.includeSaturday)} style={S.weekendToggle}>
                <div style={{ ...S.weekendBox, ...(entryRange.includeSaturday ? S.weekendBoxChecked : {}) }}>{entryRange.includeSaturday && "✓"}</div>
                <span>Include Saturday</span>
              </button>
              <button onClick={() => updateEntryRange("includeSunday", !entryRange.includeSunday)} style={S.weekendToggle}>
                <div style={{ ...S.weekendBox, ...(entryRange.includeSunday ? S.weekendBoxChecked : {}) }}>{entryRange.includeSunday && "✓"}</div>
                <span>Include Sunday</span>
              </button>
            </div>
            {entryDayCount > 0 && (
              <div style={{ ...S.rangePreview, marginBottom: 8 }}>
                <div style={S.rangePreviewRow}>
                  <span style={S.rangePreviewLabel}>Will log to</span>
                  <span style={S.rangePreviewVal}>{entryDayCount} day{entryDayCount !== 1 ? "s" : ""}</span>
                </div>
                {(Number(form.actual) || 0) > 0 && (
                  <div style={S.rangePreviewRow}>
                    <span style={S.rangePreviewLabel}>Total earnings</span>
                    <span style={{ ...S.rangePreviewVal, color: "#E67E22", fontWeight: 800 }}>{fmt(entryDayCount * Number(form.actual))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {schedItems.length > 0 && entryMode === "single" && (
          <div style={S.schedHint}>
            <div style={S.schedHintLabel}>📆 Scheduled:</div>
            {schedItems.map((s, i) => <div key={i} style={S.schedHintItem}>{s.client}{s.job ? ` — ${s.job}` : ""}{s.expectedEarnings ? ` (${fmt(s.expectedEarnings)})` : ""}</div>)}
          </div>
        )}
        {entryMode === "single" && form.jobId && (() => {
          const j = jobs.find(jb => jb.id === form.jobId);
          return j ? (
            <div style={{...S.schedHint, borderLeftColor: "#E67E22"}}>
              <div style={{...S.schedHintLabel, color: "#E67E22"}}>🔨 Part of: {j.client} — {j.job}</div>
              <div style={S.schedHintItem}>Total: {fmt(j.totalEarnings)} · Profit: {fmt(j.profit)} · {j.days} days</div>
            </div>
          ) : null;
        })()}
        <div style={S.formWrap}>
          {lastEntry && !form.client && !form.job && (
            <button type="button" onClick={() => setForm({ ...form, client: lastEntry.client || "", job: lastEntry.job || "", description: lastEntry.description || "", hours: lastEntry.hours || "", estimated: lastEntry.estimated || "", actual: lastEntry.actual || "", materials: lastEntry.materials || "", labour: lastEntry.labour || "", miles: lastEntry.miles || "", fuelCost: lastEntry.fuelCost || "" })} style={S.repeatBtn}>
              🔁 Repeat last: {lastEntry.client}{lastEntry.job ? ` — ${lastEntry.job}` : ""}
            </button>
          )}
          <div style={S.fieldGroup}>
            <label style={S.label}>Client / Who For</label>
            <input style={S.input} list="clients" placeholder="e.g. Mr Smith" value={form.client} onChange={e => updateForm("client", e.target.value)} />
            <datalist id="clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div style={S.fieldGroup}><label style={S.label}>Job</label><input style={S.input} list="job-names" placeholder="e.g. Kitchen refit" value={form.job} onChange={e => updateForm("job", e.target.value)} /></div>
          <div style={S.fieldGroup}><label style={S.label}>Description</label><input style={S.input} list="job-descriptions" placeholder="e.g. Ripped out old units" value={form.description} onChange={e => updateForm("description", e.target.value)} /></div>
          <datalist id="job-descriptions">{knownDescriptions.map(d => <option key={d} value={d} />)}</datalist>
          <div style={S.row}><div style={S.half}><label style={S.label}>Hours</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.hours} onChange={e => updateForm("hours", e.target.value)} /></div><div style={S.half} /></div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Estimated £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.estimated} onChange={e => updateForm("estimated", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>Actual £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.actual} onChange={e => updateForm("actual", e.target.value)} /></div>
          </div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Materials £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.materials} onChange={e => updateForm("materials", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>Labour £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.labour} onChange={e => updateForm("labour", e.target.value)} /></div>
          </div>
          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>🚐 Travel</div>
          <div style={S.row}>
            <div style={S.half}><label style={S.label}>Miles</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.miles} onChange={e => updateForm("miles", e.target.value)} /></div>
            <div style={S.half}><label style={S.label}>Fuel Cost / day</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={form.fuelCost} onChange={e => updateForm("fuelCost", e.target.value)} /></div>
          </div>
          <button onClick={doSaveEntry} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>
            {saveFlash ? "✓ Saved!" : entryMode === "range" ? `Save to ${entryDayCount} Day${entryDayCount !== 1 ? "s" : ""}` : "Save Entry"}
          </button>
          {hasData && entryMode === "single" && <button onClick={deleteEntry} style={S.deleteBtn}>Delete Entry</button>}
        </div>
      </div>
    );
  }

  // ═══ ADD EXPENSE ═══
  if (view === "addExpense") {
    return (
      <div style={S.app}>
        <div style={S.entryHeader}>
          <button onClick={() => { setView("overheads"); setEditingExp(null); }} style={S.backBtn}>← Back</button>
          <div style={S.entryDateNum}>{editingExp !== null ? "Edit" : "Add"} Expense</div>
        </div>
        <div style={S.formWrap}>
          <div style={S.fieldGroup}><label style={S.label}>Category</label><select style={S.input} value={expForm.category} onChange={e => updateExpForm("category", e.target.value)}>{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div style={S.fieldGroup}><label style={S.label}>Description</label><input style={S.input} placeholder="e.g. DeWalt drill set" value={expForm.description} onChange={e => updateExpForm("description", e.target.value)} /></div>
          <div style={S.toggleRow}><button onClick={() => updateExpForm("isRecurring", false)} style={expForm.isRecurring ? S.toggleBtn : S.toggleBtnActive}>One-off</button><button onClick={() => updateExpForm("isRecurring", true)} style={expForm.isRecurring ? S.toggleBtnActive : S.toggleBtn}>Monthly recurring</button></div>
          {expForm.isRecurring ? (
            <div style={S.fieldGroup}><label style={S.label}>Monthly Amount £</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={expForm.recurringMonthly} onChange={e => updateExpForm("recurringMonthly", e.target.value)} /></div>
          ) : (
            <>
              <div style={S.row}><div style={S.half}><label style={S.label}>Amount £ (total)</label><input style={S.input} type="number" inputMode="decimal" placeholder="0" value={expForm.amount} onChange={e => updateExpForm("amount", e.target.value)} /></div><div style={S.half}><label style={S.label}>Date</label><input style={S.input} type="date" value={expForm.date} onChange={e => updateExpForm("date", e.target.value)} /></div></div>
              <button type="button" onClick={() => updateExpForm("spreadOverYear", !expForm.spreadOverYear)} style={S.weekendToggle}>
                <div style={{ ...S.weekendBox, ...(expForm.spreadOverYear ? S.weekendBoxChecked : {}) }}>{expForm.spreadOverYear && "✓"}</div>
                <span>Split evenly across the year (÷12 in each month)</span>
              </button>
              {expForm.spreadOverYear && (Number(expForm.amount) > 0) && (
                <div style={{ fontSize: 12, color: "#888", marginTop: -4, marginBottom: 8, paddingLeft: 4 }}>
                  ≈ {fmt(Math.round((Number(expForm.amount) || 0) / 12))}/month in Money and dashboard charts
                </div>
              )}
            </>
          )}
          <button onClick={doSaveExpense} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Saved!" : "Save Expense"}</button>
        </div>
      </div>
    );
  }

  // ═══ OVERHEADS ═══
  if (view === "overheads") {
    const trm = recurring.reduce((t,r) => t+(Number(r.amount)||0), 0);
    const too = expenses.reduce((t,e) => t+(Number(e.amount)||0), 0);
    return (
      <div style={S.app}>
        <div style={S.dashHeader}><div style={S.dashIcon}>💰</div><div style={S.dashTitle}>Money</div></div>
        <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
          <button onClick={() => setView("clients")} style={S.toggleBtn}>Clients</button>
          <button onClick={() => setView("overheads")} style={S.toggleBtnActive}>Business Costs</button>
        </div>
        <div style={S.overheadSummary}>
          <div style={S.ohCard}><div style={S.ohLabel}>Monthly Recurring</div><div style={S.ohVal}>{fmt(trm)}<span style={S.ohPer}>/mo</span></div></div>
          <div style={S.ohCard}><div style={S.ohLabel}>One-off This Year</div><div style={S.ohVal}>{fmt(too)}</div></div>
          <div style={{...S.ohCard,...S.ohCardWide}}><div style={S.ohLabel}>Total Yearly Overheads</div><div style={{...S.ohValBig, color:"#E74C3C"}}>{fmt(trm*12+too)}</div><div style={S.ohSubtext}>That's {fmt(Math.round((trm*12+too)/12))}/month to cover</div></div>
        </div>
        <div style={S.sectionTitle}>Monthly Recurring</div>
        {recurring.length === 0 && <div style={S.emptyText}>No recurring expenses yet</div>}
        {recurring.map((r, i) => (
          <div key={r.id||i} style={S.expRow}><div style={S.expIcon}>{CAT_ICONS[r.category]||"📦"}</div><div style={S.expInfo}><div style={S.expName}>{r.description||r.category}</div><div style={S.expCat}>{r.category}</div></div><div style={S.expAmount}>{fmt(r.amount)}<span style={S.expPer}>/mo</span></div><button onClick={() => deleteExpense("recurring", i)} style={S.expDel}>✕</button></div>
        ))}
        <div style={S.sectionTitle}>One-off Expenses</div>
        {expenses.length === 0 && <div style={S.emptyText}>No one-off expenses yet</div>}
        {[...expenses].sort((a,b) => (b.date||"").localeCompare(a.date||"")).map((e, i) => (
          <div key={e.id||i} style={S.expRow}><div style={S.expIcon}>{CAT_ICONS[e.category]||"📦"}</div><div style={S.expInfo}><div style={S.expName}>{e.description||e.category}</div><div style={S.expCat}>{e.date ? new Date(e.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : ""} · {e.category}{e.spreadOverYear ? " · ÷12 yr" : ""}</div></div><div style={S.expAmount}>{fmt(e.amount)}{e.spreadOverYear ? <span style={S.expPer}>/yr</span> : ""}</div><button onClick={() => toggleExpenseSpread(e)} style={S.expSplitBtn}>{e.spreadOverYear ? "Lump" : "÷12"}</button><button onClick={() => deleteExpense("oneoff", e)} style={S.expDel}>✕</button></div>
        ))}
        <button onClick={() => { setExpForm({ category: EXPENSE_CATEGORIES[0], description:"", amount:"", date: dateKey(new Date()), isRecurring: false, recurringMonthly:"", spreadOverYear: false }); setEditingExp(null); setView("addExpense"); }} style={S.addExpBtn}>+ Add Expense</button>
        <Nav {...navProps} />
      </div>
    );
  }

  // ═══ CLIENTS ═══
  if (view === "clients") {
    const filteredClients = clientSearch.trim() ? clientStats.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())) : clientStats;
    const maxE = Math.max(...filteredClients.map(c => c.earned), 1);
    return (
      <div style={S.app}>
        <div style={S.dashHeader}><div style={S.dashIcon}>💰</div><div style={S.dashTitle}>Money</div></div>
        <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
          <button onClick={() => setView("clients")} style={S.toggleBtnActive}>Clients</button>
          <button onClick={() => setView("overheads")} style={S.toggleBtn}>Business Costs</button>
        </div>
        {clientStats.length > 0 && (
          <div style={{ padding: "0 20px 8px" }}>
            <input style={S.searchInput} placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
          </div>
        )}
        {clientStats.length === 0 && <div style={S.emptyWrap}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={S.emptyText}>No client data yet</div><div style={{...S.emptyText,fontSize:12,marginTop:4}}>Add a client name to your daily entries</div></div>}
        {filteredClients.length === 0 && clientStats.length > 0 && <div style={S.emptyText}>No clients match "{clientSearch}"</div>}
        {filteredClients.map((c, i) => (
          <div key={c.name} style={S.clientCard}>
            <div style={S.clientHeader}><div style={S.clientRank}>#{i+1}</div><div style={S.clientName}>{c.name}</div><div style={{...S.clientProfit, color: c.profit>=0?"#27AE60":"#E74C3C"}}>{fmt(c.profit)}</div></div>
            <div style={S.clientBar}><div style={{...S.clientBarFill, width:`${(c.earned/maxE)*100}%`}} /></div>
            <div style={S.clientDetails}>
              <div style={S.clientStat}><span style={S.clientStatLbl}>Earned</span>{fmt(c.earned)}</div>
              <div style={S.clientStat}><span style={S.clientStatLbl}>Costs</span>{fmt(c.materials+c.labour+c.fuel)}</div>
              <div style={S.clientStat}><span style={S.clientStatLbl}>£/Hr</span>{fmt(Math.round(c.perHour))}</div>
              <div style={S.clientStat}><span style={S.clientStatLbl}>Days</span>{c.jobs}</div>
            </div>
          </div>
        ))}
        <Nav {...navProps} />
      </div>
    );
  }

  // ═══ SETTINGS ═══
  if (view === "settings") {
    return (
      <div style={S.app}>
        <div style={S.dashHeader}><div style={S.dashIcon}>⚙️</div><div style={S.dashTitle}>Settings</div></div>

        <div style={S.formWrap}>
          <div style={S.fieldGroup}>
            <label style={S.label}>Currency</label>
            <select style={S.input} value={settings.currency} onChange={(e) => updateSetting("currency", e.target.value)}>
              {Object.entries(CURRENCIES).map(([code, cfg]) => <option key={code} value={code}>{cfg.label}</option>)}
            </select>
            <div style={S.settingsHelp}>Preview: {fmt(1234)}</div>
          </div>

          <div style={S.divider} />
          <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>Data Tools</div>
          <button onClick={exportAllData} style={S.saveBtn}>Export Backup (JSON)</button>
          <button type="button" onClick={() => importRef.current?.click()} style={{ ...S.saveBtn, marginTop: 8, background: "rgba(52,152,219,0.15)", borderColor: "#3498DB", color: "#3498DB" }}>Import Backup</button>
          <input ref={importRef} type="file" accept="application/json" onChange={importAllData} style={{ display: "none" }} />
          <button type="button" onClick={() => setConfirmAction({ label: "Reset all data? This cannot be undone.", action: resetAllData })} style={{ ...S.deleteBtn, marginTop: 10 }}>Reset All Data</button>
          <div style={S.settingsHelp}>Tip: export a backup before major changes.</div>
        </div>
        <Nav {...navProps} />
      </div>
    );
  }

  // ═══ MONTH VIEW ═══
  if (view === "month") {
    const mi = selectedMonth; const ms = monthStats[mi];
    const weeks = getWeeksInMonth(mi);
    const weekKeys = Object.keys(weeks).sort((a,b) => a-b);
    const bestWeek = weekKeys.reduce((best,wk) => (weeks[wk].profit||0)>(weeks[best]?.profit||0)?wk:best, weekKeys[0]);
    return (
      <div style={S.app} onTouchStart={onTouchStart} onTouchEnd={makeSwipeEnd(() => setSelectedMonth(Math.max(0,mi-1)), () => setSelectedMonth(Math.min(11,mi+1)))}>
        <div style={S.dashHeader}>
          <div style={S.dashIcon}>📆</div>
          <div style={S.dashTitle}>Calendar</div>
        </div>
        <div style={{ ...S.toggleRow, margin: "0 20px 8px" }}>
          <button onClick={() => setView("schedule")} style={S.toggleBtn}>Schedule</button>
          <button onClick={() => setView("month")} style={S.toggleBtnActive}>Month Earnings</button>
        </div>
        <div style={S.monthNav}>
          <button onClick={() => setSelectedMonth(Math.max(0,mi-1))} style={S.navArrow}>◀</button>
          <div style={S.monthTitle}>{MONTHS[mi]} {YEAR}</div>
          <button onClick={() => setSelectedMonth(Math.min(11,mi+1))} style={S.navArrow}>▶</button>
        </div>
        <div style={S.miniDash}>
          <div style={S.miniRow}><div style={S.miniCard}><div style={S.miniLabel}>Profit</div><div style={{...S.miniVal,color:ms.profit>=0?"#27AE60":"#E74C3C"}}>{fmt(ms.profit)}</div></div><div style={S.miniCard}><div style={S.miniLabel}>Earned</div><div style={{...S.miniVal,color:"#E67E22"}}>{fmt(ms.act)}</div></div></div>
          <div style={S.miniRow}><div style={S.miniCard}><div style={S.miniLabel}>Estimated</div><div style={S.miniVal}>{fmt(ms.est)}</div></div><div style={S.miniCard}><div style={S.miniLabel}>Hours</div><div style={S.miniVal}>{fmtNum(ms.hrs, 1)}</div></div></div>
          <div style={S.miniRow}><div style={S.miniCard}><div style={S.miniLabel}>Travel Miles</div><div style={S.miniVal}>{fmtNum(ms.miles)}</div></div><div style={S.miniCard}><div style={S.miniLabel}>Overheads</div><div style={{...S.miniVal,color:"#E74C3C",fontSize:16}}>{fmt(monthOverheads[mi])}</div></div></div>
          {ms.act!==ms.est && ms.est>0 && <div style={S.estVsActual}>{ms.act>=ms.est?"▲":"▼"} {Math.abs(((ms.act-ms.est)/ms.est)*100).toFixed(0)}% {ms.act>=ms.est?"above":"below"} estimate</div>}
        </div>
        <div style={S.weeksList}>
          {weekKeys.map(wk => (
            <div key={wk} style={S.weekBlock}>
              <div style={S.weekHeader}>
                <span style={S.weekLabel}>Week {wk}</span>
                <div style={S.weekTotals}>
                  {weeks[wk].actual > 0 && <div style={S.weekEarned}>{fmt(weeks[wk].profit)} earned</div>}
                  {weeks[wk].estimated > 0 && <div style={S.weekEstimated}>{fmt(weeks[wk].estimated)} est</div>}
                  {weeks[wk].actual === 0 && weeks[wk].estimated === 0 && <div style={S.weekDash}>—</div>}
                  {wk===bestWeek&&weeks[wk].actual>0&&<span style={S.bestBadge}>Best</span>}
                </div>
              </div>
              <div style={S.dayGrid}>
                {weeks[wk].days.map(({date,key,entry,dayOfWeek}) => {
                  const isW = dayOfWeek===0||dayOfWeek===6;
                  const hasActual = entry && Number(entry.actual) > 0;
                  const hasEstimated = entry && Number(entry.estimated) > 0;
                  const hasEntry = entry && (hasActual || hasEstimated || entry.client);
                  const today = dateKey(new Date())===key;
                  const schedItems = schedule[key] || [];
                  const hasSched = schedItems.length > 0;
                  const schedForecast = schedItems.reduce((t, it) => t + (Number(it.expectedEarnings)||0), 0);
                  const dayCosts = entry ? (Number(entry.materials)||0) + (Number(entry.labour)||0) + (Number(entry.fuelCost)||0) : 0;
                  const dayProfit = hasActual ? (Number(entry.actual)||0) - dayCosts : 0;
                  return (
                    <button key={key} onClick={() => openDay(key)} style={{...S.dayCell,...(isW?S.dayCellWknd:{}),...(hasActual?S.dayCellFilled:{}),...(!hasActual && (hasEstimated || hasSched)?S.dayCellEstimated:{}),...(today?S.dayCellToday:{})}}>
                      <div style={S.dayName}>{DAYS[dayOfWeek===0?6:dayOfWeek-1]}</div>
                      <div style={S.dayNum}>{date.getDate()}</div>
                      {hasActual && <div style={S.dayAmt}>{fmt(entry.actual)}</div>}
                      {hasActual && dayCosts > 0 && <div style={{fontSize:7,color:dayProfit>=0?"#27AE60":"#E74C3C",fontWeight:700}}>{fmt(dayProfit)}</div>}
                      {hasEstimated && !hasActual && <div style={S.dayAmtEst}>{fmt(entry.estimated)}</div>}
                      {!hasEntry && hasSched && schedForecast > 0 && <div style={S.dayAmtEst}>{fmt(schedForecast)}</div>}
                      {hasEntry && entry.client && <div style={S.dayClient}>{entry.client.slice(0,8)}</div>}
                      {!hasEntry && hasSched && <div style={S.dayClient}>{schedItems[0].client?.slice(0,8) || "📆"}</div>}
                      {!hasEntry && !hasSched && !isW && <div style={S.dayPlus}>+</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <Nav {...navProps} />
      </div>
    );
  }

  // ═══ DASHBOARD ═══
  return (
    <div style={S.app}>
      <div style={S.dashHeader}><div style={S.dashIcon}>🏗️</div><div style={S.dashTitle}>Builder Tracker</div><div style={S.dashYear}>{YEAR} · claude v2</div></div>
      <div style={S.summaryGrid}>
        <div style={{...S.sumCard,...S.sumCardWide,background:yearStats.trueProfit>=0?"rgba(39,174,96,0.1)":"rgba(231,76,60,0.1)",border:`1px solid ${yearStats.trueProfit>=0?"rgba(39,174,96,0.3)":"rgba(231,76,60,0.3)"}`}}><div style={S.sumLabel}>True Profit</div><div style={{...S.sumBig,color:yearStats.trueProfit>=0?"#27AE60":"#E74C3C"}}>{fmt(yearStats.trueProfit)}</div><div style={S.sumSub}>after all costs & overheads</div></div>
        <div style={S.sumCard}><div style={S.sumLabel}>Earned</div><div style={{...S.sumMed,color:"#E67E22"}}>{fmt(yearStats.act)}</div></div>
        <div style={S.sumCard}><div style={S.sumLabel}>Job Costs</div><div style={{...S.sumMed,color:"#E74C3C"}}>{fmt(yearStats.mat+yearStats.lab+yearStats.fuel)}</div></div>
        <div style={S.sumCard}><div style={S.sumLabel}>Monthly Overheads</div><div style={{...S.sumMed,color:"#E74C3C"}}>{fmt(yearStats.monthlyOverheads)}<span style={{fontSize:11,color:"#888"}}>/mo</span></div></div>
        <div style={S.sumCard}><div style={S.sumLabel}>One-off Expenses</div><div style={{...S.sumMed,color:"#E74C3C"}}>{fmt(yearStats.oneOffs)}</div></div>
        <div style={S.sumCard}><div style={S.sumLabel}>Avg £/Hr</div><div style={S.sumMed}>{fmt(Math.round(yearStats.avgHourly))}</div></div>
        <div style={S.sumCard}><div style={S.sumLabel}>Days Worked</div><div style={S.sumMed}>{yearStats.days}</div></div>
      </div>
      <div style={S.sectionTitle}>Monthly Profit (after overheads)</div>
      <div style={S.barChart}>
        {MONTHS.map((m, i) => {
          const monthTrueProfit = monthStats[i].profit - monthOverheads[i];
          const maxP = Math.max(...MONTHS.map((_,mi) => Math.abs(monthStats[mi].profit - monthOverheads[mi])), 1);
          const pct = maxP>0?(Math.abs(monthTrueProfit)/maxP)*100:0;
          const isNeg = monthTrueProfit < 0;
          return (
            <button key={m} onClick={() => { setSelectedMonth(i); setView("month"); }} style={S.barRow}>
              <div style={S.barLabel}>{m}</div>
              <div style={S.barTrack}><div style={{...S.barFill,width:`${pct}%`, background: isNeg ? "#E74C3C" : "#27AE60"}} /></div>
              <div style={{...S.barAmt, color: isNeg ? "#E74C3C" : (monthStats[i].act>0 ? "#27AE60" : "#666")}}>{monthStats[i].act>0||monthOverheads[i]>0?fmt(monthTrueProfit):"—"}</div>
            </button>
          );
        })}
      </div>
      <div style={S.legendRow}><div style={S.legendItem}><div style={{...S.legendDot,background:"#27AE60"}} />Profit</div><div style={S.legendItem}><div style={{...S.legendDot,background:"#E74C3C"}} />Loss</div></div>
      {clientStats.length > 0 && (
        <>
          <button onClick={() => setView("clients")} style={S.sectionTitleBtn}><span>Top Clients</span><span style={{color:"#E67E22"}}>View all →</span></button>
          {clientStats.slice(0,3).map(c => <div key={c.name} style={S.clientMini}><div style={S.clientMiniName}>{c.name}</div><div style={{...S.clientMiniProfit,color:c.profit>=0?"#27AE60":"#E74C3C"}}>{fmt(c.profit)}</div></div>)}
        </>
      )}
      <div style={{height:40}} />
      <Nav {...navProps} />
    </div>
  );
}

function Nav({ view, setView, openDay, onQuickAdd, quickActionsOpen, setQuickActionsOpen, undoItem, onUndo, toast, onDismissToast, confirmAction, onConfirm, onDismissConfirm }) {
  return (
    <>
      {quickActionsOpen && <button type="button" onClick={() => setQuickActionsOpen(false)} style={S.quickOverlay} aria-label="Close quick actions" />}
      {quickActionsOpen && (
        <div style={S.quickMenu}>
          <button type="button" onClick={() => onQuickAdd("entry")} style={S.quickItem}>➕ Add today's entry</button>
          <button type="button" onClick={() => onQuickAdd("newActiveJob")} style={S.quickItem}>🔨 Start a job</button>
          <button type="button" onClick={() => onQuickAdd("jobExpense")} style={S.quickItem}>🧱 Add job expense</button>
          <button type="button" onClick={() => onQuickAdd("jobLabour")} style={S.quickItem}>👷 Add job labour</button>
          <div style={{height:1, background:"#2A2D35", margin:"4px 0"}} />
          <button type="button" onClick={() => onQuickAdd("book")} style={{...S.quickItem, color:"#888"}}>📋 Book a job (calendar)</button>
          <button type="button" onClick={() => onQuickAdd("expense")} style={{...S.quickItem, color:"#888"}}>💳 Add business expense</button>
          <button type="button" onClick={() => onQuickAdd("job")} style={{...S.quickItem, color:"#888"}}>✓ Log completed job</button>
        </div>
      )}
      {undoItem && (
        <div style={S.undoBar}>
          <span style={S.undoTxt}>{undoItem.label}</span>
          <button type="button" onClick={onUndo} style={S.undoBtn}>Undo</button>
        </div>
      )}
      {toast && (
        <div style={{...S.toastBar, ...(toast.type === "error" ? S.toastBarError : {})}}>
          <span>{toast.msg}</span>
          <button type="button" onClick={onDismissToast} style={S.toastClose}>×</button>
        </div>
      )}
      {confirmAction && (
        <>
          <button type="button" onClick={onDismissConfirm} style={S.confirmOverlay} aria-label="Cancel" />
          <div style={S.confirmBox}>
            <div style={S.confirmMsg}>{confirmAction.label}</div>
            <div style={S.confirmBtns}>
              <button type="button" onClick={onDismissConfirm} style={S.confirmCancel}>Cancel</button>
              <button type="button" onClick={onConfirm} style={S.confirmOk}>Confirm</button>
            </div>
          </div>
        </>
      )}
      <div style={S.bottomNav}>
        <button onClick={() => setView("dashboard")} style={{...S.navBtn,...(view==="dashboard"?S.navActive:{})}}><span style={S.navIcon}>📊</span><span style={S.navTxt}>Home</span></button>
        <button onClick={() => setView("schedule")} style={{...S.navBtn,...(view==="schedule"||view==="month"?S.navActive:{})}}><span style={S.navIcon}>📆</span><span style={S.navTxt}>Calendar</span></button>
        <button onClick={() => setQuickActionsOpen(!quickActionsOpen)} style={S.navAdd}><span style={{fontSize:28,lineHeight:1}}>{quickActionsOpen ? "×" : "+"}</span></button>
        <button onClick={() => setView("jobs")} style={{...S.navBtn,...(view==="jobs"?S.navActive:{})}}><span style={S.navIcon}>🔨</span><span style={S.navTxt}>Jobs</span></button>
        <button onClick={() => setView("clients")} style={{...S.navBtn,...(view==="clients"||view==="overheads"?S.navActive:{})}}><span style={S.navIcon}>💰</span><span style={S.navTxt}>Money</span></button>
        <button onClick={() => setView("settings")} style={{...S.navBtn,...(view==="settings"?S.navActive:{})}}><span style={S.navIcon}>⚙️</span><span style={S.navTxt}>Settings</span></button>
      </div>
    </>
  );
}

const S = {
  app: { fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: "#1A1D23", color: "#F0F0F0", minHeight: "100vh", paddingBottom: 90, maxWidth: 480, margin: "0 auto" },
  loadWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1A1D23" },
  loadIcon: { fontSize: 48, marginBottom: 16 }, loadText: { fontSize: 14, color: "#666" },
  dashHeader: { padding: "24px 20px 8px", display: "flex", alignItems: "center", gap: 12 },
  dashIcon: { fontSize: 28 }, dashTitle: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" },
  dashYear: { fontSize: 13, color: "#E67E22", fontWeight: 700, background: "rgba(230,126,34,0.15)", padding: "4px 10px", borderRadius: 8, marginLeft: "auto" },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 20px" },
  sumCard: { background: "#22252C", borderRadius: 12, padding: "12px 14px" },
  sumCardWide: { gridColumn: "1 / -1", textAlign: "center" },
  sumLabel: { fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, fontWeight: 600 },
  sumBig: { fontSize: 28, fontWeight: 800, color: "#E67E22", letterSpacing: "-1px" },
  sumMed: { fontSize: 20, fontWeight: 700 }, sumSub: { fontSize: 11, color: "#555", marginTop: 1 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#666", padding: "14px 20px 6px", textTransform: "uppercase", letterSpacing: 1 },
  sectionTitleBtn: { display: "flex", justifyContent: "space-between", width: "100%", padding: "14px 20px 6px", background: "none", border: "none", color: "#666", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, cursor: "pointer", fontFamily: "inherit" },
  barChart: { padding: "0 20px" },
  barRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", border: "none", background: "none", color: "#F0F0F0", width: "100%", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  barLabel: { width: 30, fontSize: 11, color: "#888", fontWeight: 600, flexShrink: 0 },
  barTrack: { flex: 1, height: 18, background: "#2A2D35", borderRadius: 5, position: "relative", overflow: "hidden" },
  barFill: { position: "absolute", top: 0, left: 0, height: "100%", background: "#E67E22", borderRadius: 5, transition: "width 0.5s", zIndex: 2 },
  barEstFill: { position: "absolute", top: 0, left: 0, height: "100%", background: "#F5CBA7", borderRadius: 5, opacity: 0.35, zIndex: 1 },
  barAmt: { width: 52, fontSize: 11, color: "#AAA", fontWeight: 600, textAlign: "right", flexShrink: 0 },
  legendRow: { display: "flex", gap: 16, padding: "8px 20px", justifyContent: "center" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#888" },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  clientMini: { display: "flex", justifyContent: "space-between", padding: "8px 20px", borderBottom: "1px solid #2A2D35" },
  clientMiniName: { fontSize: 14, fontWeight: 600 }, clientMiniProfit: { fontSize: 14, fontWeight: 700 },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 8px" },
  navArrow: { background: "#22252C", border: "none", color: "#E67E22", fontSize: 16, borderRadius: 10, width: 38, height: 38, cursor: "pointer", fontFamily: "inherit" },
  monthTitle: { fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" },
  miniDash: { padding: "8px 20px 12px" },
  miniRow: { display: "flex", gap: 8, marginBottom: 6 },
  miniCard: { flex: 1, background: "#22252C", borderRadius: 10, padding: "10px 12px" },
  miniLabel: { fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 1 },
  miniVal: { fontSize: 18, fontWeight: 800 },
  estVsActual: { fontSize: 11, color: "#E67E22", fontWeight: 600, textAlign: "center", padding: "2px 0" },
  weeksList: { padding: "0 20px" }, weekBlock: { marginBottom: 14 },
  weekHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  weekLabel: { fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8 },
  weekTotal: { fontSize: 12, fontWeight: 700, color: "#E67E22", display: "flex", alignItems: "center", gap: 6 },
  weekTotals: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  weekEarned: { fontSize: 12, fontWeight: 700, color: "#E67E22" },
  weekEstimated: { fontSize: 11, fontWeight: 600, color: "#3498DB" },
  weekDash: { fontSize: 12, color: "#444" },
  bestBadge: { fontSize: 8, background: "#27AE60", color: "#fff", padding: "2px 5px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase" },
  dayGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))", gap: 5 },
  dayCell: { background: "#22252C", borderRadius: 8, padding: "6px 3px", textAlign: "center", border: "2px solid transparent", cursor: "pointer", fontFamily: "inherit", color: "#F0F0F0", display: "flex", flexDirection: "column", alignItems: "center", minHeight: 64 },
  dayCellWknd: { background: "#1E2026", opacity: 0.45 },
  dayCellFilled: { borderColor: "#E67E22", background: "rgba(230,126,34,0.08)" },
  dayCellEstimated: { borderColor: "#3498DB", background: "rgba(52,152,219,0.08)" },
  dayCellToday: { borderColor: "#3498DB", boxShadow: "0 0 0 1px rgba(52,152,219,0.3)" },
  dayName: { fontSize: 8, color: "#555", fontWeight: 600, textTransform: "uppercase" },
  dayNum: { fontSize: 14, fontWeight: 700, margin: "1px 0" },
  dayAmt: { fontSize: 9, color: "#E67E22", fontWeight: 700 },
  dayAmtEst: { fontSize: 9, color: "#3498DB", fontWeight: 700 },
  dayClient: { fontSize: 7, color: "#888", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" },
  dayPlus: { fontSize: 14, color: "#444", fontWeight: 300 },
  entryHeader: { display: "flex", alignItems: "center", gap: 16, padding: "20px 20px 12px" },
  backBtn: { background: "none", border: "none", color: "#E67E22", fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" },
  entryDate: { display: "flex", alignItems: "baseline", gap: 8 },
  entryDay: { fontSize: 13, color: "#888", fontWeight: 600 },
  entryDateNum: { fontSize: 20, fontWeight: 800 },
  formWrap: { padding: "0 20px 20px" },
  fieldGroup: { marginBottom: 12 },
  label: { display: "block", fontSize: 11, color: "#888", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { width: "100%", padding: "11px 12px", borderRadius: 8, border: "2px solid #2A2D35", background: "#22252C", color: "#F0F0F0", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" },
  row: { display: "flex", gap: 8 },
  half: { flex: 1, marginBottom: 12 },
  divider: { height: 1, background: "#2A2D35", margin: "8px 0 12px" },
  saveBtn: { width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#E67E22", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 16, fontFamily: "inherit", transition: "all 0.3s" },
  saveBtnFlash: { background: "#27AE60" },
  deleteBtn: { width: "100%", padding: "12px", borderRadius: 10, border: "2px solid #333", background: "transparent", color: "#E74C3C", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8, fontFamily: "inherit" },
  overheadSummary: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "12px 20px" },
  ohCard: { background: "#22252C", borderRadius: 12, padding: "12px 14px" },
  ohCardWide: { gridColumn: "1 / -1", textAlign: "center" },
  ohLabel: { fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600, marginBottom: 2 },
  ohVal: { fontSize: 20, fontWeight: 800, color: "#F0F0F0" },
  ohValBig: { fontSize: 26, fontWeight: 800 },
  ohPer: { fontSize: 12, color: "#888", fontWeight: 500 },
  ohSubtext: { fontSize: 11, color: "#555", marginTop: 2 },
  emptyWrap: { textAlign: "center", padding: "30px 20px" },
  emptyText: { fontSize: 14, color: "#555", padding: "8px 20px" },
  expRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: "1px solid #2A2D35" },
  expIcon: { fontSize: 20, width: 32, textAlign: "center" },
  expInfo: { flex: 1 }, expName: { fontSize: 14, fontWeight: 600 }, expCat: { fontSize: 11, color: "#666" },
  expAmount: { fontSize: 15, fontWeight: 700, color: "#E74C3C" },
  expPer: { fontSize: 10, color: "#888", fontWeight: 500 },
  expSplitBtn: { background: "rgba(52,152,219,0.12)", border: "1px solid #3498DB", color: "#3498DB", fontSize: 10, fontWeight: 700, borderRadius: 6, cursor: "pointer", padding: "3px 8px", marginRight: 6, fontFamily: "inherit" },
  expDel: { background: "none", border: "none", color: "#555", fontSize: 14, cursor: "pointer", padding: 4 },
  addExpBtn: { display: "block", margin: "16px 20px", padding: "14px", borderRadius: 10, border: "2px dashed #333", background: "transparent", color: "#E67E22", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center", fontFamily: "inherit", width: "calc(100% - 40px)" },
  toggleRow: { display: "flex", gap: 0, marginBottom: 12, borderRadius: 8, overflow: "hidden", border: "2px solid #2A2D35" },
  toggleBtn: { flex: 1, padding: "10px", background: "#22252C", border: "none", color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  toggleBtnActive: { flex: 1, padding: "10px", background: "#E67E22", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  clientCard: { margin: "8px 20px", background: "#22252C", borderRadius: 12, padding: "14px 16px" },
  clientHeader: { display: "flex", alignItems: "center", gap: 8 },
  clientRank: { fontSize: 12, color: "#555", fontWeight: 700, width: 24 },
  clientName: { flex: 1, fontSize: 16, fontWeight: 700 },
  clientProfit: { fontSize: 18, fontWeight: 800 },
  clientBar: { height: 4, background: "#2A2D35", borderRadius: 2, margin: "8px 0", overflow: "hidden" },
  clientBarFill: { height: "100%", background: "#E67E22", borderRadius: 2, transition: "width 0.5s" },
  clientDetails: { display: "flex", gap: 8 },
  clientStat: { flex: 1, fontSize: 12, color: "#999", display: "flex", flexDirection: "column", alignItems: "center" },
  clientStatLbl: { fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  // Schedule
  schedForecast: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", background: "#22252C", margin: "0 20px 12px", borderRadius: 10 },
  schedForecastLabel: { fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase" },
  schedForecastVal: { fontSize: 22, fontWeight: 800, color: "#E67E22" },
  schedDayList: { padding: "0 20px" },
  schedDayCard: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#22252C", borderRadius: 10, marginBottom: 6, border: "2px solid transparent", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "inherit", color: "#F0F0F0" },
  schedDayToday: { borderColor: "#3498DB" },
  schedDayWknd: { opacity: 0.4 },
  schedDayLeft: { width: 44, textAlign: "center", flexShrink: 0 },
  schedDayName: { fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase" },
  schedDayNum: { fontSize: 20, fontWeight: 800 },
  schedDayMonth: { fontSize: 9, color: "#555" },
  schedDayRight: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  schedEmpty: { fontSize: 12, color: "#444" },
  schedJobPill: { background: "rgba(230,126,34,0.1)", borderRadius: 6, padding: "6px 10px", borderLeft: "3px solid #E67E22" },
  schedJobClient: { fontSize: 13, fontWeight: 700 },
  schedJobName: { fontSize: 11, color: "#888" },
  schedDayEarn: { textAlign: "right", flexShrink: 0 },
  schedDayExpected: { fontSize: 14, fontWeight: 700, color: "#E67E22" },
  schedDayActual: { fontSize: 10, color: "#27AE60", fontWeight: 600 },
  schedSlot: { background: "#22252C", borderRadius: 10, padding: "14px", marginBottom: 10, borderLeft: "3px solid #E67E22" },
  schedSlotHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  schedSlotTitle: { fontSize: 14, fontWeight: 700, color: "#E67E22" },
  schedSlotDel: { background: "none", border: "none", color: "#555", fontSize: 16, cursor: "pointer" },
  editBookingBtn: { background: "rgba(52,152,219,0.15)", border: "none", color: "#3498DB", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" },
  bookingInfo: { fontSize: 13, color: "#AAA", marginTop: 2 },
  bookingDates: { fontSize: 11, color: "#666", marginTop: 2 },
  sectionTitle2: { fontSize: 12, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.8, padding: "12px 0 6px" },
  // Jobs
  completeJobBtn: { width: "100%", padding: "14px", borderRadius: 10, border: "2px solid #27AE60", background: "rgba(39,174,96,0.1)", color: "#27AE60", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 8, fontFamily: "inherit" },
  jobCard: { margin: "8px 20px", background: "#22252C", borderRadius: 12, padding: "14px 16px" },
  jobCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  jobCardClient: { fontSize: 16, fontWeight: 700 },
  jobCardJob: { fontSize: 13, color: "#888" },
  jobCardProfit: { fontSize: 20, fontWeight: 800 },
  jobCardDates: { fontSize: 11, color: "#666", margin: "6px 0" },
  jobCardStats: { display: "flex", gap: 6, marginTop: 6 },
  jobCardStat: { flex: 1, fontSize: 11, color: "#999", display: "flex", flexDirection: "column", alignItems: "center", background: "#1A1D23", borderRadius: 6, padding: "6px 4px" },
  jobCardStatLbl: { fontSize: 8, color: "#555", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  jobCardNotes: { fontSize: 12, color: "#888", marginTop: 6, fontStyle: "italic" },
  jobBookedBadge: { fontSize: 10, fontWeight: 800, color: "#3498DB", background: "rgba(52,152,219,0.12)", padding: "4px 10px", borderRadius: 6, marginBottom: 10, letterSpacing: 0.4, display: "inline-block" },
  jobBookedActions: { display: "flex", gap: 8, marginTop: 12 },
  jobRemoveBtn: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  calJobsHint: { fontSize: 11, color: "#666", margin: "-4px 20px 12px", textAlign: "center", lineHeight: 1.4 },
  addSlotBtn: { width: "100%", padding: "12px", borderRadius: 8, border: "2px dashed #333", background: "transparent", color: "#3498DB", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 },
  schedHint: { background: "rgba(52,152,219,0.1)", margin: "0 20px 12px", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid #3498DB" },
  schedHintLabel: { fontSize: 11, fontWeight: 700, color: "#3498DB", marginBottom: 4 },
  schedHintItem: { fontSize: 13, color: "#AAA" },
  // Range booking
  bookRangeBtn: { display: "block", margin: "0 20px 12px", padding: "12px 16px", borderRadius: 10, border: "2px solid #E67E22", background: "rgba(230,126,34,0.08)", color: "#E67E22", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center", fontFamily: "inherit", width: "calc(100% - 40px)" },
  weekendToggles: { display: "flex", flexDirection: "column", gap: 0 },
  weekendToggle: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", background: "none", border: "none", color: "#F0F0F0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  weekendBox: { width: 24, height: 24, borderRadius: 6, border: "2px solid #444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#E67E22", flexShrink: 0 },
  weekendBoxChecked: { background: "rgba(230,126,34,0.15)", borderColor: "#E67E22" },
  rangePreview: { background: "#22252C", borderRadius: 10, padding: "12px 14px", marginTop: 8 },
  rangePreviewRow: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
  rangePreviewLabel: { fontSize: 13, color: "#888" },
  rangePreviewVal: { fontSize: 13, color: "#F0F0F0", fontWeight: 600 },
  settingsHelp: { fontSize: 12, color: "#888", marginTop: 6 },
  calHeader: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 },
  calHeaderDay: { fontSize: 10, color: "#555", fontWeight: 700, textAlign: "center", padding: 4 },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 },
  calCell: { aspectRatio: "1", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 44 },
  calCellBtn: { background: "#22252C", border: "2px solid transparent", cursor: "pointer", fontFamily: "inherit", color: "#F0F0F0", padding: 2 },
  calCellToday: { borderColor: "#3498DB" },
  calCellFilled: { borderColor: "#E67E22", background: "rgba(230,126,34,0.08)" },
  calCellNum: { fontSize: 13, fontWeight: 700 },
  calCellDot: { width: 6, height: 6, borderRadius: 3, background: "#E67E22", marginTop: 2, fontSize: 0 },
  calCellClient: { fontSize: 7, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" },
  quickOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", border: "none", zIndex: 120 },
  quickMenu: { position: "fixed", left: "50%", bottom: 84, transform: "translateX(-50%)", width: "calc(100% - 40px)", maxWidth: 440, background: "#22252C", border: "1px solid #2A2D35", borderRadius: 14, padding: 10, zIndex: 130, boxShadow: "0 8px 30px rgba(0,0,0,0.35)" },
  quickItem: { width: "100%", textAlign: "left", padding: "12px 12px", background: "transparent", border: "none", color: "#F0F0F0", fontSize: 14, fontWeight: 600, borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  undoBar: { position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 86, width: "calc(100% - 40px)", maxWidth: 440, background: "#0F1116", border: "1px solid #2A2D35", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 125, boxShadow: "0 8px 26px rgba(0,0,0,0.35)" },
  undoTxt: { fontSize: 13, color: "#B9BDC7", fontWeight: 600 },
  undoBtn: { background: "rgba(230,126,34,0.15)", border: "1px solid #E67E22", color: "#E67E22", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-evenly", alignItems: "center", background: "#16181D", borderTop: "1px solid #2A2D35", padding: "6px 0 18px", zIndex: 100, maxWidth: 480, margin: "0 auto" },
  navBtn: { background: "none", border: "none", color: "#555", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer", padding: "4px 6px", fontFamily: "inherit" },
  navActive: { color: "#E67E22" },
  navIcon: { fontSize: 18 }, navTxt: { fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  navAdd: { width: 48, height: 48, borderRadius: 24, background: "#E67E22", border: "none", color: "#fff", fontSize: 26, cursor: "pointer", marginTop: -18, boxShadow: "0 4px 16px rgba(230,126,34,0.4)", display: "flex", alignItems: "center", justifyContent: "center" },
  toastBar: { position: "fixed", left: "50%", transform: "translateX(-50%)", top: 20, width: "calc(100% - 40px)", maxWidth: 440, background: "#27AE60", color: "#fff", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 14, fontWeight: 600 },
  toastBarError: { background: "#E74C3C" },
  toastClose: { background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: "0 0 0 12px", lineHeight: 1, fontFamily: "inherit" },
  confirmOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", border: "none", zIndex: 150 },
  confirmBox: { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "calc(100% - 48px)", maxWidth: 360, background: "#22252C", border: "1px solid #2A2D35", borderRadius: 14, padding: "24px 20px", zIndex: 155, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" },
  confirmMsg: { fontSize: 15, fontWeight: 600, color: "#F0F0F0", marginBottom: 20, lineHeight: 1.5 },
  confirmBtns: { display: "flex", gap: 10 },
  confirmCancel: { flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#888", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  confirmOk: { flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#E74C3C", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  searchInput: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "2px solid #2A2D35", background: "#22252C", color: "#F0F0F0", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" },
  repeatBtn: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "2px solid #3498DB", background: "rgba(52,152,219,0.08)", color: "#3498DB", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14, fontFamily: "inherit", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
};
