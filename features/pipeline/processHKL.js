// features/pipeline/processHKL.js
import { intensityToAmplitude, toCSV } from '../../utils/hkl.js';
import { computeE } from '../../utils/e_normalize.js';
import { eStats } from '../../utils/stats.js';
import { buildWilsonProxy, renderWilsonProxySVG, linearRegressionXY } from '../../utils/wilson_proxy.js';
import { buildEHistogram, renderEHistogramSVG } from '../../utils/e_histogram.js';
import { analyzeExtinction } from '../../utils/extinction.js';
import { renderExtinction } from "../../utils/render_ext.js";
import { renderSG } from "../../utils/render_sg.js";
import { buildSpaceGroupCandidates } from '../../utils/sg_candidates.js';
import { buildPresentMaskE, buildPresentMaskI } from '../../utils/presence.js';
import { analyzeScrew_0k0 } from '../../utils/screw.js';
import { analyzeGlide_h0l } from '../../utils/glide.js';
import { renderSummary } from '../../ui/summary.js';
import { renderScrewGlideReport } from '../../ui/reports.js';
// --- NEW20260130: 擬似分解能ビンによる再正規化 ---
import { buildPseudoResolutionBins } from '../../utils/pseudo_resolution.js';
import { renormalizeE_byBins } from '../../utils/e_normalize_bins.js';
// --- Patterson マップ生成（NEW20260131） ---
import { buildPattersonGrid } from '../../utils/patterson.js';
import { renderPattersonViewer } from '../../ui/patterson_viewer.js';
import { renderPattersonVolumeViewer } from '../../ui/patterson_volume_viewer.js';
import { processRho } from './processRho.js';

export function processHKL(ctx) {
  const {
    reflections, skipped, formatStats, dominantFormat, params, priors,
    wilsonContainer, eHistContainer, extContainer, sgContainer, log
  } = ctx;

  // --- |F| ---
  const withF = intensityToAmplitude(reflections);

  const meanI = reflections.reduce((a, r) => a + r.I, 0) / reflections.length;
  const meanF2_global = withF.reduce((a, r) => a + r.F * r.F, 0) / withF.length;

  // --- E 正規化 ---
  const ce   = computeE(withF);
  let withE = ce.reflections;

  // --- NEW20260130: 擬似分解能ビンによる再正規化 ---
  const bins = buildPseudoResolutionBins(withE, 20);
  const ce2  = renormalizeE_byBins(withE, bins);
  withE = ce2.reflections;
  
  log(`E 正規化: 分解能ビン使用 (nbin=20)`, "info");
  
  const pat = buildPattersonGrid(withF, { gridSize: 64 });
  const pat2d = {
    gridSize: pat.gridSize,
    data: pat.data.slice(0, pat.gridSize * pat.gridSize)
  };

  // 2D viewer は Z=0 のスライスだけ使う
  renderPattersonViewer(
    document.getElementById('pattersonContainer'),
    pat2d
  );
  
  log("Patterson マップ生成完了 (grid=64³)", "info");

  // 3D viewer（別の DOM に描画）
  renderPattersonVolumeViewer(
    document.getElementById("pattersonVolumeContainer"),
    pat
  );
    
  processRho({
    reflections,
    rhoContainer: document.getElementById("rhoVolumeContainer")
  });

  // --- サマリ描画 ---
  renderSummary({
    el: document.getElementById('summary'),
    counts: { n: withE.length, skipped, formatStats, dominantFormat },
    stats: { meanI, meanF2_global, meanF2_used: ce.meanF2 }
  });
  log(`パース成功：${withE.length} 反射（主形式: ${dominantFormat}）`, "success");

  // --- ダウンロード用に丸め ---
  const lastF = withF.map(r => ({ h: r.h, k: r.k, l: r.l, F: r.F.toFixed(6) }));
  const lastE = withE.map(r => ({ h: r.h, k: r.k, l: r.l, E: r.E.toFixed(6) }));

  // --- 実験パラメータ ログ ---
  if (!Number.isNaN(params.thetaMax)) {
    log(`実験パラメータ: λ=${params.lambda}, θ_max=${params.thetaMax}`, "info");
  }

  // --- Wilson-like + 回帰線 ---
  const { points } = buildWilsonProxy(withF, 10);
  const reg = linearRegressionXY(points);
  renderWilsonProxySVG(wilsonContainer, points, { width: 720, height: 320, regression: reg });
  if (reg) log(`Wilson-like 回帰線: slope=${reg.a.toFixed(4)}, intercept=${reg.b.toFixed(3)}`, "info");
  else     log("Wilson-like 回帰線: データ不足", "warn");

  // --- E ヒストグラム ---
  const eHist = buildEHistogram(withE, 20, { excludeLowest: 1 });
  renderEHistogramSVG(eHistContainer, eHist);
  if (eHist) log(`E分布: mean|E²−1|=${eHist.meanE2m1.toFixed(3)} → ${eHist.likely}`, "info");
  else       log("E分布: データ不足", "warn");

  // --- E 統計（簡易） ---
  const est = eStats(withE);
  if (est) {
    const { n, e1, e2, e3, e4, e2minus1_abs, likely } = est;
    const box = `
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
    document.getElementById('summary').insertAdjacentHTML('beforeend', box);
  }

  // --- present/absent 2値マスク（Eベース推奨） ---
  const presentMask = params.useEforExt ? buildPresentMaskE(withE, 0.6)
                                        : buildPresentMaskI(reflections);
  // --- Extinction / Lattice-centering ---
  extContainer.innerHTML = "";  

  // 低 R 側 20% のビンだけ使う 20260130追加
  const useBins = bins.slice(0, 4).flat(); // 20% なら 4/20
  const filteredMask = presentMask.filter((_, idx) => useBins.includes(idx));
    
  const ext = analyzeExtinction(withE, true, filteredMask, {
    crystalSystem: params.crystalSystem,
  });
  log(`Extinction: 使用ビン = 0–3 (${filteredMask.length} 反射)`, "info");
    
  if (ext) {
    renderExtinction(extContainer, ext);
    log(`Extinction 判定 (Eベース): 最有力 = ${ext.best.type}`, "info");
  } else {
    extContainer.textContent = "未計算（データ不足）";
    log("Extinction: データ不足", "warn");
  }
  
  // --- Screw（0k0 → 2₁@b） ---
  const screw = analyzeScrew_0k0(withE, presentMask, { minCount: 20 });

  // --- Glide（h0l → a/c/n/d） ---
  const glide = analyzeGlide_h0l(withE, presentMask, { minCount: 30 });

  // --- Screw/Glide レポート（extContainer の下にセクション作成） ---
  renderScrewGlideReport(extContainer, screw, glide);

  // --- 空間群候補ランキング ---
  const sgCandidates = buildSpaceGroupCandidates(
    ext, eHist, screw, glide, priors
  );
  renderSG(sgContainer, sgCandidates, { ext, eHist, screw, glide });
  if (sgCandidates?.length) log(`空間群候補: ${sgCandidates.map(c => c.name).join(", ")}`, "info");

  return {
    lastF,
    lastE,
    count: withE.length,
    sgFeatures: { ext, eHist, screw, glide, priors }
  };
}
