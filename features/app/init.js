// features/app/init.js
import { createLogger } from '../../services/log.js';
import { createProgress } from '../../services/progress.js';
import { getExperimentParams } from '../../services/params.js';
import { getPriors } from '../../services/priors.js';
import { bindDownloads } from '../../services/downloads.js';
import { parseFileWithProgress } from '../../services/parseFileWithProgress.js';
import { processHKL } from '../pipeline/processHKL.js';

export function initApp() {
  // --- DOM 参照 ---
  const fileInput       = document.getElementById('fileInput');
  const summaryEl       = document.getElementById('summary');
  const logEl           = document.getElementById('log');
  const btnE            = document.getElementById('downloadEcsv');
  const btnF            = document.getElementById('downloadFcsv');
  const wilsonContainer = document.getElementById('wilsonContainer');
  const eHistContainer  = document.getElementById('eHistContainer');
  const extContainer    = document.getElementById('extContainer');
  const sgContainer     = document.getElementById('sgContainer');

  const progress = createProgress(
    document.getElementById('progress'),
    document.getElementById('progressPct'),
    document.getElementById('progressInfo')
  );
  const log = createLogger(logEl);

  // 状態（ダウンロード用）
  let lastE = null;
  let lastF = null;
  // 状態（SG再計算用）
  let lastSGFeatures = null; // { ext, eHist, screw, glide, priors }

  // クリック：ダウンロード
  bindDownloads(btnE, btnF, () => lastE, () => lastF);

  // ファイル選択
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // UI リセット＆進捗リセット
    summaryEl.textContent = '🕒 読み込み中...';
    btnE.disabled = true; btnF.disabled = true;
    progress.resetFor(file);
    log(`読み込み開始: ${file.name}`);

    try {
      // 1) ファイル → 反射配列（進捗コールバック込み）
      const { reflections, skipped, formatStats, dominantFormat } =
        await parseFileWithProgress(file, (pct, info) => {
          progress.set(pct, info);
        });

      if (reflections.length === 0) {
        summaryEl.textContent = "❌ パース失敗：有効な HKL 行がありません。";
        log("パース失敗：0 反射", "error");
        return;
      }

      // 2-1) 実験パラメータの取得
      const params = getExperimentParams();

      // 2-2) 組成 → meanZ → priors」処理
      const priors = getPriors();

      // 3) 解析パイプライン（Wilson, E分布, extinction, screw, glide, SG候補）
      const result = processHKL({
        reflections,
        skipped, formatStats, dominantFormat,
        params, priors,
        wilsonContainer,
        eHistContainer,
        extContainer,
        sgContainer,
        log
      });

      // 4) ダウンロードデータの更新
      lastF = result.lastF;
      lastE = result.lastE;
      lastSGFeatures = result.sgFeatures ?? null;
      btnF.disabled = false; btnE.disabled = false;

      // 5) 完了
      progress.set(100, `${file.name} の読み込みと解析が完了`);
      log(`完了: 反射 ${result.count} 件（主形式: ${dominantFormat}）`, "success");
    } catch (err) {
      summaryEl.textContent = "❌ エラー発生";
      log("例外：" + (err?.message || err), "error");
      progress.set(0, "エラー");
    }
  });
  // 投票重み変更 → SG 候補の再計算・再描画
  document.addEventListener('sg-weights-changed', async () => {
    if (!lastSGFeatures) return;
    try {
      const { rebuildSG } = await import('../pipeline/rebuildSG.js');
      rebuildSG(lastSGFeatures, sgContainer, log);
    } catch (err) {
      log("SG 再計算エラー：" + err, "error");
    }
  });
}
