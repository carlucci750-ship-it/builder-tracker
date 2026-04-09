import S from "../styles.js";
import { CURRENCIES } from "../constants.js";
import Nav from "../components/Nav.jsx";

export default function Settings({ settings, updateSetting, fmt, exportAllData, importRef, importAllData, setConfirmAction, resetAllData, navProps }) {
  return (
    <div style={S.app}>
      <div style={S.dashHeader}><div style={S.dashIcon}>⚙️</div><div style={S.dashTitle}>Settings</div></div>

      <div style={S.formWrap}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Currency</label>
          <select style={S.input} value={settings.currency} onChange={(e) => updateSetting("currency", e.target.value)}>
            {Object.entries(CURRENCIES).map(([code, cfg]) => <option key={code} value={code}>{cfg.label}</option>)}
          </select>
          <div style={S.settingsHelp}>Preview: {fmt(1234)}</div>
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
