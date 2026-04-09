import S from "../styles.js";

export default function BookRange({ rangeForm, updateRangeForm, knownClients, doSaveScheduleRange, saveFlash, setView, fmt }) {
  const start = new Date(rangeForm.dateFrom + "T12:00:00");
  const end = new Date(rangeForm.dateTo + "T12:00:00");
  let dayCount = 0, satCount = 0, sunCount = 0, weekdayCount = 0;
  if (end >= start) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow === 6) { if (rangeForm.includeSaturday) { dayCount++; satCount++; } }
      else if (dow === 0) { if (rangeForm.includeSunday) { dayCount++; sunCount++; } }
      else { dayCount++; weekdayCount++; }
    }
  }
  const totalExpected = dayCount * (Number(rangeForm.expectedEarnings) || 0);
  const jobPrice = Number(rangeForm.jobPrice) || 0;

  // Day label
  let dayLabel = `${weekdayCount} weekday${weekdayCount !== 1 ? "s" : ""}`;
  if (satCount > 0) dayLabel += ` + ${satCount} Sat`;
  if (sunCount > 0) dayLabel += ` + ${sunCount} Sun`;

  return (
    <div style={S.app}>
      <div style={S.entryHeader}>
        <button onClick={() => setView("schedule")} style={S.backBtn}>← Back</button>
        <div style={S.entryDateNum}>Book a Job</div>
      </div>
      <div style={S.formWrap}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Client</label>
          <input style={S.input} list="range-clients" placeholder="e.g. Mr Smith" value={rangeForm.client} onChange={e => updateRangeForm("client", e.target.value)} />
          <datalist id="range-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Job</label>
          <input style={S.input} list="job-names" placeholder="e.g. Kitchen refit" value={rangeForm.job} onChange={e => updateRangeForm("job", e.target.value)} />
        </div>
        <div style={S.row}>
          <div style={S.half}>
            <label style={S.label}>Job Price £ (total)</label>
            <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={rangeForm.jobPrice} onChange={e => updateRangeForm("jobPrice", e.target.value)} />
          </div>
          <div style={S.half}>
            <label style={S.label}>Expected £ / day</label>
            <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={rangeForm.expectedEarnings} onChange={e => updateRangeForm("expectedEarnings", e.target.value)} />
          </div>
        </div>

        <div style={S.divider} />
        <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>📅 Dates</div>
        <div style={S.row}>
          <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={rangeForm.dateFrom} onChange={e => updateRangeForm("dateFrom", e.target.value)} /></div>
          <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={rangeForm.dateTo} onChange={e => updateRangeForm("dateTo", e.target.value)} /></div>
        </div>

        {/* Separate Saturday / Sunday toggles */}
        <div style={S.weekendToggles}>
          <button onClick={() => updateRangeForm("includeSaturday", !rangeForm.includeSaturday)} style={S.weekendToggle}>
            <div style={{ ...S.weekendBox, ...(rangeForm.includeSaturday ? S.weekendBoxChecked : {}) }}>
              {rangeForm.includeSaturday && "✓"}
            </div>
            <span>Include Saturday</span>
          </button>
          <button onClick={() => updateRangeForm("includeSunday", !rangeForm.includeSunday)} style={S.weekendToggle}>
            <div style={{ ...S.weekendBox, ...(rangeForm.includeSunday ? S.weekendBoxChecked : {}) }}>
              {rangeForm.includeSunday && "✓"}
            </div>
            <span>Include Sunday</span>
          </button>
        </div>

        {/* Preview */}
        {dayCount > 0 && (
          <div style={S.rangePreview}>
            <div style={S.rangePreviewRow}>
              <span style={S.rangePreviewLabel}>Days</span>
              <span style={S.rangePreviewVal}>{dayLabel}</span>
            </div>
            {jobPrice > 0 && (
              <div style={S.rangePreviewRow}>
                <span style={S.rangePreviewLabel}>Job price</span>
                <span style={{ ...S.rangePreviewVal, color: "#F0F0F0", fontWeight: 700 }}>{fmt(jobPrice)}</span>
              </div>
            )}
            {totalExpected > 0 && (
              <div style={S.rangePreviewRow}>
                <span style={S.rangePreviewLabel}>Daily forecast × {dayCount}</span>
                <span style={{ ...S.rangePreviewVal, color: "#E67E22", fontWeight: 800 }}>{fmt(totalExpected)}</span>
              </div>
            )}
            {jobPrice > 0 && totalExpected > 0 && totalExpected !== jobPrice && (
              <div style={S.rangePreviewRow}>
                <span style={{ ...S.rangePreviewLabel, color: totalExpected > jobPrice ? "#27AE60" : "#E74C3C" }}>
                  {totalExpected > jobPrice ? "▲ Over job price by" : "▼ Under job price by"}
                </span>
                <span style={{ ...S.rangePreviewVal, color: totalExpected > jobPrice ? "#27AE60" : "#E74C3C" }}>{fmt(Math.abs(totalExpected - jobPrice))}</span>
              </div>
            )}
          </div>
        )}

        <button onClick={doSaveScheduleRange} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Booked!" : `Book ${dayCount} Day${dayCount !== 1 ? "s" : ""}`}</button>
      </div>
    </div>
  );
}
