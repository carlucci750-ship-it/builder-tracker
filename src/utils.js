export const getWeekNumber = (d) => { const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); const ys = new Date(Date.UTC(date.getUTCFullYear(), 0, 1)); return Math.ceil(((date - ys) / 86400000 + 1) / 7); };
export const fmtBase = (v, symbol = "£", locale = "en-GB") => { if (!v && v !== 0) return `${symbol}0`; return symbol + Number(v).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
export const fmtNum = (v, decimals = 0) => { if (!v && v !== 0) return "0"; return Number(v).toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); };
export const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const defaultEntry = () => ({ client:"", job:"", description:"", hours:"", estimated:"", actual:"", materials:"", labour:"", miles:"", fuelCost:"" });
export const defaultScheduleItem = () => ({ client:"", job:"", expectedEarnings:"" });
export const getMonday = (d) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.getFullYear(), date.getMonth(), diff); };

export const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
export const load = async (key, fb) => { try { if (!window.storage) return fb; const r = await withTimeout(window.storage.get(key), 2000); return r ? JSON.parse(r.value) : fb; } catch { return fb; } };
export const save = async (key, val) => { try { if (window.storage) await window.storage.set(key, JSON.stringify(val)); } catch {} };
