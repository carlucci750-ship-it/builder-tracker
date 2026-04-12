import S from "../styles.js";
import { CURRENCIES, COUNTRIES } from "../constants.js";
import Nav from "../components/Nav.jsx";

export default function Settings({ settings, updateSetting, fmt, taxYearLabel, exportAllData, importRef, importAllData, setConfirmAction, resetAllData, navProps }) {
  return (
    <div style={S.app}>
      <div style={S.dashHeader}><div style={S.dashIcon}>⚙️</div><div style={S.dashTitle}>Settings</div></div>

      <div style={S.formWrap}>
        <div style={{ fontSize: 13, color: "#E67E22", fontWeight: 700, marginBottom: 10 }}>Your Business</div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Business / Trading Name</label>
          <input style={S.input} placeholder="e.g. Smith Builders Ltd" value={settings.businessName||""} onChange={e => updateSetting("businessName", e.target.value)} />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Address</label>
          <input style={S.input} placeholder="e.g. 12 Oak Road, Manchester, M1 1AA" value={settings.businessAddress||""} onChange={e => updateSetting("businessAddress", e.target.value)} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{...S.fieldGroup, flex:1}}>
            <label style={S.label}>Phone</label>
            <input style={S.input} placeholder="07700 000000" value={settings.businessPhone||""} onChange={e => updateSetting("businessPhone", e.target.value)} />
          </div>
          <div style={{...S.fieldGroup, flex:1}}>
            <label style={S.label}>Email</label>
            <input style={S.input} placeholder="you@email.com" value={settings.businessEmail||""} onChange={e => updateSetting("businessEmail", e.target.value)} />
          </div>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>VAT Number (optional)</label>
          <input style={S.input} placeholder="GB 123 4567 89" value={settings.vatNumber||""} onChange={e => updateSetting("vatNumber", e.target.value)} />
        </div>

        <div style={S.divider} />
        <div style={{ fontSize: 13, color: "#E67E22", fontWeight: 700, marginBottom: 10 }}>Bank / Payment Details</div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Bank Name</label>
          <input style={S.input} placeholder="e.g. Barclays" value={settings.bankName||""} onChange={e => updateSetting("bankName", e.target.value)} />
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{...S.fieldGroup, flex:1}}>
            <label style={S.label}>Account Number</label>
            <input style={S.input} placeholder="12345678" value={settings.bankAccount||""} onChange={e => updateSetting("bankAccount", e.target.value)} />
          </div>
          <div style={{...S.fieldGroup, flex:1}}>
            <label style={S.label}>Sort Code</label>
            <input style={S.input} placeholder="00-00-00" value={settings.bankSortCode||""} onChange={e => updateSetting("bankSortCode", e.target.value)} />
          </div>
        </div>
        <div style={S.settingsHelp}>These details appear on invoices you generate.</div>

        <div style={S.divider} />
        <div style={{ fontSize: 13, color: "#E67E22", fontWeight: 700, marginBottom: 10 }}>Country & Currency</div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Country</label>
          <select style={S.input} value={settings.country||"GB"} onChange={e => updateSetting("country", e.target.value)}>
            {Object.entries(COUNTRIES).map(([code, cfg]) => <option key={code} value={code}>{cfg.label}</option>)}
          </select>
          <div style={S.settingsHelp}>Sets your currency and tax year automatically.</div>
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Currency (override)</label>
          <select style={S.input} value={settings.currency} onChange={e => updateSetting("currency", e.target.value)}>
            {Object.entries(CURRENCIES).map(([code, cfg]) => <option key={code} value={code}>{cfg.label}</option>)}
          </select>
          <div style={S.settingsHelp}>Tax year: {taxYearLabel} · Preview: {fmt(1234)}</div>
        </div>

        <div style={S.divider} />
        <div style={{ fontSize: 13, color: "#3498DB", fontWeight: 700, marginBottom: 8 }}>Data Tools</div>
        <button onClick={exportAllData} style={S.saveBtn}>Export Backup (JSON)</button>
        <button type="button" onClick={() => importRef.current?.click()} style={{ ...S.saveBtn, marginTop: 8, background: "rgba(52,152,219,0.15)", borderColor: "#3498DB", color: "#3498DB" }}>Import Backup</button>
        <input ref={importRef} type="file" accept="application/json" onChange={importAllData} style={{ display: "none" }} />
        <button type="button" onClick={() => setConfirmAction({ label: "Reset all data? This cannot be undone.", action: resetAllData })} style={{ ...S.deleteBtn, marginTop: 10 }}>Reset All Data</button>
        <div style={S.settingsHelp}>Tip: export a backup before major changes.</div>
      </div>
      <Nav {...navProps} />
    </div>
  );
}
