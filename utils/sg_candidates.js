
// utils/sg_candidates.js
import { buildVotesForSeeds, getVotingWeights } from './sg_vote.js';

function pickLatticeLetter(centeringBest) {
  const t = centeringBest?.type || "P";
  if (t.startsWith("R")) return "R";
  if (["A", "B", "C", "I", "F", "P"].includes(t)) return t;
  return "P";
}

function isCentricByE(eHist) {
  if (!eHist || typeof eHist.meanE2m1 !== "number") return null;
  // ⟨|E²-1|⟩: acentric ≈ 0.736, centric ≈ 0.968
  const m = eHist.meanE2m1;
  const diffA = Math.abs(m - 0.736);
  const diffC = Math.abs(m - 0.968);
  if (Math.abs(diffA - diffC) < 0.02) return null;
  return diffC < diffA ? true : false;
}

// “よく出る”小分子の代表空間群（簡易）
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
    centric:  ["Fm-3m", "Fd-3m"],
    acentric: ["Fdd2", "F222"]
  },
  R: {
    centric:  ["R-3c", "R-3"],
    acentric: ["R3c", "R3"]
  }
};

const SYSTEM_TO_LATTICE = {
  triclinic:   ["P"],
  monoclinic:  ["P", "C"],
  orthorhombic:["P", "C", "I", "F"],
  tetragonal:  ["P", "I"],
  trigonal:    ["R"],
  hexagonal:   ["P"],
  cubic:       ["P", "I", "F"]
};

// ---------- 重み付け ----------

// centering：未確定（P(?)）や ratio 高（拮抗）は 0、0.8→1.0 は 0 に潰す
// ここでの ratio は「best と次点のスコア比が大きいほど優位性が高い」前提
function centeringWeight(ext) {
  if (!ext || !ext.best) return 0;
  const best = ext.best;
  if (typeof best.ratio !== "number") return 0;
  if (best.type === "P(?)") return 0; // 未確定
  const r = Math.min(best.ratio, 1.0);
  const w = Math.max(0, (0.8 - Math.min(r, 0.8)) / 0.8);
  return w; // 最大でも 1 未満
}

// glide：禁制率が小さいほど強い（<=5%：強、<=10%：中、<=20%：弱、>20%：無視）
function glideWeight(glide) {
  if (!glide) return 0;
  const forb = glide?.ranked?.[0]?.forbRate;
  if (typeof forb !== "number") return 0;
  if (forb <= 0.05) return 1.0; // 強
  if (forb <= 0.10) return 0.6; // 中
  if (forb <= 0.20) return 0.3; // 弱
  return 0.0; // 無視
}

// screw：2₁ が強いときだけ少し加点（score が連続ならスケールしても良い）
function screwWeight(screw) {
  if (!screw || typeof screw.score !== "number") return 0;
  return screw.score >= 0.8 ? 0.3 : screw.score >= 0.5 ? 0.15 : 0.0;
}

// 先験：温度（暫定）
function temperatureWeight(T) {
  if (typeof T !== "number") return 0;
  // 極低温ほど秩序度↑で acentric 有利という仮説をごく小さく反映
  if (T <= 120) return 0.05;
  if (T <= 200) return 0.03;
  return 0.0;
}

// 先験：Z′（暫定）
function zprimeWeight(zp) {
  if (typeof zp !== "number") return 0;
  if (zp >= 3) return 0.10; // かなり低対称性を示唆
  if (zp >= 2) return 0.05;
  return 0.0;
}

// ---------- メイン ----------
export function buildSpaceGroupCandidates(ext, eHist, screw, glide, priors = {}) {
  if (!ext) return [];

  const lattice = pickLatticeLetter(ext.best);
  const centric = isCentricByE(eHist); // true|false|null

  const votes = buildVotesForSeeds(seeds, { ext, eHist, screw, glide, priors }, getVotingWeights());
  let rows = votes.map(v => ({
    name: v.name,
    score: v.total,
    breakdown: v.breakdown,
    lattice,
    centric: (centric === null ? "unknown" : (centric ? "centric" : "acentric"))
  }));

  const { formulaObj, meanZval, temperature, zprime, crystalSystem } = priors;

  if (typeof meanZval === "number") {
  } else {
    // 将来: formulaObj から平均Zを推定して wFormula を与える余地あり
  }
  
   // 結晶系の強制
   if (crystalSystem) {
     const allowed = SYSTEM_TO_LATTICE[crystalSystem] || [];
     rows = rows.filter(r => allowed.some(L => r.name.startsWith(L)));
   }  

   // 重複排除 & スコア降順で上位8件
   const unique = new Map(rows.map(r => [r.name, r]));
   const out = [...unique.values()].sort((a,b) => b.score - a.score);
   return out.slice(0, 8);
}
