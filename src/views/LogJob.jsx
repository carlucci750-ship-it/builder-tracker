import S from "../styles.js";

export default function LogJob({ jobForm, setJobForm, defaultJobForm, updateJobForm, completingBooking, setCompletingBooking, knownClients, knownJobs, completeJob, saveFlash, setView, fmt }) {
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
