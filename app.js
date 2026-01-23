import { parseHKL_line_auto, intensityToAmplitude, toCSV } from './utils/hkl.js';
import { computeE } from './utils/e_normalize.js';
import { eStats } from './utils/stats.js';
import { buildWilsonProxy, renderWilsonProxySVG, linearRegressionXY } from './utils/wilson_proxy.js';
import { buildEHistogram, renderEHistogramSVG } from './utils/e_histogram.js';
import { analyzeExtinction } from './utils/extinction.js';
import { buildSpaceGroupCandidates } from './utils/sg_candidates.js';

const fileInput = document.getElementById('fileInput');
const summaryEl = document.getElementById('summary');
const logEl = document.getElementById('log');
const btnE = document.getElementById('downloadEcsv');
const btnF = document.getElementById('downloadFcsv');

const progressEl = document.getElementById('progress');
const progressPctEl = document.getElementById('progressPct');
const progressInfoEl = document.getElementById('progressInfo');

let lastE = null;
let lastF = null;

function log(msg, type="info") {
  const t = new Date().toLocaleTimeString();
  const color = { info:"#93c5fd", success:"#86efac", error:"#fca5a5", warn:"#fde047" }[type] || "#e2e8f0";
  logEl.innerHTML += `<span style="color:${color}">[${t}] ${msg}</span><br>`;
  logEl.scrollTop = logEl.scrollHeight;
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  resetUIForLoading(file);

  let withF = null; // try の外に宣言
  let withE = null; // try の外に宣言


  try {
    const { reflections, skipped, formatStats } = await parseFileWithProgress(file);

    if (reflections.length === 0) {
      summaryEl.textContent = "❌ パース失敗：有効な HKL 行がありません。";
      btnE.disabled = true; btnF.disabled = true;
      return;
    }

    // |F|
    withF = intensityToAmplitude(reflections);

    const meanI  = reflections.reduce((a,r)=>a+r.I,0)/reflections.length;
    const meanF2_global = withF.reduce((a,r)=>a+r.F*r.F,0)/withF.length;

    // E 正規化（衝突回避のためオブジェクト受け）
    const ce = computeE(withF);
    withE = ce.reflections;

    // サマリ表示
    const dominantFormat = dominant(formatStats);
    summaryEl.innerHTML = `
      <b>✔ パース成功</b><br>
      データ数: ${withE.length}<br>
      判定形式 内訳: whitespace=${formatStats.whitespace}, fixed-width=${formatStats["fixed-width"]}<br>
      採用形式: <b>${dominantFormat}</b><br>
      スキップ行: ${skipped}<br>
      &lt;I&gt;: ${meanI.toFixed(3)} / &lt;F²&gt;: ${meanF2_global.toFixed(3)}（正規化で使用: ${ce.meanF2.toFixed(3)}）
    `;
    log(`パース成功：${withE.length} 反射（主形式: ${dominantFormat}）`, "success");

    // ダウンロード用データ
    lastF = withF.map(r => ({ h: r.h, k: r.k, l: r.l, F: r.F.toFixed(6) }));
    lastE = withE.map(r => ({ h: r.h, k: r.k, l: r.l, E: r.E.toFixed(6) }));
    btnF.disabled = false; btnE.disabled = false;

    // 実験パラメータ（任意入力）
    const params = getExperimentParams();
    if (!Number.isNaN(params.thetaMax)) {
      log(`実験パラメータ: λ=${params.lambda}, θ_max=${params.thetaMax}`, "info");
    }

    // --- Wilson-like + 回帰線 ---
    const { points } = buildWilsonProxy(withF, 10);
    const reg = linearRegressionXY(points);

    const wcon = document.getElementById('wilsonContainer');
    renderWilsonProxySVG(wcon, points, {
      width:720, height:320, regression: reg
    });

    if (reg) {
      log(`Wilson-like 回帰線: slope=${reg.a.toFixed(4)}, intercept=${reg.b.toFixed(3)}`, "info");
    } else {
      log("Wilson-like 回帰線: データ不足", "warn");
    }

    // --- E ヒストグラム ---
    const eHist = buildEHistogram(withE, 20);
    const extContainer = document.getElementById('extContainer');
    renderEHistogramSVG(eContainer, eHist);
    if (eHist) {
      log(`E分布: mean|E²−1|=${eHist.meanE2m1.toFixed(3)} → ${eHist.likely}`, "info");
    } else {
      log("E分布: データ不足", "warn");
    }

    // --- E 統計ブロック ---
    const stats = eStats(withE);
    if (stats) {
      const { n, e1, e2, e3, e4, e2minus1_abs, likely } = stats;
      summaryEl.innerHTML += `
        <hr>
        <b>E 統計（簡易）</b><br>
        反射数: ${n}<br>
        ⟨|E|⟩ = ${e1.toFixed(3)}<br>
        ⟨|E|²⟩ = ${e2.toFixed(3)}<br>
        ⟨|E|³⟩ = ${e3.toFixed(3)}<br>
        ⟨|E|⁴⟩ = ${e4.toFixed(3)}<br>
        ⟨|E² − 1|⟩ = ${e2minus1_abs.toFixed(3)}<br>
        判定（参考）: <b>${likely}</b><br>
        <span class="hint">※ 厳密な判定には分解能依存の正規化が望ましい</span>
      `;
    }
    
    // --- Extinction / Lattice-centering 判定 ---
    const ext = analyzeExtinction(reflections);
    if (ext) {
      const best = ext.best;
      const lines = ext.scores.map(s =>
        `${s.type}: ratio=${s.ratio.toFixed(3)} (forbid=${s.forbid.toFixed(3)}, allow=${s.allow.toFixed(3)})`
      ).join("<br>");
    
      extContainer.innerHTML = `
        <b>格子心 推定（系統消滅）</b><br>
        最有力: <b>${best.type}</b>（ratio=${best.ratio.toFixed(3)}）<br><br>
        <div style="font-size:0.9em;color:#9ca3af">${lines}</div>
      `;
    
      log(`Extinction 判定: 最有力 = ${best.type}`, "info");
    }

    // --- 空間群候補ランキング ---
    const sgCandidates = buildSpaceGroupCandidates(ext, eHist);
    
    const sgContainer = document.getElementById('sgContainer');
    
    if (sgCandidates && sgCandidates.length > 0) {
      const html = sgCandidates.map(c =>
        `<b>${c.name}</b> (score=${c.score.toFixed(2)})`
      ).join("<br>");
    
      sgContainer.innerHTML = `
        <b>空間群候補ランキング（簡易）</b><br>
        格子心: <b>${sgCandidates[0].lattice}</b><br>
        セントロ性: <b>${sgCandidates[0].centric ? "centro" : "acentro"}</b><br><br>
        ${html}
      `;
      log(`空間群候補: ${sgCandidates.map(c=>c.name).join(", ")}`, "info");
    }
    
    // 完了
    setProgress(100, `${file.name} の読み込みと解析が完了`);

  } catch (err) {
    summaryEl.textContent = "❌ エラー発生";
    log("例外：" + (err?.message || err), "error");
    setProgress(0, "エラー");
    return;
  }
});

btnF.addEventListener('click', () => {
  if (!lastF) return;
  download('amplitude_F.csv', toCSV(lastF, ['h','k','l','F']));
});

btnE.addEventListener('click', () => {
  if (!lastE) return;
  download('normalized_E.csv', toCSV(lastE, ['h','k','l','E']));
});

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// 進捗表示ヘルパ
function setProgress(pct, info) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  progressEl.value = v;
  progressPctEl.textContent = `${v}%`;
  if (info) progressInfoEl.textContent = info;
}

function resetUIForLoading(file) {
  log(`ファイル読み込み開始: ${file.name} (${file.size} bytes)`, "info");
  summaryEl.textContent = "解析中…";
  btnE.disabled = true; btnF.disabled = true;
  setProgress(0, "読み込み準備中…");
}

// 複数形式が混じった場合に多数決で主形式を出す
function dominant(stats) {
  return (stats.whitespace >= stats["fixed-width"]) ? "whitespace" : "fixed-width";
}

function isIgnorable(raw) {
  if (!raw) return true;
  // コメント行（; ! #）は無視
  const t = raw.trimStart();
  return t === '' || t.startsWith(';') || t.startsWith('#') || t.startsWith('!');
}

function getExperimentParams() {
  const lambda = parseFloat(document.getElementById('lambdaInput').value);
  const thetaMin = parseFloat(document.getElementById('thetaMinInput').value);
  const thetaMax = parseFloat(document.getElementById('thetaMaxInput').value);

  return { lambda, thetaMin, thetaMax };
}

// --- ★コア：Chunk 読み + 逐次パース + 進捗 --- //
async function parseFileWithProgress(file, chunkSize = 128 * 1024) {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const reflections = [];
  let skipped = 0;
  let offset = 0;
  let leftover = '';
  const formatStats = { 'whitespace': 0, 'fixed-width': 0 };

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const buf = await file.slice(offset, end).arrayBuffer();
    const text = decoder.decode(buf, { stream: true });

    const chunkText = leftover + text;
    const lines = chunkText.split(/\r?\n/);
    leftover = lines.pop() ?? '';

    for (const raw of lines) {
      if (isIgnorable(raw)) { continue; }
      const res = parseHKL_line_auto(raw);
      if (res.ok) {
        reflections.push(res.rec);
        if (res.format) formatStats[res.format] = (formatStats[res.format] || 0) + 1;
      } else {
        skipped++;
      }
    }

    offset = end;
    const pct = (offset / file.size) * 100;
    setProgress(pct, `読み込み中… ${Math.round(pct)}%（${offset}/${file.size} bytes）`);
    await microYield();
  }

  if (!isIgnorable(leftover)) {
    const res = parseHKL_line_auto(leftover);
    if (res.ok) {
      reflections.push(res.rec);
      if (res.format) formatStats[res.format] = (formatStats[res.format] || 0) + 1;
    } else {
      skipped++;
    }
  }

  return { reflections, skipped, formatStats };
}

function microYield() {
  return new Promise(requestAnimationFrame);
}
