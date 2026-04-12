import S from "../styles.js";

export default function CreateActiveJob({ activeJobForm, setActiveJobForm, knownClients, knownJobs, createActiveJob, saveFlash, setView }) {
  return (
    <div style={S.app}>
      <div style={S.entryHeader}>
        <button onClick={() => setView("jobs")} style={S.backBtn}>← Back</button>
        <div style={S.entryDateNum}>Start a Job</div>
      </div>
      <div style={S.formWrap}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Client</label>
          <input style={S.input} list="aj-clients" placeholder="e.g. Mr Smith" value={activeJobForm.client} onChange={e => setActiveJobForm({...activeJobForm, client: e.target.value})} />
          <datalist id="aj-clients">{knownClients.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Job</label>
          <input style={S.input} list="aj-jobs" placeholder="e.g. Kitchen refit" value={activeJobForm.job} onChange={e => setActiveJobForm({...activeJobForm, job: e.target.value})} />
          <datalist id="aj-jobs">{knownJobs.map(j => <option key={j} value={j} />)}</datalist>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Start Date</label>
          <input style={S.input} type="date" value={activeJobForm.startDate} onChange={e => setActiveJobForm({...activeJobForm, startDate: e.target.value})} />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Quote (optional)</label>
          <input style={S.input} type="number" inputMode="decimal" placeholder="0" value={activeJobForm.expectedRevenue} onChange={e => setActiveJobForm({...activeJobForm, expectedRevenue: e.target.value})} />
        </div>
        <button onClick={createActiveJob} style={{...S.saveBtn, ...(saveFlash ? S.saveBtnFlash : {})}}>{saveFlash ? "✓ Started!" : "Start Job"}</button>
      </div>
    </div>
  );
}
