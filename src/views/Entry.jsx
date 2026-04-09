import S from "../styles.js";
import { MONTHS, DAYS } from "../constants.js";
import { dateKey } from "../utils.js";

export default function Entry({ editingDate, setEditingDate, entries, schedule, entryMode, setEntryMode, entryRange, setEntryRange, updateEntryRange, form, setForm, updateForm, lastEntry, knownClients, knownDescriptions, jobs, fmt, setView, doSaveEntry, deleteEntry, saveFlash }) {
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
