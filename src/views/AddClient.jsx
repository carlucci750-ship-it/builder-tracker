import S from "../styles.js";
import Nav from "../components/Nav.jsx";

export default function AddClient({ newClientName, setNewClientName, clientProfileForm, setClientProfileForm, clientProfiles, saveClientProfiles, showToast, setView, navProps }) {
  const saveNewClient = () => {
    const name = newClientName.trim();
    if (!name) return;
    const updated = { ...clientProfiles, [name]: { ...clientProfileForm } };
    saveClientProfiles(updated);
    setView("clients");
    showToast("Client added.");
  };
  return (
    <div style={S.app}>
      <div style={S.entryHeader}>
        <button onClick={() => setView("clients")} style={S.backBtn}>← Back</button>
        <div style={S.entryTitle}>New Client</div>
      </div>
      <div style={S.formWrap}>
        <div style={S.fieldGroup}>
          <label style={S.label}>Client Name</label>
          <input style={S.input} placeholder="e.g. Mr Smith" value={newClientName} onChange={e => setNewClientName(e.target.value)} autoFocus />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Company Name (optional)</label>
          <input style={S.input} placeholder="e.g. Smith Renovations Ltd" value={clientProfileForm.company} onChange={e => setClientProfileForm(p => ({...p, company: e.target.value}))} />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Address</label>
          <input style={S.input} placeholder="e.g. 45 High Street, Leeds, LS1 1AA" value={clientProfileForm.address} onChange={e => setClientProfileForm(p => ({...p, address: e.target.value}))} />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="client@email.com" value={clientProfileForm.email} onChange={e => setClientProfileForm(p => ({...p, email: e.target.value}))} />
        </div>
        <div style={S.fieldGroup}>
          <label style={S.label}>Phone</label>
          <input style={S.input} placeholder="07700 000000" value={clientProfileForm.phone} onChange={e => setClientProfileForm(p => ({...p, phone: e.target.value}))} />
        </div>
        <button onClick={saveNewClient} style={S.saveBtn}>Add Client</button>
      </div>
      <Nav {...navProps} />
    </div>
  );
}
