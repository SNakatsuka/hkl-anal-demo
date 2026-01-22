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
  log(`読み込み開始: ${file.name} (${file.size} bytes)`);

  const text = await file.text();
  const { reflections, skipped } = parseHKL_auto(text);
  log(`パース完了: 反射 ${reflections.length} 件（スキップ ${skipped} 行）`);

  if (reflections.length === 0) {
    summaryEl.textContent = '有効な反射がありません。フォーマットを確認してください。';
    btnE.disabled = true; btnF.disabled = true; return;
  }

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

function log(msg) {
  const t = new Date().toLocaleTimeString();
  logEl.textContent += `[${t}] ${msg}\n`;
}
