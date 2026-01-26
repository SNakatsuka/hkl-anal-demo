// ui/summary.js
export function renderSummary({ el, counts, stats }) {
  const { n, skipped, formatStats, dominantFormat } = counts;
  const { meanI, meanF2_global, meanF2_used } = stats;
  el.innerHTML = `
    <b>✔ パース成功</b><br>
    データ数: ${n}<br>
    判定形式 内訳: whitespace=${formatStats.whitespace}, fixed-width=${formatStats["fixed-width"]}<br>
    採用形式: <b>${dominantFormat}</b><br>
    スキップ行: ${skipped}<br>
    &lt;I&gt;: ${meanI.toFixed(3)} / &lt;F²&gt;: ${meanF2_global.toFixed(3)}（E 正規化　global meanF² を使用: ${meanF2_used.toFixed(3)}）
  `;
}
