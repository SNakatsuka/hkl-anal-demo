// utils/sg_candidates.js
//
// 空間群候補ランキング（格子心 × セントロ性）
// ext: analyzeExtinction() の戻り値
// eHist: buildEHistogram() の戻り値

export function buildSpaceGroupCandidates(ext, eHist) {
  if (!ext || !eHist) return [];

  // 1) 格子心（ext.scores は ratio の小さい順）
  const bestLattice = ext.best.type; // "I", "C", "F", "P"

  // 2) セントロ性
  const isCentric = (eHist.likely.includes("centro"));  
  // 例: "acentric（非セントロ）" → false  
  //     "centric（セントロ）"     → true

  // 3) 空間群候補辞書
  const SG = {
    P: {
      ac: ["P1", "P2", "P21", "P212121"],
      ce: ["P-1", "P2/m", "Pmmm"]
    },
    C: {
      ac: ["C2", "Cc", "C2221"],
      ce: ["C2/m", "Cmmm", "Cmcm"]
    },
    I: {
      ac: ["I2", "I222", "I212121"],
      ce: ["I2/m", "Immm", "I4/m"]
    },
    F: {
      ac: ["F222"],
      ce: ["Fmmm", "Fddd"]
    }
  };

  const key = bestLattice;
  const list = isCentric ? SG[key].ce : SG[key].ac;

  // 4) スコア付け（単純：extinction ratio をそのまま利用）
  const ratio = ext.best.ratio;
  const baseScore = 1.0 / Math.max(ratio, 1e-6);  // ratio が小さいほど強くする

  // 5) SGをスコア化して返す
  return list.map((name, i) => ({
    name,
    score: baseScore - i * 0.1,   //リスト内の前後で微調整
    lattice: key,
    centric: isCentric,
    ratio
  }));
}
