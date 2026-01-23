
// Eヒストグラムと centro/acentro 判定
export function buildEHistogram(withE, nBins = 20) {
  const absE = withE.map(r => Math.abs(r.E)).filter(Number.isFinite);
  if (absE.length === 0) return null;

  const Emax = Math.max(...absE);
  const bins = [];
  for (let i=0;i<nBins;i++) {
    bins.push({ i, lo: i*(Emax/nBins), hi: (i+1)*(Emax/nBins), n:0 });
  }

  for (const x of absE) {
    let idx = Math.floor(x / Emax * nBins);
    if (idx >= nBins) idx = nBins-1;
    bins[idx].n++;
  }

  // centro/acentro 判定
  const E2minus1 = absE.map(x => Math.abs(x*x - 1));
  const meanE2m1 = E2minus1.reduce((a,b)=>a+b,0)/E2minus1.length;

  const diffA = Math.abs(meanE2m1 - 0.736);
  const diffC = Math.abs(meanE2m1 - 0.968);
  const likely = diffA < diffC ? "acentric（非セントロ）" : "centric（セントロ）";

  return { bins, Emax, meanE2m1, likely };
}

// SVG描画（超簡易棒グラフ）
export function renderEHistogramSVG(containerEl, hist, opts={}) {
  containerEl.innerHTML = "";
  if (!hist) { containerEl.textContent = "データ不足"; return;}

  const { bins, Emax, meanE2m1, likely } = hist;
  const width = opts.width ?? 720;
  const height = opts.height ?? 240;
  const margin = { top:10, right:10, bottom:40, left:40 };

  const svgns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgns, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.style.background = "#0b1220";

  const nMax = Math.max(...bins.map(b=>b.n), 1);

  const xscale = i => margin.left + (i/bins.length)*(width-margin.left-margin.right);
  const yscale = n => height-margin.bottom - (n/nMax)*(height-margin.top-margin.bottom);

  for (let i=0;i<bins.length;i++){
    const b = bins[i];
    const x = xscale(i);
    const y = yscale(b.n);
    const barW = (width-margin.left-margin.right)/bins.length * 0.9;
    const barH = height - margin.bottom - y;

    const rect = document.createElementNS(svgns, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("fill", "#38bdf8");
    svg.appendChild(rect);
  }

  // x 軸ラベル
  const xl = document.createElementNS(svgns, "text");
  xl.textContent = "|E|";
  xl.setAttribute("x", width/2);
  xl.setAttribute("y", height-6);
  xl.setAttribute("fill", "#93c5fd");
  xl.setAttribute("text-anchor", "middle");
  svg.appendChild(xl);

  containerEl.appendChild(svg);

  const title = document.createElementNS(svgns, "title");
  title.textContent = `bin ${i}: n = ${b.n}`;
  rect.appendChild(title);
  
  // 追加のテキスト表示
  const info = document.createElement("div");
  info.style.color = "#93c5fd";
  info.style.marginTop = "4px";
  info.innerHTML = `
    ⟨|E² − 1|⟩ = ${meanE2m1.toFixed(3)} → <b>${likely}</b>
  `;
  containerEl.appendChild(info);
}
