import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import S from "./styles.js";
import { MONTHS, YEAR, EXPENSE_CATEGORIES, CURRENCIES, defaultSettings } from "./constants.js";
import { getWeekNumber, fmtBase, dateKey, defaultEntry, defaultScheduleItem, getMonday, load, save } from "./utils.js";
import Nav from "./components/Nav.jsx";
import Settings from "./views/Settings.jsx";
import AddExpense from "./views/AddExpense.jsx";
import Overheads from "./views/Overheads.jsx";
import Clients from "./views/Clients.jsx";
import Month from "./views/Month.jsx";
import Entry from "./views/Entry.jsx";
import Schedule from "./views/Schedule.jsx";
import EditSchedule from "./views/EditSchedule.jsx";
import EditBooking from "./views/EditBooking.jsx";
import BookRange from "./views/BookRange.jsx";
import Jobs from "./views/Jobs.jsx";
import ActiveJobDetail from "./views/ActiveJobDetail.jsx";
import CreateActiveJob from "./views/CreateActiveJob.jsx";
import EditJob from "./views/EditJob.jsx";
import LogJob from "./views/LogJob.jsx";
import Dashboard from "./views/Dashboard.jsx";
import JobExpPicker from "./views/JobExpPicker.jsx";

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
  const [jobExpForm, setJobExpForm] = useState({ date: dateKey(new Date()), amount:"", category:"Materials", note:"" });
  const [jobExpPickerOpen, setJobExpPickerOpen] = useState(false);
  const [jobExpPickerCategory, setJobExpPickerCategory] = useState(null);
  const [completeMode, setCompleteMode] = useState(false);
  const [finalRevInput, setFinalRevInput] = useState("");
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
    };
    const updated = activeJobs.map(j => j.id === jobId ? { ...j, expenses: [...j.expenses, expense] } : j);
    saveActiveJobs(updated);
    const updatedJob = updated.find(j => j.id === jobId);
    if (updatedJob) setViewingActiveJob(updatedJob);
    setJobExpForm({ date: dateKey(new Date()), amount:"", category: jobExpForm.category, note:"" });
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

  // Schedule helpers
  const getWeekDays = (monday) => Array.from({length: 7}, (_, i) => { const d = new Date(monday); d.setDate(d.getDate()+i); return d; });
  const weekForecast = useMemo(() => {
    const days = getWeekDays(schedWeekStart);
    return days.reduce((t, d) => {
      const items = schedule[dateKey(d)] || [];
      return t + items.reduce((s, it) => s + (Number(it.expectedEarnings)||0), 0);
    }, 0);
  }, [schedule, schedWeekStart]);

  const navProps = {
    view, setView, openDay, onQuickAdd: openQuickAction,
    quickActionsOpen, setQuickActionsOpen, undoItem, onUndo: runUndo,
    toast, onDismissToast: () => setToast(null),
    confirmAction, onConfirm: () => { confirmAction?.action(); setConfirmAction(null); }, onDismissConfirm: () => setConfirmAction(null),
  };

  if (!loaded) return <div style={S.loadWrap}><div style={S.loadIcon}>🏗️</div><div style={S.loadText}>Loading...</div></div>;

  // ═══ COMPLETE JOB / LOG JOB ═══
  if (view === "completeJob" || view === "logJob") {
    return <LogJob jobForm={jobForm} setJobForm={setJobForm} defaultJobForm={defaultJobForm} updateJobForm={updateJobForm} completingBooking={completingBooking} setCompletingBooking={setCompletingBooking} knownClients={knownClients} knownJobs={knownJobs} completeJob={completeJob} saveFlash={saveFlash} setView={setView} fmt={fmt} />;
  }

  // ═══ EDIT COMPLETED JOB ═══
  if (view === "editJob" && editingJob) {
    return <EditJob editingJob={editingJob} setEditingJob={setEditingJob} jobEditForm={jobEditForm} updateJobEditForm={updateJobEditForm} knownClients={knownClients} knownJobs={knownJobs} saveJobEdit={saveJobEdit} saveJobs={saveJobs} jobs={jobs} queueUndo={queueUndo} setConfirmAction={setConfirmAction} saveFlash={saveFlash} setView={setView} fmt={fmt} />;
  }

  // ═══ CREATE ACTIVE JOB ═══
  if (view === "createActiveJob") {
    return <CreateActiveJob activeJobForm={activeJobForm} setActiveJobForm={setActiveJobForm} knownClients={knownClients} knownJobs={knownJobs} createActiveJob={createActiveJob} saveFlash={saveFlash} setView={setView} />;
  }

  // ═══ ACTIVE JOB DETAIL ═══
  if (view === "activeJobDetail" && viewingActiveJob) {
    return <ActiveJobDetail viewingActiveJob={viewingActiveJob} activeJobs={activeJobs} setViewingActiveJob={setViewingActiveJob} setJobsSubView={setJobsSubView} setView={setView} jobExpForm={jobExpForm} setJobExpForm={setJobExpForm} addExpenseToJob={addExpenseToJob} removeJobExpense={removeJobExpense} addDayWorked={addDayWorked} removeDayWorked={removeDayWorked} completeMode={completeMode} setCompleteMode={setCompleteMode} finalRevInput={finalRevInput} setFinalRevInput={setFinalRevInput} completeActiveJob={completeActiveJob} deleteActiveJob={deleteActiveJob} setConfirmAction={setConfirmAction} saveFlash={saveFlash} fmt={fmt} />;
  }

  // ═══ ADD EXPENSE TO JOB (picker) ═══
  if (jobExpPickerOpen && activeJobs.length > 0) {
    return <JobExpPicker activeJobs={activeJobs} jobExpPickerCategory={jobExpPickerCategory} setJobExpPickerOpen={setJobExpPickerOpen} setJobExpPickerCategory={setJobExpPickerCategory} setViewingActiveJob={setViewingActiveJob} setJobExpForm={setJobExpForm} setCompleteMode={setCompleteMode} setView={setView} fmt={fmt} />;
  }

  // ═══ JOBS LIST ═══
  if (view === "jobs") {
    return <Jobs jobs={jobs} activeJobs={activeJobs} jobSearch={jobSearch} setJobSearch={setJobSearch} jobsSubView={jobsSubView} setJobsSubView={setJobsSubView} openQuickAction={openQuickAction} setViewingActiveJob={setViewingActiveJob} setJobExpForm={setJobExpForm} setCompleteMode={setCompleteMode} setJobForm={setJobForm} setCompletingBooking={setCompletingBooking} openJobEdit={openJobEdit} defaultJobForm={defaultJobForm} fmt={fmt} setView={setView} navProps={navProps} Nav={Nav} />;
  }

  // ═══ BOOK DATE RANGE ═══
  if (view === "bookRange") {
    return <BookRange rangeForm={rangeForm} updateRangeForm={updateRangeForm} knownClients={knownClients} doSaveScheduleRange={doSaveScheduleRange} saveFlash={saveFlash} setView={setView} fmt={fmt} />;
  }

  // ═══ EDIT BOOKING ═══
  if (view === "editBooking" && editingBooking) {
    return <EditBooking editingBooking={editingBooking} bookingEditForm={bookingEditForm} updateBookingEditForm={updateBookingEditForm} knownClients={knownClients} schedule={schedule} saveSchedule={saveSchedule} deleteBooking={deleteBooking} setEditingBooking={setEditingBooking} setEditingSchedDate={setEditingSchedDate} setSaveFlash={setSaveFlash} saveFlash={saveFlash} setView={setView} setJobForm={setJobForm} setCompletingBooking={setCompletingBooking} fmt={fmt} />;
  }

  // ═══ EDIT SCHEDULE DAY ═══
  if (view === "editSchedule") {
    return <EditSchedule editingSchedDate={editingSchedDate} setEditingSchedDate={setEditingSchedDate} schedule={schedule} saveSchedule={saveSchedule} schedForm={schedForm} updateSchedForm={updateSchedForm} addSchedSlot={addSchedSlot} removeSchedSlot={removeSchedSlot} knownClients={knownClients} setEditingBooking={setEditingBooking} setBookingEditForm={setBookingEditForm} setView={setView} doSaveSchedule={doSaveSchedule} saveFlash={saveFlash} fmt={fmt} />;
  }

  // ═══ SCHEDULE VIEW ═══
  if (view === "schedule") {
    return <Schedule schedWeekStart={schedWeekStart} setSchedWeekStart={setSchedWeekStart} schedView={schedView} setSchedView={setSchedView} schedMonth={schedMonth} setSchedMonth={setSchedMonth} getWeekDays={getWeekDays} schedule={schedule} entries={entries} weekForecast={weekForecast} openSchedDay={openSchedDay} setRangeForm={setRangeForm} setView={setView} onTouchStart={onTouchStart} makeSwipeEnd={makeSwipeEnd} fmt={fmt} navProps={navProps} Nav={Nav} />;
  }

  // ═══ ENTRY VIEW ═══
  if (view === "entry") {
    return <Entry editingDate={editingDate} setEditingDate={setEditingDate} entries={entries} schedule={schedule} entryMode={entryMode} setEntryMode={setEntryMode} entryRange={entryRange} setEntryRange={setEntryRange} updateEntryRange={updateEntryRange} form={form} setForm={setForm} updateForm={updateForm} lastEntry={lastEntry} knownClients={knownClients} knownDescriptions={knownDescriptions} jobs={jobs} fmt={fmt} setView={setView} doSaveEntry={doSaveEntry} deleteEntry={deleteEntry} saveFlash={saveFlash} />;
  }

  // ═══ ADD EXPENSE ═══
  if (view === "addExpense") {
    return <AddExpense editingExp={editingExp} setEditingExp={setEditingExp} setView={setView} expForm={expForm} updateExpForm={updateExpForm} fmt={fmt} doSaveExpense={doSaveExpense} saveFlash={saveFlash} />;
  }

  // ═══ OVERHEADS ═══
  if (view === "overheads") {
    return <Overheads recurring={recurring} expenses={expenses} fmt={fmt} deleteExpense={deleteExpense} toggleExpenseSpread={toggleExpenseSpread} setExpForm={setExpForm} setEditingExp={setEditingExp} setView={setView} navProps={navProps} Nav={Nav} />;
  }

  // ═══ CLIENTS ═══
  if (view === "clients") {
    return <Clients clientStats={clientStats} clientSearch={clientSearch} setClientSearch={setClientSearch} fmt={fmt} setView={setView} navProps={navProps} Nav={Nav} />;
  }

  // ═══ SETTINGS ═══
  if (view === "settings") {
    return <Settings settings={settings} updateSetting={updateSetting} fmt={fmt} exportAllData={exportAllData} importRef={importRef} importAllData={importAllData} setConfirmAction={setConfirmAction} resetAllData={resetAllData} navProps={navProps} />;
  }

  // ═══ MONTH VIEW ═══
  if (view === "month") {
    return <Month selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} monthStats={monthStats} monthOverheads={monthOverheads} getWeeksInMonth={getWeeksInMonth} onTouchStart={onTouchStart} makeSwipeEnd={makeSwipeEnd} setView={setView} schedule={schedule} openDay={openDay} fmt={fmt} navProps={navProps} Nav={Nav} />;
  }

  // ═══ DASHBOARD ═══
  return <Dashboard yearStats={yearStats} monthStats={monthStats} monthOverheads={monthOverheads} clientStats={clientStats} setSelectedMonth={setSelectedMonth} setView={setView} fmt={fmt} navProps={navProps} Nav={Nav} />;
}


