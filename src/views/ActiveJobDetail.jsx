import S from "../styles.js";
import { dateKey } from "../utils.js";
import { JOB_EXPENSE_CATS, JOB_CAT_ICONS } from "../constants.js";

export default function ActiveJobDetail({ viewingActiveJob, activeJobs, setViewingActiveJob, setJobsSubView, setView, jobExpForm, setJobExpForm, addExpenseToJob, removeJobExpense, addDayWorked, removeDayWorked, completeMode, setCompleteMode, finalRevInput, setFinalRevInput, completeActiveJob, deleteActiveJob, setConfirmAction, saveFlash, fmt, knownSuppliers, quoteEditMode, setQuoteEditMode, quoteEditVal, setQuoteEditVal, saveActiveJobs }) {
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
          {!quoteEditMode ? (
            <div style={{...S.rangePreviewRow, cursor:"pointer"}} onClick={() => { setQuoteEditVal(String(aj.expectedRevenue || "")); setQuoteEditMode(true); }}>
              <span style={S.rangePreviewLabel}>Quote</span>
              <span style={{...S.rangePreviewVal, color: expectedRev > 0 ? "#E67E22" : "#666"}}>{expectedRev > 0 ? fmt(expectedRev) : "Tap to set"}</span>
            </div>
          ) : (
            <div style={{...S.rangePreviewRow, gap:8, alignItems:"center"}}>
              <span style={S.rangePreviewLabel}>Quote</span>
              <input autoFocus style={{...S.input, flex:1, margin:0, padding:"6px 10px", fontSize:14}} type="number" inputMode="decimal" placeholder="0" value={quoteEditVal} onChange={e => setQuoteEditVal(e.target.value)} />
              <button type="button" onClick={() => setQuoteEditMode(false)} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:18,padding:"0 4px"}}>✕</button>
              <button type="button" onClick={() => { const v = Number(quoteEditVal) || 0; const updated = activeJobs.map(j => j.id === aj.id ? {...j, expectedRevenue: v} : j); saveActiveJobs(updated); setViewingActiveJob(updated.find(j => j.id === aj.id)); setQuoteEditMode(false); }} style={{background:"#27AE60",border:"none",color:"#fff",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:13,fontWeight:600}}>Save</button>
            </div>
          )}
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
        <div style={S.fieldGroup}><label style={S.label}>Note (optional)</label><input style={S.input} placeholder="e.g. screws and sealant" value={jobExpForm.note} onChange={e => setJobExpForm({...jobExpForm, note: e.target.value})} /></div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Supplier (optional)</label>
          <input style={S.input} list="known-suppliers-list" placeholder="e.g. Screwfix, Travis Perkins" value={jobExpForm.supplier} onChange={e => setJobExpForm({...jobExpForm, supplier: e.target.value})} />
          <datalist id="known-suppliers-list">
            {(knownSuppliers || []).map(s => <option key={s} value={s} />)}
          </datalist>
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
              <div style={S.expName}>{exp.note || exp.category}</div>
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
