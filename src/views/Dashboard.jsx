import S from "../styles.js";
import { YEAR, MONTHS } from "../constants.js";

export default function Dashboard({ yearStats, monthStats, monthOverheads, clientStats, setSelectedMonth, setView, fmt, navProps, Nav }) {
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
