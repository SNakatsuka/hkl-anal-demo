// Eヒストグラムと centro/acentro 判定

// 署名を拡張: (withE, nBins=20, opts={ excludeLowest: 0 })
export function buildEHistogram(withE, nBins = 20, opts = {}) {
  const { excludeLowest = 0 } = opts;

  const absE = withE.map(r => Math.abs(r.E)).filter(Number.isFinite);
  if (absE.length === 0) return null;

  // --- 既存のビン分割 ---
  const Emax = Math.max(...absE, 1e-12);
  const bins = [];
  for (let i=0;i<nBins;i++) {
    bins.push({ i, lo: i*(Emax/nBins), hi: (i+1)*(Emax/nBins), n:0, vals:[] });
  }
  for (const x of absE) {
    let idx = Math.floor(x / Emax * nBins);
    if (idx >= nBins) idx = nBins - 1;
    bins[idx].n++;
    bins[idx].vals.push(x);
  }

  // --- ⟨|E²−1|⟩ を計算（最下位シェル exclude） ---
  const usedBins = bins.slice(Math.min(excludeLowest, nBins));
  const used = usedBins.flatMap(b => b.vals);
  const E2minus1 = used.map(x => Math.abs(x*x - 1));
  const meanE2m1 = E2minus1.reduce((a,b)=>a+b,0) / Math.max(E2minus1.length,1);

  const diffA = Math.abs(meanE2m1 - 0.736);
  const diffC = Math.abs(meanE2m1 - 0.968);
  const likely = diffA < diffC ? "acentric（非セントロ）" : "centric（セントロ）";

  return { bins, Emax, meanE2m1, likely, excludeLowest };
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
    rect.setAttribute("width", barW);
    rect.setAttribute("height", barH);
    
    const title = document.createElementNS(svgns, "title");
    title.textContent = `bin ${i}: n = ${b.n}`;
    rect.appendChild(title);

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
  
  // 追加のテキスト表示
  const info = document.createElement("div");
  info.style.color = "#93c5fd";
  info.style.marginTop = "4px";
  info.innerHTML = `
    ⟨|E² − 1|⟩ = ${meanE2m1.toFixed(3)} → <b>${likely}</b>
  `;
  containerEl.appendChild(info);
}
