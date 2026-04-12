import S from "../styles.js";
import { MONTHS, DAYS, YEAR } from "../constants.js";
import { dateKey, getWeekNumber } from "../utils.js";

export default function Schedule({ schedWeekStart, setSchedWeekStart, schedView, setSchedView, schedMonth, setSchedMonth, getWeekDays, schedule, entries, weekForecast, openSchedDay, setRangeForm, setView, onTouchStart, makeSwipeEnd, fmt, navProps, Nav }) {
  const weekDays = getWeekDays(schedWeekStart);
  const todayStr = dateKey(new Date());

  return (
    <div style={S.app}>
      <div style={S.dashHeader}>
        <div style={S.dashIcon}>📆</div>
        <div style={S.dashTitle}>Calendar</div>
      </div>

      {/* Schedule / Month toggle */}
      <div style={{ ...S.toggleRow, margin: "0 20px 8px" }}>
        <button onClick={() => setView("schedule")} style={S.toggleBtnActive}>Schedule</button>
        <button onClick={() => setView("month")} style={S.toggleBtn}>Month Earnings</button>
      </div>

      {/* Book a job button */}
      <button onClick={() => { setRangeForm({ client:"", job:"", jobPrice:"", expectedEarnings:"", dateFrom: dateKey(new Date()), dateTo: dateKey(new Date()), includeSaturday: false, includeSunday: false }); setView("bookRange"); }} style={S.bookRangeBtn}>📋 Book a Job (date range)</button>
      <div style={S.calJobsHint}>These bookings also show in the <strong style={{ color: "#E67E22" }}>Jobs</strong> tab for forecast vs price.</div>

      {/* Week / Month toggle */}
      <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
        <button onClick={() => setSchedView("week")} style={schedView==="week" ? S.toggleBtnActive : S.toggleBtn}>Week</button>
        <button onClick={() => setSchedView("month")} style={schedView==="month" ? S.toggleBtnActive : S.toggleBtn}>Month</button>
      </div>

      {schedView === "week" ? (
        <>
          {/* Week navigation */}
          <div style={S.monthNav}>
            <button onClick={() => { const d=new Date(schedWeekStart); d.setDate(d.getDate()-7); setSchedWeekStart(d); }} style={S.navArrow}>◀</button>
            <div style={S.monthTitle}>W{getWeekNumber(schedWeekStart)}</div>
            <button onClick={() => { const d=new Date(schedWeekStart); d.setDate(d.getDate()+7); setSchedWeekStart(d); }} style={S.navArrow}>▶</button>
          </div>

          {/* Week forecast */}
          <div style={S.schedForecast}>
            <div style={S.schedForecastLabel}>Week Forecast</div>
            <div style={S.schedForecastVal}>{fmt(weekForecast)}</div>
          </div>

          {/* Day cards */}
          <div style={S.schedDayList}>
            {weekDays.map(d => {
              const dk = dateKey(d);
              const items = schedule[dk] || [];
              const isToday = dk === todayStr;
              const isWknd = d.getDay() === 0 || d.getDay() === 6;
              const dayTotal = items.reduce((t, it) => t + (Number(it.expectedEarnings)||0), 0);
              const hasActual = entries[dk];

              return (
                <button key={dk} onClick={() => openSchedDay(dk)} style={{ ...S.schedDayCard, ...(isToday ? S.schedDayToday : {}), ...(isWknd && !items.length ? S.schedDayWknd : {}) }}>
                  <div style={S.schedDayLeft}>
                    <div style={S.schedDayName}>{DAYS[d.getDay()===0?6:d.getDay()-1]}</div>
                    <div style={S.schedDayNum}>{d.getDate()}</div>
                    <div style={S.schedDayMonth}>{MONTHS[d.getMonth()]}</div>
                  </div>
                  <div style={S.schedDayRight}>
                    {items.length === 0 && <div style={S.schedEmpty}>Tap to schedule</div>}
                    {items.map((it, i) => (
                      <div key={i} style={S.schedJobPill}>
                        <div style={S.schedJobClient}>{it.client || "No client"}</div>
                        <div style={S.schedJobName}>{it.job || ""}</div>
                      </div>
                    ))}
                  </div>
                  <div style={S.schedDayEarn}>
                    {dayTotal > 0 && <div style={S.schedDayExpected}>{fmt(dayTotal)}</div>}
                    {hasActual && Number(hasActual.actual) > 0 && <div style={S.schedDayActual}>✓ {fmt(hasActual.actual)}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div onTouchStart={onTouchStart} onTouchEnd={makeSwipeEnd(() => setSchedMonth(Math.max(0, schedMonth-1)), () => setSchedMonth(Math.min(11, schedMonth+1)))}>
          {/* Month view */}
          <div style={S.monthNav}>
            <button onClick={() => setSchedMonth(Math.max(0, schedMonth-1))} style={S.navArrow}>◀</button>
            <div style={S.monthTitle}>{MONTHS[schedMonth]} {YEAR}</div>
            <button onClick={() => setSchedMonth(Math.min(11, schedMonth+1))} style={S.navArrow}>▶</button>
          </div>

          {/* Month forecast */}
          {(() => {
            const dim = new Date(YEAR, schedMonth+1, 0).getDate();
            let mForecast = 0;
            for (let d=1; d<=dim; d++) {
              const dk = `${YEAR}-${String(schedMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
              (schedule[dk]||[]).forEach(it => mForecast += Number(it.expectedEarnings)||0);
            }
            return (
              <div style={S.schedForecast}>
                <div style={S.schedForecastLabel}>Month Forecast</div>
                <div style={S.schedForecastVal}>{fmt(mForecast)}</div>
              </div>
            );
          })()}

          {/* Calendar grid */}
          <div style={{ padding: "0 20px" }}>
            <div style={S.calHeader}>{DAYS.map(d => <div key={d} style={S.calHeaderDay}>{d}</div>)}</div>
            {(() => {
              const first = new Date(YEAR, schedMonth, 1);
              const dim = new Date(YEAR, schedMonth+1, 0).getDate();
              let startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
              const cells = [];
              for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} style={S.calCell} />);
              for (let d = 1; d <= dim; d++) {
                const dk = `${YEAR}-${String(schedMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                const items = schedule[dk] || [];
                const isToday = dk === todayStr;
                cells.push(
                  <button key={dk} onClick={() => openSchedDay(dk)} style={{ ...S.calCell, ...S.calCellBtn, ...(isToday ? S.calCellToday : {}), ...(items.length > 0 ? S.calCellFilled : {}) }}>
                    <div style={S.calCellNum}>{d}</div>
                    {items.length > 0 && <div style={S.calCellDot}>{items.length > 1 ? items.length : ""}</div>}
                    {items.length > 0 && <div style={S.calCellClient}>{items[0].client?.slice(0,6) || "Job"}</div>}
                  </button>
                );
              }
              return <div style={S.calGrid}>{cells}</div>;
            })()}
          </div>
        </div>
      )}
      <Nav {...navProps} />
    </div>
  );
}
