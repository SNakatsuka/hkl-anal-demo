// utils/sg_candidates.js
//
// 空間群候補ランキング（格子心 × セントロ性）
// ext: analyzeExtinction() の戻り値
// eHist: buildEHistogram() の戻り値
// features: { centering, eHist, screw, glide }
// から 空間群候補リストをスコアリング

function pickLatticeLetter(centeringBest) {
  const t = centeringBest?.type || "P";
  if (t.startsWith("R")) return "R";
  if (["A","B","C","I","F","P"].includes(t)) return t;
  return "P";
}

function isCentricByE(eHist) {
  if (!eHist) return null;
  // ⟨|E²-1|⟩ が 0.968 に近ければ centric、0.736 に近ければ acentric
  const m = eHist.meanE2m1;
  const diffA = Math.abs(m - 0.736);
  const diffC = Math.abs(m - 0.968);
  return diffC < diffA; // true → centric
}

// “よく出る”小分子の代表空間群を lattice/centric別に用意（簡易）
const COMMON_SG = {
  P: {
    centric:  ["P-1", "P2_1/c", "Pbca", "Pnma"],
    acentric: ["P2_1", "P2_12_12_1", "Pna2_1", "Pca2_1"]
  },
  C: {
    centric:  ["C2/c", "Ccca"],
    acentric: ["Cc", "C2"]
  },
  I: {
    centric:  ["Imma", "Ibam"],
    acentric: ["I2", "Iba2"]
  },
  F: {
    centric:  ["Fm-3m", "Fd-3m"],   // F は立方に多いが参考として
    acentric: ["Fdd2", "F222"]
  },
  R: {
    centric:  ["R-3c", "R-3"],
    acentric: ["R3c", "R3"]
  }
};

// glide/screw のヒントをスコアに反映
function bonusFromScrew(screw) {
  if (!screw) return 0;
  return screw.score ? 0.25 : 0;
}
function bonusFromGlide(glide) {
  if (!glide || !glide.best) return 0;
  // c-glide@h0l → monoclinic unique b の /c を強く示唆（P21/c, C2/c）
  const name = glide.best.name || "";
  if (name.startsWith("c-glide")) return 0.35;
  if (name.startsWith("a-glide")) return 0.25; // P21/a 等
  if (name.startsWith("n-glide")) return 0.2;  // P21/n 等
  if (name.startsWith("d-glide")) return 0.15; // diamond
  return 0;
}

export function buildSpaceGroupCandidates(ext, eHist, screw = null, glide = null) {
  if (!ext) return [];

  const lattice = pickLatticeLetter(ext.best);
  const centric = isCentricByE(eHist); // true/false/null

  // 候補の取り出し
  const pool = COMMON_SG[lattice] || COMMON_SG["P"];
  let seeds = [];
  if (centric === true)  seeds = pool.centric;
  else if (centric === false) seeds = pool.acentric;
  else seeds = [...pool.centric, ...pool.acentric];

  // ベーススコア：格子心の forbidden/allow 比（小さいほど加点）
  const baseRatio = ext.best?.ratio ?? 1.0;
  const baseScore = Math.max(0, 1.2 - Math.min(baseRatio, 1.2)); // ~[0..1.2]→[1.2..0]

  const sBonus = bonusFromScrew(screw);
  const gBonus = bonusFromGlide(glide);
  const eBonus = (centric !== null) ? 0.2 : 0;  // E統計が判定できたら少し加点

  // モデル：候補それぞれに小さな追加補正（glide名が一致するものをより加点）
  const rows = seeds.map(name => {
    let sgScore = baseScore + sBonus + gBonus + eBonus;

    if (glide?.best?.name?.startsWith("c-glide") && /\/c|c$/.test(name)) sgScore += 0.15;
    if (glide?.best?.name?.startsWith("a-glide") && /\/a|a$/.test(name)) sgScore += 0.12;
    if (glide?.best?.name?.startsWith("n-glide") && /\/n|n$/.test(name)) sgScore += 0.10;

    if (screw?.score && /21/.test(name)) sgScore += 0.12; // 21 を含む候補を後押し
    return { name, score: sgScore, lattice, centric: !!centric };
  });

  // 重複排除＆ソート
  const unique = new Map();
  for (const r of rows) {
    unique.set(r.name, r);
  }
  const out = [...unique.values()].sort((a,b)=> b.score - a.score);
  return out.slice(0, 8); // 上位8件
}
