import { parseHKL_line_auto, intensityToAmplitude, toCSV } from './utils/hkl.js';
import { computeE } from './utils/e_normalize.js';
import { eStats } from './utils/stats.js';
import { buildWilsonProxy, renderWilsonProxySVG } from './utils/wilson_proxy.js';

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

  let withF = null;   // ← try の外に宣言しておく

  try {
    const { reflections, skipped, formatStats } = await parseFileWithProgress(file);

    if (reflections.length === 0) {
      summaryEl.textContent = "❌ パース失敗：有効な HKL 行がありません。";
      log("解析に失敗：ファイル形式を確認してください。", "error");
      btnE.disabled = true; btnF.disabled = true;
      return;
    }

    // ここから後工程（|F| と E）


    withF = intensityToAmplitude(reflections);

    const meanI = reflections.reduce((a,r)=>a+r.I,0) / reflections.length;
    const meanF2 = withF.reduce((a,r)=>a + r.F*r.F,0) / withF.length;
    const { reflections: withE, meanF2: meanF2Used } = computeE(withF);

    // サマリ表示
    const dominantFormat = dominant(formatStats);
    summaryEl.innerHTML = `
      <b>✔ パース成功</b><br>
      データ数: ${withE.length}<br>
      判定形式 内訳: whitespace=${formatStats.whitespace}, fixed-width=${formatStats["fixed-width"]}<br>
      採用形式: <b>${dominantFormat}</b><br>
      スキップ行: ${skipped}<br>
      &lt;I&gt;: ${meanI.toFixed(3)} / &lt;F²&gt;: ${meanF2.toFixed(3)}（正規化で使用: ${meanF2Used.toFixed(3)}）
    `;
    log(`パース成功：${withE.length} 反射（主形式: ${dominantFormat}）`, "success");

    // ダウンロード用
    lastF = withF.map(r => ({ h:r.h, k:r.k, l:r.l, F:r.F.toFixed(6) }));
    lastE = withE.map(r => ({ h:r.h, k:r.k, l:r.l, E:r.E.toFixed(6) }));
    btnF.disabled = false; btnE.disabled = false;

    // 進捗バーを完了へ
    setProgress(100, `${file.name} の読み込みと解析が完了`);

  } catch (err) {
    summaryEl.textContent = "❌ エラー発生";
    log("例外：" + (err?.message || err), "error");
    setProgress(0, "エラー");
    return;  // ← ここで抜ける（withF が null なら後続を呼ばない）
  }
  
  // --- ここから Wilson-like plot (withF を安全に使える) ---
  const params = getExperimentParams();
  log(`実験パラメータ: λ=${params.lambda}, θ_max=${params.thetaMax}`, "info");

  // 近似 Wilson プロットを生成
  const { points } = buildWilsonProxy(withF, 10); // 10シェル固定
  const container = document.getElementById('wilsonContainer');
  renderWilsonProxySVG(container, points, { width: 720, height: 320 });
  
  // ログにも一言
  log(`Wilson-like プロット: ${points.length} 点（10シェル中、有効シェル ${points.length}）`, "info");
  
});

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
