import S from "../styles.js";

export default function Clients({ clientStats, clientSearch, setClientSearch, fmt, setView, navProps, Nav }) {
  const filteredClients = clientSearch.trim() ? clientStats.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())) : clientStats;
  const maxE = Math.max(...filteredClients.map(c => c.earned), 1);
  return (
    <div style={S.app}>
      <div style={S.dashHeader}><div style={S.dashIcon}>💰</div><div style={S.dashTitle}>Money</div></div>
      <div style={{ ...S.toggleRow, margin: "0 20px 12px" }}>
        <button onClick={() => setView("clients")} style={S.toggleBtnActive}>Clients</button>
        <button onClick={() => setView("overheads")} style={S.toggleBtn}>Business Costs</button>
      </div>
      {clientStats.length > 0 && (
        <div style={{ padding: "0 20px 8px" }}>
          <input style={S.searchInput} placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
        </div>
      )}
      {clientStats.length === 0 && <div style={S.emptyWrap}><div style={{fontSize:40,marginBottom:12}}>📋</div><div style={S.emptyText}>No client data yet</div><div style={{...S.emptyText,fontSize:12,marginTop:4}}>Add a client name to your daily entries</div></div>}
      {filteredClients.length === 0 && clientStats.length > 0 && <div style={S.emptyText}>No clients match "{clientSearch}"</div>}
      {filteredClients.map((c, i) => (
        <div key={c.name} style={S.clientCard}>
          <div style={S.clientHeader}><div style={S.clientRank}>#{i+1}</div><div style={S.clientName}>{c.name}</div><div style={{...S.clientProfit, color: c.profit>=0?"#27AE60":"#E74C3C"}}>{fmt(c.profit)}</div></div>
          <div style={S.clientBar}><div style={{...S.clientBarFill, width:`${(c.earned/maxE)*100}%`}} /></div>
          <div style={S.clientDetails}>
            <div style={S.clientStat}><span style={S.clientStatLbl}>Earned</span>{fmt(c.earned)}</div>
            <div style={S.clientStat}><span style={S.clientStatLbl}>Costs</span>{fmt(c.materials+c.labour+c.fuel)}</div>
            <div style={S.clientStat}><span style={S.clientStatLbl}>£/Hr</span>{fmt(Math.round(c.perHour))}</div>
            <div style={S.clientStat}><span style={S.clientStatLbl}>Days</span>{c.jobs}</div>
          </div>
        </div>
      ))}
      <Nav {...navProps} />
    </div>
  );
}
