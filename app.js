import { parseHKL_auto, intensityToAmplitude, toCSV } from './utils/hkl.js';
import { computeE } from './utils/e_normalize.js';

const fileInput = document.getElementById('fileInput');
const summaryEl = document.getElementById('summary');
const logEl = document.getElementById('log');
const btnE = document.getElementById('downloadEcsv');
const btnF = document.getElementById('downloadFcsv');

let lastE = null;
let lastF = null;

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  log(`ファイル読み込み開始: ${file.name}`, "info");
  summaryEl.textContent = "解析中…";

  try {
    const text = await file.text();

    const { reflections, skipped, format } = parseHKL_auto_withFormat(text);

    if (reflections.length === 0) {
      summaryEl.textContent = "❌ パース失敗：有効な HKL 行がありません。";
      log("解析に失敗：ファイル形式を確認してください。", "error");
      btnE.disabled = true; btnF.disabled = true;
      return;
    }

  // 成功表示
  summaryEl.innerHTML = `
    <b>✔ パース成功</b><br>
    データ数: ${reflections.length}<br>
    判定形式: <b>${format}</b><br>
    スキップ行: ${skipped}
  `;
  log(`パース成功：${reflections.length} 反射（形式: ${format}）`, "success");

  // |F| 計算
  const withF = intensityToAmplitude(reflections);
  const meanI = reflections.reduce((a,r)=>a+r.I,0)/reflections.length;
  const meanF2 = withF.reduce((a,r)=>a+r.F*r.F,0)/withF.length;

  // E 正規化（簡易）
  const { reflections: withE, meanF2: meanF2Used } = computeE(withF);

  // 概要
  summaryEl.innerHTML = `
    <ul>
      <li>反射数: <b>${withE.length}</b></li>
      <li>&lt;I&gt;（単純平均）: <b>${meanI.toFixed(3)}</b></li>
      <li>&lt;F²&gt;（単純平均）: <b>${meanF2.toFixed(3)}</b>（E 正規化で使用: ${meanF2Used.toFixed(3)}）</li>
      <li>注意: 今は分解能シェル/吸収/消衰/異常散乱を考慮していません（MVP）。</li>
    </ul>
  `;

  // ダウンロード用バッファ
  lastF = withF.map(r => ({ h:r.h, k:r.k, l:r.l, F:r.F.toFixed(6) }));
  lastE = withE.map(r => ({ h:r.h, k:r.k, l:r.l, E:r.E.toFixed(6) }));

  btnF.disabled = false; btnE.disabled = false;
  log('準備完了。CSV をダウンロードできます。');
  }
  catch (err) {
    summaryEl.textContent = "❌ エラー発生";
    log("例外：" + err.message, "error");
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

function log(msg, type="info") {
  const t = new Date().toLocaleTimeString();
  const color = {
    "info": "#93c5fd",
    "success": "#86efac",
    "error": "#fca5a5",
    "warn": "#fde047"
  }[type] || "#e2e8f0";

  logEl.innerHTML += `<span style="color:${color}">[${t}] ${msg}</span><br>`;
  logEl.scrollTop = logEl.scrollHeight;
}
