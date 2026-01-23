
// utils/sg_candidates.js
//
// 空間群候補ランキング（格子心 × セントロ性）
// ext: analyzeExtinction() の戻り値
// eHist: buildEHistogram() の戻り値
// screw: analyzeScrew_0k0() の戻り値
// glide: analyzeGlide_h0l() の戻り値
//
// 方針：
//  - centering は「有意差があるときのみ」弱めに加点（僅差は未確定扱い）
//  - glide は「禁制率が十分低いときだけ」強く加点（弱い時は 0）
//  - screw は 2₁ の強証拠があるときのみ少し加点
//  - E統計（centric/acentric 判定）は微加点
//  - 最終候補は重複排除後にスコア降順で上位8件

function pickLatticeLetter(centeringBest) {
  const t = centeringBest?.type || "P";
  if (t.startsWith("R")) return "R";
  if (["A", "B", "C", "I", "F", "P"].includes(t)) return t;
  return "P";
}

function isCentricByE(eHist) {
  if (!eHist || typeof eHist.meanE2m1 !== "number") return null;
  // ⟨|E²-1|⟩ が 0.968 に近ければ centric、0.736 に近ければ acentric
  const m = eHist.meanE2m1;
  const diffA = Math.abs(m - 0.736);
  const diffC = Math.abs(m - 0.968);
  return diffC < diffA; // true → centric
}

// “よく出る”小分子の代表空間群を lattice/centric 別に用意（簡易）
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
    centric:  ["Fm-3m", "Fd-3m"],   // 参考：F は立方に多い
    acentric: ["Fdd2", "F222"]
  },
  R: {
    centric:  ["R-3c", "R-3"],
    acentric: ["R3c", "R3"]
  }
};

// ---------- 重み付け ----------

// centering：未確定（P(?)）や ratio が高いときは 0、0.8→1.0で線形に 0 へ
function centeringWeight(ext) {
  if (!ext || !ext.best) return 0;
  const best = ext.best;
  if (typeof best.ratio !== "number") return 0;
  if (best.type.startsWith("P")) return 0; // 未確定
  const r = Math.min(best.ratio, 1.0);
  const w = Math.max(0, (0.8 - Math.min(r, 0.8)) / 0.8);
  return w; // 最大でも 1 未満
}

// glide：禁制率が小さいほど強い（<=5%：強、<=10%：中、<=20%：弱、>20%：無視）
function glideWeight(glide) {
  if (!glide || !glide.best) return 0;
  const forb = glide.ranked?.[0]?.forbRate ?? 1;
  if (forb <= 0.05) return 1.0; // 強
  if (forb <= 0.10) return 0.6; // 中
  if (forb <= 0.20) return 0.3; // 弱
  return 0.0; // 無視
}

// screw：2₁ が強いときだけ少し加点
function screwWeight(screw) {
  if (!screw) return 0;
  return screw.score ? 0.3 : 0.0;
}

// ---------- メイン ----------

export function buildSpaceGroupCandidates(ext, eHist, screw = null, glide = null) {
  if (!ext) return [];

  const lattice = pickLatticeLetter(ext.best);
  const centric = isCentricByE(eHist);

  const pool = COMMON_SG[lattice] || COMMON_SG.P;
  let seeds = [];
  if (centric === true)       seeds = pool.centric;
  else if (centric === false) seeds = pool.acentric;
  else                        seeds = [...pool.centric, ...pool.acentric];

  // 新しい重み付け
  const wCenter = centeringWeight(ext);  // 僅差や ratio 高は 0 近く
  const wGlide  = glideWeight(glide);    // 強いときだけ 1.0〜
  const wScrew  = screwWeight(screw);
  const wE      = (centric !== null) ? 0.2 : 0.0; // E統計が使えたかで微加点

  // ベーススコアを極小に（過剰誘導を避ける）
  const base = 0.2;

  const rows = seeds.map(name => {
    let s = base + 0.8 * wCenter + 1.2 * wGlide + 0.5 * wScrew + wE;

    // glide 名と候補名の後押し（glideが強い場合のみ微加点）
    if (wGlide > 0 && glide?.best?.name) {
      const g = glide.best.name;
      if (g.startsWith("c-glide") && /\bc\b/.test(name)) s += 0.10;
      if (g.startsWith("a-glide") && /\/a|a$/.test(name)) s += 0.08;
      if (g.startsWith("n-glide") && /\/n|n$/.test(name)) s += 0.06;
      if (g.startsWith("d-glide") && /d$/.test(name))     s += 0.04;
    }

    // screw が強い時は 21 を含む候補へ微加点
    if (wScrew > 0 && /21/.test(name)) s += 0.08;

    return { name, score: s, lattice, centric: !!centric };
  });

  // 重複排除 & スコア降順で上位8件
  const unique = new Map(rows.map(r => [r.name, r]));
  const out = [...unique.values()].sort((a,b) => b.score - a.score);
  return out.slice(0, 8);
}
