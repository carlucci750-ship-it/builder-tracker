import S from "../styles.js";

export default function Nav({ view, setView, openDay, onQuickAdd, quickActionsOpen, setQuickActionsOpen, undoItem, onUndo, toast, onDismissToast, confirmAction, onConfirm, onDismissConfirm }) {
  return (
    <>
      {quickActionsOpen && <button type="button" onClick={() => setQuickActionsOpen(false)} style={S.quickOverlay} aria-label="Close quick actions" />}
      {quickActionsOpen && (
        <div style={S.quickMenu}>
          <button type="button" onClick={() => onQuickAdd("entry")} style={S.quickItem}>➕ Add today's entry</button>
          <button type="button" onClick={() => onQuickAdd("newActiveJob")} style={S.quickItem}>🔨 Start a job</button>
          <button type="button" onClick={() => onQuickAdd("jobExpense")} style={S.quickItem}>🧱 Add job expense</button>
          <button type="button" onClick={() => onQuickAdd("jobLabour")} style={S.quickItem}>👷 Add job labour</button>
          <div style={{height:1, background:"#2A2D35", margin:"4px 0"}} />
          <button type="button" onClick={() => onQuickAdd("book")} style={{...S.quickItem, color:"#888"}}>📋 Book a job (calendar)</button>
          <button type="button" onClick={() => onQuickAdd("expense")} style={{...S.quickItem, color:"#888"}}>💳 Add business expense</button>
          <button type="button" onClick={() => onQuickAdd("job")} style={{...S.quickItem, color:"#888"}}>✓ Log completed job</button>
        </div>
      )}
      {undoItem && (
        <div style={S.undoBar}>
          <span style={S.undoTxt}>{undoItem.label}</span>
          <button type="button" onClick={onUndo} style={S.undoBtn}>Undo</button>
        </div>
      )}
      {toast && (
        <div style={{...S.toastBar, ...(toast.type === "error" ? S.toastBarError : {})}}>
          <span>{toast.msg}</span>
          <button type="button" onClick={onDismissToast} style={S.toastClose}>×</button>
        </div>
      )}
      {confirmAction && (
        <>
          <button type="button" onClick={onDismissConfirm} style={S.confirmOverlay} aria-label="Cancel" />
          <div style={S.confirmBox}>
            <div style={S.confirmMsg}>{confirmAction.label}</div>
            <div style={S.confirmBtns}>
              <button type="button" onClick={onDismissConfirm} style={S.confirmCancel}>Cancel</button>
              <button type="button" onClick={onConfirm} style={S.confirmOk}>Confirm</button>
            </div>
          </div>
        </>
      )}
      <div style={S.bottomNav}>
        <button onClick={() => setView("dashboard")} style={{...S.navBtn,...(view==="dashboard"?S.navActive:{})}}><span style={S.navIcon}>📊</span><span style={S.navTxt}>Home</span></button>
        <button onClick={() => setView("schedule")} style={{...S.navBtn,...(view==="schedule"||view==="month"?S.navActive:{})}}><span style={S.navIcon}>📆</span><span style={S.navTxt}>Calendar</span></button>
        <button onClick={() => setQuickActionsOpen(!quickActionsOpen)} style={S.navAdd}><span style={{fontSize:28,lineHeight:1}}>{quickActionsOpen ? "×" : "+"}</span></button>
        <button onClick={() => setView("jobs")} style={{...S.navBtn,...(view==="jobs"?S.navActive:{})}}><span style={S.navIcon}>🔨</span><span style={S.navTxt}>Jobs</span></button>
        <button onClick={() => setView("clients")} style={{...S.navBtn,...(view==="clients"||view==="overheads"?S.navActive:{})}}><span style={S.navIcon}>💰</span><span style={S.navTxt}>Money</span></button>
        <button onClick={() => setView("settings")} style={{...S.navBtn,...(view==="settings"?S.navActive:{})}}><span style={S.navIcon}>⚙️</span><span style={S.navTxt}>Settings</span></button>
      </div>
    </>
  );
}
