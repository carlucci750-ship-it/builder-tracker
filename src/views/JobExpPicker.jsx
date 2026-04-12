import S from "../styles.js";
import { dateKey } from "../utils.js";

export default function JobExpPicker({ activeJobs, jobExpPickerCategory, setJobExpPickerOpen, setJobExpPickerCategory, setViewingActiveJob, setJobExpForm, setCompleteMode, setView, fmt }) {
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
              setJobExpForm({ date: dateKey(new Date()), amount:"", category: jobExpPickerCategory || "Materials", note:"", supplier:"" });
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
