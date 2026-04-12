import S from "../styles.js";

export default function Invoice({ job, invoiceNum, settings, clientProfiles, currencyMeta, fmt, showToast, setView }) {
  const client = clientProfiles[job.client] || {};
  const numStr = String(invoiceNum || 1).padStart(3, "0");
  const todayD = new Date();
  const dueD = new Date(todayD.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fmtDate = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const fmtJobDate = (s) => { if (!s) return ""; try { return new Date(s + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return s; } };

  const totalEarnings = Number(job.totalEarnings) || 0;
  const materials = Number(job.materials) || 0;
  const labourCost = Number(job.labour) || 0;
  const fuel = Number(job.fuel) || 0;
  const serviceCharge = totalEarnings - materials - labourCost - fuel;

  const detailedExpenses = Array.isArray(job.expenses) && job.expenses.length > 0 ? job.expenses : null;

  const buildShareText = () => {
    const lines = [];
    lines.push(`INVOICE #${numStr}`);
    lines.push(`Date: ${fmtDate(todayD)}`);
    lines.push(`Due: ${fmtDate(dueD)}`);
    lines.push("");
    if (settings.businessName) lines.push(`FROM: ${settings.businessName}`);
    if (settings.businessAddress) lines.push(settings.businessAddress);
    if (settings.businessPhone) lines.push(settings.businessPhone);
    if (settings.businessEmail) lines.push(settings.businessEmail);
    if (settings.vatNumber) lines.push(`VAT No: ${settings.vatNumber}`);
    lines.push("");
    lines.push(`BILL TO: ${job.client}`);
    if (client.company) lines.push(client.company);
    if (client.address) lines.push(client.address);
    if (client.email) lines.push(client.email);
    if (client.phone) lines.push(client.phone);
    lines.push("");
    lines.push(`JOB: ${job.job || "Services Rendered"}`);
    lines.push(`Period: ${fmtJobDate(job.dateFrom)} – ${fmtJobDate(job.dateTo)}${job.days ? ` · ${job.days} days` : ""}`);
    if (job.notes) lines.push(`Notes: ${job.notes}`);
    lines.push("");
    lines.push("─────────────────────────────────");
    if (detailedExpenses) {
      detailedExpenses.forEach(e => {
        const label = [e.item, e.supplier, e.category].filter(Boolean).join(" · ");
        lines.push(`${label.padEnd(32)} ${currencyMeta.symbol}${Number(e.amount).toFixed(2)}`);
      });
      if (serviceCharge > 0) lines.push(`${"Labour & Services".padEnd(32)} ${currencyMeta.symbol}${serviceCharge.toFixed(2)}`);
    } else {
      if (serviceCharge > 0) lines.push(`${"Labour & Services".padEnd(32)} ${currencyMeta.symbol}${serviceCharge.toFixed(2)}`);
      if (materials > 0) lines.push(`${"Materials".padEnd(32)} ${currencyMeta.symbol}${materials.toFixed(2)}`);
      if (labourCost > 0) lines.push(`${"Sub-contracted Labour".padEnd(32)} ${currencyMeta.symbol}${labourCost.toFixed(2)}`);
      if (fuel > 0) lines.push(`${"Fuel / Travel".padEnd(32)} ${currencyMeta.symbol}${fuel.toFixed(2)}`);
    }
    lines.push("─────────────────────────────────");
    lines.push(`${"TOTAL DUE".padEnd(32)} ${fmt(totalEarnings)}`);
    lines.push("");
    if (settings.bankName || settings.bankAccount) {
      lines.push("PAYMENT DETAILS");
      if (settings.bankName) lines.push(`Bank: ${settings.bankName}`);
      if (settings.bankAccount) lines.push(`Account: ${settings.bankAccount}${settings.bankSortCode ? `  Sort Code: ${settings.bankSortCode}` : ""}`);
    }
    lines.push("");
    lines.push("Thank you for your business.");
    return lines.join("\n");
  };

  const handleShare = async () => {
    const text = buildShareText();
    if (navigator.share) {
      try { await navigator.share({ title: `Invoice #${numStr} – ${job.client}`, text }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(text); showToast("Invoice copied to clipboard"); } catch { showToast("Could not share invoice", "error"); }
  };

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: "#1A1D23", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <style>{`@media print { .inv-actions { display: none !important; } @page { margin: 12mm; } body { background: #fff !important; } }`}</style>
      <div className="inv-actions" style={{ display: "flex", gap: 8, padding: "16px 20px 0" }}>
        <button onClick={() => setView("editJob")} style={S.backBtn}>← Back</button>
        <div style={{ flex: 1 }} />
        <button onClick={handleShare} style={{ ...S.editBookingBtn, padding: "8px 14px", fontSize: 13 }}>Share</button>
        <button onClick={() => window.print()} style={{ ...S.saveBtn, width: "auto", padding: "8px 16px", marginTop: 0, fontSize: 13 }}>Print / PDF</button>
      </div>

      <div style={S.invoiceDoc}>
        <div style={S.invoiceHeader}>
          <div style={{ flex: 1 }}>
            <div style={S.invoiceBizName}>{settings.businessName || "Your Business"}</div>
            {settings.businessAddress && <div style={S.invoiceBizDetail}>{settings.businessAddress}</div>}
            {settings.businessPhone && <div style={S.invoiceBizDetail}>{settings.businessPhone}</div>}
            {settings.businessEmail && <div style={S.invoiceBizDetail}>{settings.businessEmail}</div>}
            {settings.vatNumber && <div style={{ ...S.invoiceBizDetail, marginTop: 4 }}>VAT: {settings.vatNumber}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={S.invoiceTitle}>INVOICE</div>
            <div style={S.invoiceNum}>#{numStr}</div>
            <div style={{ ...S.invoiceMeta, marginTop: 6 }}>Date: {fmtDate(todayD)}</div>
            <div style={S.invoiceMeta}>Due: {fmtDate(dueD)}</div>
          </div>
        </div>

        <div style={S.invoiceDivider} />

        <div style={{ marginBottom: 20 }}>
          <div style={S.invoiceSectionLabel}>BILL TO</div>
          <div style={S.invoiceClientName}>{job.client}</div>
          {client.company && <div style={S.invoiceClientDetail}>{client.company}</div>}
          {client.address && <div style={S.invoiceClientDetail}>{client.address}</div>}
          {client.email && <div style={S.invoiceClientDetail}>{client.email}</div>}
          {client.phone && <div style={S.invoiceClientDetail}>{client.phone}</div>}
          {!client.company && !client.address && !client.email && !client.phone && (
            <div style={{ ...S.invoiceClientDetail, color: "#aaa", fontStyle: "italic" }}>Add client details in the Clients tab</div>
          )}
        </div>

        <div style={S.invoiceJobBox}>
          <div style={S.invoiceJobTitle}>{job.job || "Services Rendered"}</div>
          <div style={S.invoiceJobMeta}>
            {job.dateFrom && job.dateTo ? `${fmtJobDate(job.dateFrom)} – ${fmtJobDate(job.dateTo)}` : ""}
            {job.days ? ` · ${job.days} day${job.days !== 1 ? "s" : ""}` : ""}
          </div>
          {job.notes && <div style={{ ...S.invoiceJobMeta, marginTop: 4 }}>Note: {job.notes}</div>}
        </div>

        <div style={S.invoiceTable}>
          <div style={S.invoiceTableHead}>
            <span>Description</span>
            <span>Amount</span>
          </div>
          {detailedExpenses ? (
            <>
              {detailedExpenses.map((e, i) => {
                const label = e.item ? `${e.item}${e.supplier ? ` (${e.supplier})` : ""}` : (e.supplier || e.category);
                return (
                  <div key={i} style={S.invoiceLineItem}>
                    <div style={S.invoiceLineDesc}>
                      <span>{label}</span>
                      <span style={S.invoiceLineSub}>{e.category}{e.date ? ` · ${fmtJobDate(e.date)}` : ""}</span>
                    </div>
                    <span style={S.invoiceLineAmt}>{fmt(e.amount)}</span>
                  </div>
                );
              })}
              {serviceCharge > 0 && (
                <div style={S.invoiceLineItem}>
                  <div style={S.invoiceLineDesc}><span>Labour &amp; Services</span></div>
                  <span style={S.invoiceLineAmt}>{fmt(serviceCharge)}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {serviceCharge > 0 && (
                <div style={S.invoiceLineItem}>
                  <div style={S.invoiceLineDesc}>
                    <span>Labour &amp; Services</span>
                    {job.days > 0 && serviceCharge > 0 && <span style={S.invoiceLineSub}>{job.days} day{job.days !== 1 ? "s" : ""} · {fmt(Math.round(serviceCharge / job.days))}/day</span>}
                  </div>
                  <span style={S.invoiceLineAmt}>{fmt(serviceCharge)}</span>
                </div>
              )}
              {materials > 0 && (
                <div style={S.invoiceLineItem}>
                  <div style={S.invoiceLineDesc}><span>Materials</span></div>
                  <span style={S.invoiceLineAmt}>{fmt(materials)}</span>
                </div>
              )}
              {labourCost > 0 && (
                <div style={S.invoiceLineItem}>
                  <div style={S.invoiceLineDesc}><span>Sub-contracted Labour</span></div>
                  <span style={S.invoiceLineAmt}>{fmt(labourCost)}</span>
                </div>
              )}
              {fuel > 0 && (
                <div style={S.invoiceLineItem}>
                  <div style={S.invoiceLineDesc}><span>Fuel &amp; Travel</span></div>
                  <span style={S.invoiceLineAmt}>{fmt(fuel)}</span>
                </div>
              )}
              {serviceCharge <= 0 && materials === 0 && labourCost === 0 && fuel === 0 && (
                <div style={S.invoiceLineItem}>
                  <div style={S.invoiceLineDesc}><span>Services Rendered</span></div>
                  <span style={S.invoiceLineAmt}>{fmt(totalEarnings)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div style={S.invoiceTotalRow}>
          <span style={S.invoiceTotalLabel}>TOTAL DUE</span>
          <span style={S.invoiceTotalAmt}>{fmt(totalEarnings)}</span>
        </div>

        <div style={S.invoiceDivider} />

        {(settings.bankName || settings.bankAccount) && (
          <div style={{ marginBottom: 16 }}>
            <div style={S.invoiceSectionLabel}>PAYMENT DETAILS</div>
            {settings.bankName && <div style={S.invoicePayDetail}><span style={S.invoicePayLabel}>Bank</span>{settings.bankName}</div>}
            {settings.bankAccount && <div style={S.invoicePayDetail}><span style={S.invoicePayLabel}>Account</span>{settings.bankAccount}</div>}
            {settings.bankSortCode && <div style={S.invoicePayDetail}><span style={S.invoicePayLabel}>Sort Code</span>{settings.bankSortCode}</div>}
          </div>
        )}

        {(!settings.bankName && !settings.bankAccount) && (
          <div style={{ marginBottom: 16, fontSize: 12, color: "#aaa", fontStyle: "italic" }}>Add bank details in Settings to show payment information.</div>
        )}

        <div style={S.invoiceThankYou}>Thank you for your business.</div>
      </div>

      <div style={{ height: 32 }} />
    </div>
  );
}
