import S from "../styles.js";
import { MONTHS, DAYS, YEAR } from "../constants.js";
import { dateKey, fmtNum } from "../utils.js";

export default function Month({ selectedMonth, setSelectedMonth, monthStats, monthOverheads, getWeeksInMonth, onTouchStart, makeSwipeEnd, setView, schedule, openDay, fmt, navProps, Nav }) {
  const mi = selectedMonth; const ms = monthStats[mi];
  const weeks = getWeeksInMonth(mi);
  const weekKeys = Object.keys(weeks).sort((a,b) => a-b);
  const bestWeek = weekKeys.reduce((best,wk) => (weeks[wk].profit||0)>(weeks[best]?.profit||0)?wk:best, weekKeys[0]);
  return (
    <div style={S.app} onTouchStart={onTouchStart} onTouchEnd={makeSwipeEnd(() => setSelectedMonth(Math.max(0,mi-1)), () => setSelectedMonth(Math.min(11,mi+1)))}>
      <div style={S.dashHeader}>
        <div style={S.dashIcon}>📆</div>
        <div style={S.dashTitle}>Calendar</div>
      </div>
      <div style={{ ...S.toggleRow, margin: "0 20px 8px" }}>
        <button onClick={() => setView("schedule")} style={S.toggleBtn}>Schedule</button>
        <button onClick={() => setView("month")} style={S.toggleBtnActive}>Month Earnings</button>
      </div>
      <div style={S.monthNav}>
        <button onClick={() => setSelectedMonth(Math.max(0,mi-1))} style={S.navArrow}>◀</button>
        <div style={S.monthTitle}>{MONTHS[mi]} {YEAR}</div>
        <button onClick={() => setSelectedMonth(Math.min(11,mi+1))} style={S.navArrow}>▶</button>
      </div>
      <div style={S.miniDash}>
        <div style={S.miniRow}><div style={S.miniCard}><div style={S.miniLabel}>Profit</div><div style={{...S.miniVal,color:ms.profit>=0?"#27AE60":"#E74C3C"}}>{fmt(ms.profit)}</div></div><div style={S.miniCard}><div style={S.miniLabel}>Earned</div><div style={{...S.miniVal,color:"#E67E22"}}>{fmt(ms.act)}</div></div></div>
        <div style={S.miniRow}><div style={S.miniCard}><div style={S.miniLabel}>Estimated</div><div style={S.miniVal}>{fmt(ms.est)}</div></div><div style={S.miniCard}><div style={S.miniLabel}>Hours</div><div style={S.miniVal}>{fmtNum(ms.hrs, 1)}</div></div></div>
        <div style={S.miniRow}><div style={S.miniCard}><div style={S.miniLabel}>Travel Miles</div><div style={S.miniVal}>{fmtNum(ms.miles)}</div></div><div style={S.miniCard}><div style={S.miniLabel}>Overheads</div><div style={{...S.miniVal,color:"#E74C3C",fontSize:16}}>{fmt(monthOverheads[mi])}</div></div></div>
        {ms.act!==ms.est && ms.est>0 && <div style={S.estVsActual}>{ms.act>=ms.est?"▲":"▼"} {Math.abs(((ms.act-ms.est)/ms.est)*100).toFixed(0)}% {ms.act>=ms.est?"above":"below"} estimate</div>}
      </div>
      <div style={S.weeksList}>
        {weekKeys.map(wk => (
          <div key={wk} style={S.weekBlock}>
            <div style={S.weekHeader}>
              <span style={S.weekLabel}>Week {wk}</span>
              <div style={S.weekTotals}>
                {weeks[wk].actual > 0 && <div style={S.weekEarned}>{fmt(weeks[wk].profit)} earned</div>}
                {weeks[wk].estimated > 0 && <div style={S.weekEstimated}>{fmt(weeks[wk].estimated)} est</div>}
                {weeks[wk].actual === 0 && weeks[wk].estimated === 0 && <div style={S.weekDash}>—</div>}
                {wk===bestWeek&&weeks[wk].actual>0&&<span style={S.bestBadge}>Best</span>}
              </div>
            </div>
            <div style={S.dayGrid}>
              {weeks[wk].days.map(({date,key,entry,dayOfWeek}) => {
                const isW = dayOfWeek===0||dayOfWeek===6;
                const hasActual = entry && Number(entry.actual) > 0;
                const hasEstimated = entry && Number(entry.estimated) > 0;
                const hasEntry = entry && (hasActual || hasEstimated || entry.client);
                const today = dateKey(new Date())===key;
                const schedItems = schedule[key] || [];
                const hasSched = schedItems.length > 0;
                const schedForecast = schedItems.reduce((t, it) => t + (Number(it.expectedEarnings)||0), 0);
                const dayCosts = entry ? (Number(entry.materials)||0) + (Number(entry.labour)||0) + (Number(entry.fuelCost)||0) : 0;
                const dayProfit = hasActual ? (Number(entry.actual)||0) - dayCosts : 0;
                return (
                  <button key={key} onClick={() => openDay(key)} style={{...S.dayCell,...(isW?S.dayCellWknd:{}),...(hasActual?S.dayCellFilled:{}),...(!hasActual && (hasEstimated || hasSched)?S.dayCellEstimated:{}),...(today?S.dayCellToday:{})}}>
                    <div style={S.dayName}>{DAYS[dayOfWeek===0?6:dayOfWeek-1]}</div>
                    <div style={S.dayNum}>{date.getDate()}</div>
                    {hasActual && <div style={S.dayAmt}>{fmt(entry.actual)}</div>}
                    {hasActual && dayCosts > 0 && <div style={{fontSize:7,color:dayProfit>=0?"#27AE60":"#E74C3C",fontWeight:700}}>{fmt(dayProfit)}</div>}
                    {hasEstimated && !hasActual && <div style={S.dayAmtEst}>{fmt(entry.estimated)}</div>}
                    {!hasEntry && hasSched && schedForecast > 0 && <div style={S.dayAmtEst}>{fmt(schedForecast)}</div>}
                    {hasEntry && entry.client && <div style={S.dayClient}>{entry.client.slice(0,8)}</div>}
                    {!hasEntry && hasSched && <div style={S.dayClient}>{schedItems[0].client?.slice(0,8) || "📆"}</div>}
                    {!hasEntry && !hasSched && !isW && <div style={S.dayPlus}>+</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Nav {...navProps} />
    </div>
  );
}
