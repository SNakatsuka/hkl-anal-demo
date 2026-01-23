export function renderExtinction(container, ext) {
  if (!ext) {
    container.textContent = "未計算";
    return;
  }

  const { scores, best } = ext;

  const rows = scores.map(s => {
    const conf = confidenceFromRatio(s.ratio);
    return `
      <tr>
        <td>${s.type}</td>
        <td>${s.forbid.toFixed(3)}</td>
        <td>${s.allow.toFixed(3)}</td>
        <td>${s.ratio.toFixed(3)}</td>
        <td class="conf">${conf.stars}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <table class="ext-table">
      <thead>
        <tr>
          <th>Type</th><th>Forbidden</th><th>Allowed</th><th>Ratio</th><th>Confidence</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p class="best-lattice">
      最有力：<span class="badge">${best.type}</span>
      （${confidenceFromRatio(best.ratio).label}）
    </p>
  `;
}

function confidenceFromRatio(r) {
  if (r < 0.05) return { stars:"★★★★★", label:"非常に強い証拠" };
  if (r < 0.10) return { stars:"★★★★☆", label:"強い証拠" };
  if (r < 0.20) return { stars:"★★★☆☆", label:"中程度" };
  if (r < 0.30) return { stars:"★★☆☆☆", label:"弱い証拠" };
  if (r < 0.50) return { stars:"★☆☆☆☆", label:"かなり弱い" };
  return { stars:"☆☆☆☆☆", label:"ほぼ証拠なし" };
}
