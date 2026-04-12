import S from "../styles.js";
import { MONTHS, DAYS } from "../constants.js";

export default function EditSchedule({ editingSchedDate, setEditingSchedDate, schedule, saveSchedule, schedForm, updateSchedForm, addSchedSlot, removeSchedSlot, knownClients, setEditingBooking, setBookingEditForm, setView, doSaveSchedule, saveFlash, fmt }) {
  const d = editingSchedDate ? new Date(editingSchedDate + "T12:00:00") : new Date();
  const dayItems = schedule[editingSchedDate] || [];
  // Find unique bookings on this day
  const bookings = dayItems.filter(it => it.bookingId);
  // Unique booking IDs
  const uniqueBookings = [];
  const seenBids = new Set();
  bookings.forEach(b => { if (!seenBids.has(b.bookingId)) { seenBids.add(b.bookingId); uniqueBookings.push(b); } });

  return (
    <div style={S.app}>
      <div style={S.entryHeader}>
        <button onClick={() => { setView("schedule"); setEditingSchedDate(null); }} style={S.backBtn}>← Back</button>
        <div style={S.entryDate}>
          <div style={S.entryDay}>{DAYS[d.getDay()===0?6:d.getDay()-1]}</div>
          <div style={S.entryDateNum}>{d.getDate()} {MONTHS[d.getMonth()]}</div>
        </div>
      </div>
      <div style={S.formWrap}>
        {/* Show linked bookings with edit button */}
        {uniqueBookings.map(bk => (
          <div key={bk.bookingId} style={S.schedSlot}>
            <div style={S.schedSlotHeader}>
              <div style={S.schedSlotTitle}>{bk.client || "Job"}</div>
              <button onClick={() => {
                setEditingBooking(bk);
                // Figure out if booking includes sat/sun by checking existing days
                let hasSat = false, hasSun = false;
                Object.entries(schedule).forEach(([dk, items]) => {
                  if (items.some(it => it.bookingId === bk.bookingId)) {
                    const dParts = dk.split("-").map(Number);
                    const dow = new Date(dParts[0], dParts[1]-1, dParts[2]).getDay();
                    if (dow === 6) hasSat = true;
                    if (dow === 0) hasSun = true;
                  }
                });
                setBookingEditForm({ client: bk.client||"", job: bk.job||"", jobPrice: bk.jobPrice||"", expectedEarnings: bk.expectedEarnings||"", dateFrom: bk.dateFrom||"", dateTo: bk.dateTo||"", includeSaturday: hasSat, includeSunday: hasSun });
                setView("editBooking");
              }} style={S.editBookingBtn}>Edit booking</button>
            </div>
            <div style={S.bookingInfo}>{bk.job}{bk.expectedEarnings ? ` · ${fmt(bk.expectedEarnings)}/day` : ""}</div>
            {bk.dateFrom && <div style={S.bookingDates}>{bk.dateFrom} → {bk.dateTo}</div>}
          </div>
        ))}

        {/* Editable single-day items */}
        <div style={S.sectionTitle2}>Day schedule</div>
        {schedForm.map((slot, idx) => (
          <div key={idx} style={S.schedSlot}>
            <div style={S.schedSlotHeader}>
              <div style={S.schedSlotTitle}>Job {idx + 1}</div>
              {schedForm.length > 1 && <button onClick={() => removeSchedSlot(idx)} style={S.schedSlotDel}>✕</button>}
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Client</label>
              <input style={S.input} list="sched-clients" placeholder="e.g. Mr Smith" value={slot.client} onChange={e => updateSchedForm(idx, "client", e.target.value)} />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Job</label>
              <input style={S.input} list="job-names" placeholder="e.g. Kitchen refit" value={slot.job} onChange={e => updateSchedForm(idx, "job", e.target.value)} />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Expected Earnings £</label>
              <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={slot.expectedEarnings} onChange={e => updateSchedForm(idx, "expectedEarnings", e.target.value)} />
            </div>
          </div>
        ))}
        <datalist id="sched-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
        <button onClick={addSchedSlot} style={S.addSlotBtn}>+ Add another job</button>
        <button onClick={doSaveSchedule} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Saved!" : "Save Schedule"}</button>
        {schedule[editingSchedDate] && <button onClick={() => { const ns={...schedule}; delete ns[editingSchedDate]; saveSchedule(ns); setEditingSchedDate(null); setView("schedule"); }} style={S.deleteBtn}>Clear Day</button>}
      </div>
    </div>
  );
}
