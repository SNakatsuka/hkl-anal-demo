
// utils/render_sg.js（クリーン版：新API専用）

export function renderSG(container, candidates, context = {}) {
  container.innerHTML = "";

  if (!Array.isArray(candidates) || candidates.length === 0) {
    container.textContent = "候補なし";
    return;
  }

  const wrap = document.createElement("div");
  wrap.style.padding = "8px";
  wrap.style.background = "#0b1220";
  wrap.style.border = "1px solid #122036";
  wrap.style.borderRadius = "8px";

  const h = document.createElement("div");
  h.innerHTML = `<b>空間群候補ランキング</b>`;
  h.style.marginBottom = "6px";
  wrap.appendChild(h);

  // 先頭候補メタ
  const top = candidates[0];
  const meta = document.createElement("div");
  meta.style.color = "#cfe";
  meta.style.marginBottom = "8px";
  meta.innerHTML = `
    格子心: <b>${top.lattice ?? "-"}</b><br>
    セントロ性: <b>${top.centric ?? "-"}</b>
  `;
  wrap.appendChild(meta);

  const palette = {
    base:"#334155", centering:"#a3e635", glide:"#22d3ee", screw21:"#fbbf24",
    Estats:"#c084fc", priorZ:"#60a5fa", temp:"#f472b6", zprime:"#4ade80"
  };

  candidates.forEach(c => {
    const row = document.createElement('div');
    row.className = "sgRow";
    row.style.marginBottom = "6px";

    const title = document.createElement('div');
    title.innerHTML =
      `<b>${c.name}</b> <span class="score">${(typeof c.score === "number" ? c.score.toFixed(3) : "-")}</span>` +
      (c.centric ? ` <span class="tag">${c.centric}</span>` : "");
    row.appendChild(title);

    if (Array.isArray(c.breakdown) && c.breakdown.length > 0) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "12");
      svg.style.display = "block";
      svg.style.marginTop = "4px";

      const total = Math.max(1e-9, c.breakdown.reduce((a, b) => a + (b.value || 0), 0));
      let x = 0;
      for (const seg of c.breakdown) {
        const v = seg.value || 0;
        const w = Math.max(0, v / total);
        if (w <= 0) continue;
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", `${x * 100}%`);
        r.setAttribute("y", "0");
        r.setAttribute("width", `${w * 100}%`);
        r.setAttribute("height", "12");
        r.setAttribute("fill", palette[seg.key] || "#64748b");
        r.setAttribute("title", `${seg.key}: ${v.toFixed?.(3) ?? v}`);
        svg.appendChild(r);
        x += w;
      }
      row.appendChild(svg);
    }

    wrap.appendChild(row);
  });

  // 根拠の簡易表示（任意）
  if (context && (context.ext || context.eHist || context.screw || context.glide)) {
    const hint = document.createElement("div");
    hint.style.color = "#9ca3af";
    hint.style.fontSize = "0.9em";
    hint.style.marginTop = "8px";
    hint.innerHTML = `
      <span>※ 判定根拠:
        centering=${context.ext?.best?.type ?? "-"}
        / glide=${context.glide?.best?.name ?? "-"}
        / screw=${context.screw?.call ?? "-"}
        / ⟨|E²−1|⟩=${(typeof context.eHist?.meanE2m1 === "number" ? context.eHist.meanE2m1.toFixed(3) : "-")}
      </span>
    `;
    wrap.appendChild(hint);
  }

  container.appendChild(wrap);
}
