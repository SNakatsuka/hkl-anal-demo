// utils/wilson_proxy.js

// 反射を R = h^2 + k^2 + l^2 で 10シェルに分けて <F^2> の log を計算
export function buildWilsonProxy(withF, nBins = 10) {
  if (!withF || withF.length === 0) return { bins: [], points: [] };

  // R と F^2 を前計算
  const rows = [];
  for (const r of withF) {
    const R = r.h*r.h + r.k*r.k + r.l*r.l;
    const F2 = r.F * r.F;
    if (Number.isFinite(R) && Number.isFinite(F2)) {
      rows.push({ R, F2 });
    }
  }
  if (rows.length === 0) return { bins: [], points: [] };

  // R の最小最大
  let Rmin = Infinity, Rmax = -Infinity;
  for (const x of rows) {
    if (x.R < Rmin) Rmin = x.R;
    if (x.R > Rmax) Rmax = x.R;
  }
  if (!Number.isFinite(Rmin) || !Number.isFinite(Rmax) || Rmax <= Rmin) {
    return { bins: [], points: [] };
  }

  // ビン境界
  const bins = [];
  const step = (Rmax - Rmin) / nBins;
  for (let i = 0; i < nBins; i++) {
    bins.push({ i, lo: Rmin + i*step, hi: (i === nBins-1) ? Rmax+1e-12 : Rmin + (i+1)*step, sumF2:0, n:0 });
  }

  // ビニング
  for (const {R, F2} of rows) {
    let idx = Math.floor((R - Rmin) / step);
    if (idx < 0) idx = 0;
    if (idx >= nBins) idx = nBins - 1;
    bins[idx].sumF2 += F2;
    bins[idx].n += 1;
  }

  // x=bin中心R、y=log(<F^2>) を作る
  const points = [];
  for (const b of bins) {
    if (b.n > 0 && b.sumF2 > 0) {
      const meanF2 = b.sumF2 / b.n;
      const y = Math.log(meanF2); // 自然対数
      const x = 0.5 * (b.lo + b.hi);
      points.push({ x, y, n: b.n });
    }
  }

  return { bins, points, Rmin, Rmax };
}

// 単純な SVG ラインチャートを描く（依存なし）
export function renderWilsonProxySVG(containerEl, points, opts = {}) {
  containerEl.innerHTML = ""; // クリア
  if (!points || points.length === 0) {
    containerEl.textContent = "データ不足（プロットできません）";
    return;
  }

  // サイズ
  const width = opts.width ?? 720;
  const height = opts.height ?? 320;
  const margin = { top: 16, right: 24, bottom: 40, left: 56 };

  // データ範囲
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const p of points) {
    if (p.x < xmin) xmin = p.x;
    if (p.x > xmax) xmax = p.x;
    if (p.y < ymin) ymin = p.y;
    if (p.y > ymax) ymax = p.y;
  }
  // 余白
  const xpad = 0.05*(xmax - xmin || 1);
  const ypad = 0.1*(ymax - ymin || 1);
  xmin -= xpad; xmax += xpad;
  ymin -= ypad; ymax += ypad;

  // スケール関数
  const xscale = x => margin.left + ( (x - xmin) / (xmax - xmin) ) * (width - margin.left - margin.right);
  const yscale = y => height - margin.bottom - ( (y - ymin) / (ymax - ymin) ) * (height - margin.top - margin.bottom);

  // SVG
  const svgns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgns, "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.style.background = "#0b1220";

  // 軸（簡易）
  // x軸ライン
  const xAxis = document.createElementNS(svgns, "line");
  xAxis.setAttribute("x1", margin.left);
  xAxis.setAttribute("y1", height - margin.bottom);
  xAxis.setAttribute("x2", width - margin.right);
  xAxis.setAttribute("y2", height - margin.bottom);
  xAxis.setAttribute("stroke", "#7dd3fc");
  xAxis.setAttribute("stroke-width", "1");
  svg.appendChild(xAxis);

  // y軸ライン
  const yAxis = document.createElementNS(svgns, "line");
  yAxis.setAttribute("x1", margin.left);
  yAxis.setAttribute("y1", margin.top);
  yAxis.setAttribute("x2", margin.left);
  yAxis.setAttribute("y2", height - margin.bottom);
  yAxis.setAttribute("stroke", "#7dd3fc");
  yAxis.setAttribute("stroke-width", "1");
  svg.appendChild(yAxis);

  // 軸ラベル
  const xt = document.createElementNS(svgns, "text");
  xt.textContent = "R = h² + k² + l²（近似的な“分解能”順序）";
  xt.setAttribute("x", (width - margin.left - margin.right)/2 + margin.left);
  xt.setAttribute("y", height - 8);
  xt.setAttribute("fill", "#93c5fd");
  xt.setAttribute("text-anchor", "middle");
  xt.setAttribute("font-size", "12");
  svg.appendChild(xt);

  const yt = document.createElementNS(svgns, "text");
  yt.textContent = "log(⟨F²⟩)";
  yt.setAttribute("transform", `translate(16 ${(height - margin.top - margin.bottom)/2 + margin.top}) rotate(-90)`);
  yt.setAttribute("fill", "#93c5fd");
  yt.setAttribute("text-anchor", "middle");
  yt.setAttribute("font-size", "12");
  svg.appendChild(yt);

  // 折れ線パス
  const sorted = [...points].sort((a,b)=>a.x - b.x);
  let d = "";
  for (let i=0;i<sorted.length;i++){
    const px = xscale(sorted[i].x);
    const py = yscale(sorted[i].y);
    d += (i===0 ? `M ${px} ${py}` : ` L ${px} ${py}`);
  }
  const path = document.createElementNS(svgns, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#22d3ee");
  path.setAttribute("stroke-width", "2");
  svg.appendChild(path);

  // 散布点
  for (const p of sorted) {
    const cx = xscale(p.x);
    const cy = yscale(p.y);
    const dot = document.createElementNS(svgns, "circle");
    dot.setAttribute("cx", cx);
    dot.setAttribute("cy", cy);
    dot.setAttribute("r", Math.max(2, Math.min(6, 2 + Math.log10(p.n+1)))); // 反射数でサイズ微調整
    dot.setAttribute("fill", "#a7f3d0");
    dot.setAttribute("opacity", "0.9");
    svg.appendChild(dot);
  }

  // 回帰線
  if (opts.regression) {
    const { a, b } = opts.regression;
    // x範囲の端点で線を生成
    const xs = points.map(p => p.x);
    const x1 = Math.min(...xs);
    const x2 = Math.max(...xs);
    const y1 = a * x1 + b;
    const y2 = a * x2 + b;
  
    const line = document.createElementNS(svgns, "line");
    line.setAttribute("x1", xscale(x1));
    line.setAttribute("y1", yscale(y1));
    line.setAttribute("x2", xscale(x2));
    line.setAttribute("y2", yscale(y2));
    line.setAttribute("stroke", "#f472b6");  // ピンク
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", "6 4");
    svg.appendChild(line);
  }

  containerEl.appendChild(svg);
}

// 最小二乗の線形回帰: points = [{x, y}, ...]
export function linearRegressionXY(points) {
  const n = points.length;
  if (n < 2) return null;

  let sx=0, sy=0, sxx=0, sxy=0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const denom = (n * sxx - sx * sx);
  if (Math.abs(denom) < 1e-12) return null;

  const a = (n * sxy - sx * sy) / denom;     // 傾き
  const b = (sy - a * sx) / n;              // 切片

  return { a, b };
}

