import S from "../styles.js";
import { dateKey } from "../utils.js";

export default function Jobs({ jobs, activeJobs, jobSearch, setJobSearch, jobsSubView, setJobsSubView, openQuickAction, setViewingActiveJob, setJobExpForm, setCompleteMode, setQuoteEditMode, setJobForm, setCompletingBooking, openJobEdit, defaultJobForm, fmt, setView, navProps, Nav }) {
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
              <button key={aj.id} type="button" onClick={() => { setViewingActiveJob(aj); setJobExpForm({ date: dateKey(new Date()), amount:"", category:"Materials", note:"", supplier:"" }); setCompleteMode(false); setQuoteEditMode(false); setView("activeJobDetail"); }} style={{...S.jobCard, display:"block", textAlign:"left", border:"none", cursor:"pointer", fontFamily:"inherit", color:"#F0F0F0", width:"calc(100% - 40px)", borderLeft:"3px solid #E67E22"}}>
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
