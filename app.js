import { parseHKL_line_auto, intensityToAmplitude, toCSV } from './utils/hkl.js';
import { computeE } from './utils/e_normalize.js';

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

  try {
    const { reflections, skipped, formatStats } = await parseFileWithProgress(file);

    if (reflections.length === 0) {
      summaryEl.textContent = "❌ パース失敗：有効な HKL 行がありません。";
      log("解析に失敗：ファイル形式を確認してください。", "error");
      btnE.disabled = true; btnF.disabled = true;
      return;
    }

    // ここから後工程（|F| と E）
    const withF = intensityToAmplitude(reflections);
    const meanI = reflections.reduce((a,r)=>a+r.I,0)/reflections.length;
    const meanF2 = withF.reduce((a,r)=>a+r.F*r.F,0)/withF.length;
    const { reflections: withE, meanF2: meanF2Used } = computeE(withF);

    // サマリ
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

    // 進捗バーを完了状態へ
    setProgress(100, `${file.name} の読み込みと解析が完了`);
  } catch (err) {
    summaryEl.textContent = "❌ エラー発生";
    log("例外：" + (err?.message || err), "error");
    setProgress(0, "エラー");
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

// --- ★コア：Chunk 読み + 逐次パース + 進捗 --- //
async function parseFileWithProgress(file, chunkSize = 128 * 1024) { // 128KB/chunk
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const reflections = [];
  let skipped = 0;
  let offset = 0;
  let leftover = "";  // チャンクを跨ぐ未完の行を保持
  const formatStats = { "whitespace": 0, "fixed-width": 0 };

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const blob = file.slice(offset, end);
    const buf = await blob.arrayBuffer();
    const text = decoder.decode(buf, { stream: true });

    // 未完行 + 今回チャンク
    const chunkText = leftover + text;
    // 行に分割（最後の要素は未完かもしれない）
    const lines = chunkText.split(/\r?\n/);
    leftover = lines.pop() || ""; // 最後は次チャンクへ

    for (const raw of lines) {
      const res = parseHKL_line_auto(raw);
      if (res.ok) {
        reflections.push(res.rec);
        if (res.format) formatStats[res.format] = (formatStats[res.format] || 0) + 1;
      } else {
        // コメントや空行、パース不能行をスキップ
        skipped++;
      }
    }

    offset = end;
    const pct = (offset / file.size) * 100;
    setProgress(pct, `読み込み中… ${Math.round(pct)}% （${offset}/${file.size} bytes）`);
    // UI レスポンス向上のため小休止（大容量時に有効）
    await microYield();
  }

  // 最終チャンクの leftover 行を処理
  if (leftover.trim()) {
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
