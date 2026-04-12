import S from "../styles.js";

export default function EditBooking({ editingBooking, bookingEditForm, updateBookingEditForm, knownClients, schedule, saveSchedule, deleteBooking, setEditingBooking, setEditingSchedDate, setSaveFlash, saveFlash, setView, setJobForm, setCompletingBooking, fmt }) {
  const bf = bookingEditForm;
  // Calculate new day count based on edited dates
  const bfStartParts = (bf.dateFrom||"").split("-").map(Number);
  const bfEndParts = (bf.dateTo||"").split("-").map(Number);
  let newDayCount = 0, newWeekdays = 0, newSats = 0, newSuns = 0;
  if (bfStartParts.length === 3 && bfEndParts.length === 3) {
    const bfStart = new Date(bfStartParts[0], bfStartParts[1]-1, bfStartParts[2]);
    const bfEnd = new Date(bfEndParts[0], bfEndParts[1]-1, bfEndParts[2]);
    for (let t = bfStart.getTime(); t <= bfEnd.getTime(); t += 86400000) {
      const dow = new Date(t).getDay();
      if (dow === 6) { if (bf.includeSaturday) { newDayCount++; newSats++; } }
      else if (dow === 0) { if (bf.includeSunday) { newDayCount++; newSuns++; } }
      else { newDayCount++; newWeekdays++; }
    }
  }
  const newTotal = newDayCount * (Number(bf.expectedEarnings) || 0);
  const newJobPrice = Number(bf.jobPrice) || 0;

  let newDayLabel = `${newWeekdays} weekday${newWeekdays !== 1 ? "s" : ""}`;
  if (newSats > 0) newDayLabel += ` + ${newSats} Sat`;
  if (newSuns > 0) newDayLabel += ` + ${newSuns} Sun`;

  const doUpdateBooking = () => {
    // Delete old booking
    deleteBooking(editingBooking.bookingId);
    // Create new booking with updated details
    const ns = { ...schedule };
    // Remove old first (deleteBooking already did via state, but ns is from current)
    Object.keys(ns).forEach(dk => {
      ns[dk] = (ns[dk] || []).filter(it => it.bookingId !== editingBooking.bookingId);
      if (ns[dk].length === 0) delete ns[dk];
    });
    const newBid = "bk_" + Date.now();
    const item = { client: bf.client.trim(), job: bf.job.trim(), jobPrice: bf.jobPrice || "", expectedEarnings: bf.expectedEarnings || "", bookingId: newBid, dateFrom: bf.dateFrom, dateTo: bf.dateTo };
    if (bfStartParts.length === 3 && bfEndParts.length === 3) {
      const bfStart = new Date(bfStartParts[0], bfStartParts[1]-1, bfStartParts[2]);
      const bfEnd = new Date(bfEndParts[0], bfEndParts[1]-1, bfEndParts[2]);
      for (let t = bfStart.getTime(); t <= bfEnd.getTime(); t += 86400000) {
        const dd = new Date(t);
        const dow = dd.getDay();
        if (dow === 6 && !bf.includeSaturday) continue;
        if (dow === 0 && !bf.includeSunday) continue;
        const dk = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
        if (!ns[dk]) ns[dk] = [];
        ns[dk] = [...ns[dk], { ...item }];
      }
    }
    saveSchedule(ns);
    setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200);
    setEditingBooking(null); setView("schedule");
  };

  return (
    <div style={S.app}>
      <div style={S.entryHeader}>
        <button onClick={() => { setView("editSchedule"); setEditingBooking(null); }} style={S.backBtn}>← Back</button>
        <div style={S.entryDateNum}>Edit Booking</div>
      </div>
      <div style={S.formWrap}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Client</label>
          <input style={S.input} list="bk-clients" value={bf.client} onChange={e => updateBookingEditForm("client", e.target.value)} />
          <datalist id="bk-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Job</label>
          <input style={S.input} list="job-names" value={bf.job} onChange={e => updateBookingEditForm("job", e.target.value)} />
        </div>
        <div style={S.row}>
          <div style={S.half}><label style={S.label}>Job Price £ (total)</label><input style={S.input} type="number" inputMode="decimal" value={bf.jobPrice} onChange={e => updateBookingEditForm("jobPrice", e.target.value)} /></div>
          <div style={S.half}><label style={S.label}>Expected £ / day</label><input style={S.input} type="number" inputMode="decimal" value={bf.expectedEarnings} onChange={e => updateBookingEditForm("expectedEarnings", e.target.value)} /></div>
        </div>

        <div style={S.divider} />
        <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>📅 Dates</div>
        <div style={S.row}>
          <div style={S.half}><label style={S.label}>From</label><input style={S.input} type="date" value={bf.dateFrom} onChange={e => updateBookingEditForm("dateFrom", e.target.value)} /></div>
          <div style={S.half}><label style={S.label}>To</label><input style={S.input} type="date" value={bf.dateTo} onChange={e => updateBookingEditForm("dateTo", e.target.value)} /></div>
        </div>
        <div style={S.weekendToggles}>
          <button onClick={() => updateBookingEditForm("includeSaturday", !bf.includeSaturday)} style={S.weekendToggle}>
            <div style={{ ...S.weekendBox, ...(bf.includeSaturday ? S.weekendBoxChecked : {}) }}>{bf.includeSaturday && "✓"}</div>
            <span>Include Saturday</span>
          </button>
          <button onClick={() => updateBookingEditForm("includeSunday", !bf.includeSunday)} style={S.weekendToggle}>
            <div style={{ ...S.weekendBox, ...(bf.includeSunday ? S.weekendBoxChecked : {}) }}>{bf.includeSunday && "✓"}</div>
            <span>Include Sunday</span>
          </button>
        </div>

        {newDayCount > 0 && (
          <div style={S.rangePreview}>
            <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Days</span><span style={S.rangePreviewVal}>{newDayLabel}</span></div>
            {newJobPrice > 0 && <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Job price</span><span style={S.rangePreviewVal}>{fmt(newJobPrice)}</span></div>}
            {newTotal > 0 && <div style={S.rangePreviewRow}><span style={S.rangePreviewLabel}>Daily forecast × {newDayCount}</span><span style={{ ...S.rangePreviewVal, color: "#E67E22", fontWeight: 800 }}>{fmt(newTotal)}</span></div>}
            {newJobPrice > 0 && newTotal > 0 && newTotal !== newJobPrice && (
              <div style={S.rangePreviewRow}>
                <span style={{ ...S.rangePreviewLabel, color: newTotal > newJobPrice ? "#27AE60" : "#E74C3C" }}>{newTotal > newJobPrice ? "▲ Over by" : "▼ Under by"}</span>
                <span style={{ ...S.rangePreviewVal, color: newTotal > newJobPrice ? "#27AE60" : "#E74C3C" }}>{fmt(Math.abs(newTotal - newJobPrice))}</span>
              </div>
            )}
          </div>
        )}

        <button onClick={doUpdateBooking} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Updated!" : `Update Booking (${newDayCount} days)`}</button>
        <button onClick={() => {
          // Pre-fill job form from booking
          const hasSat = bf.includeSaturday, hasSun = bf.includeSunday;
          setJobForm({ client: bf.client, job: bf.job, dateFrom: bf.dateFrom, dateTo: bf.dateTo, includeSaturday: hasSat, includeSunday: hasSun, totalEarnings: bf.jobPrice||"", materials:"", labour:"", fuel:"", notes:"" });
          setCompletingBooking(editingBooking);
          setEditingBooking(null); setView("completeJob");
        }} style={S.completeJobBtn}>✓ Complete Job</button>
        <button onClick={() => {
          deleteBooking(editingBooking.bookingId);
          setEditingBooking(null); setEditingSchedDate(null); setView("schedule");
        }} style={S.deleteBtn}>Delete Entire Booking</button>
      </div>
    </div>
  );
}
