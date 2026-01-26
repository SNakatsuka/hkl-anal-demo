// services/progress.js
export function createProgress(progressEl, progressPctEl, progressInfoEl) {
  function set(pct, info) {
    const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
    progressEl.style.width = `${p}%`;
    progressPctEl.textContent = `${p}%`;
    if (info) progressInfoEl.textContent = info;
  }
  function resetFor(file) {
    set(0, `読み込み: ${file.name}`);
  }
  return { set, resetFor };
}
