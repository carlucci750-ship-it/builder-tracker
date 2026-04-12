import S from "../styles.js";
import { EXPENSE_CATEGORIES } from "../constants.js";

export default function AddExpense({ editingExp, setEditingExp, setView, expForm, updateExpForm, fmt, doSaveExpense, saveFlash }) {
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
