import S from "../styles.js";
import { EXPENSE_CATEGORIES, CAT_ICONS } from "../constants.js";
import { dateKey } from "../utils.js";

export default function Overheads({ recurring, expenses, fmt, deleteExpense, toggleExpenseSpread, setExpForm, setEditingExp, setView, navProps, Nav }) {
  const trm = recurring.reduce((t, r) => t + (Number(r.amount) || 0), 0);
  const too = expenses.reduce((t, e) => t + (Number(e.amount) || 0), 0);
  return (
    <div style={S.app}>
      <div style={S.dashHeader}><div style={S.dashIcon}>💰</div><div style={S.dashTitle}>Money</div></div>
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
