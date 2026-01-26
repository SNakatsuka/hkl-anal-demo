// services/log.js
export function createLogger(logEl) {
  return function log(msg, type = "info") {
    const t = new Date().toLocaleTimeString();
    const color = { info:"#93c5fd", success:"#86efac", error:"#fca5a5", warn:"#fde047" }[type] || "#e2e8f0";
    logEl.innerHTML += `<span style="color:${color}">[${t}] ${msg}</span><br>`;
    logEl.scrollTop = logEl.scrollHeight;
  };
}
