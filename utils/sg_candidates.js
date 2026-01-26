
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

// ---------- メイン ----------
export function buildSpaceGroupCandidates(ext, eHist, screw, glide, priors = {}) {
  if (!ext) return [];

  const lattice = pickLatticeLetter(ext.best);
  const centric = isCentricByE(eHist); // true|false|null

  // seeds を必ず用意
  const pool =
    (typeof COMMON_SG !== "undefined" && (COMMON_SG[lattice] || COMMON_SG.P)) ||
    { centric: [], acentric: [] };

  let seeds = [];
  if (Array.isArray(pool.centric) && Array.isArray(pool.acentric)) {
    if (centric === true)       seeds = [...pool.centric];
    else if (centric === false) seeds = [...pool.acentric];
    else                        seeds = [...pool.centric, ...pool.acentric];
  }
  // 結晶系で許されない格子種はここで除外（候補名の先頭文字＝格子種前提）
  const { crystalSystem } = priors || {};
  if (crystalSystem) {
    const allowed = SYSTEM_TO_LATTICE[crystalSystem] || [];
    seeds = seeds.filter(name => allowed.some(L => name.startsWith(L)));
  }
  if (seeds.length === 0) return [];

  // 投票器でスコアと内訳を算出
  const votes = buildVotesForSeeds(seeds, { ext, eHist, screw, glide, priors }, getVotingWeights());
  let rows = votes.map(v => ({
    name: v.name,
    score: v.total,
    breakdown: v.breakdown,
    lattice,
    centric: (centric === null ? "unknown" : (centric ? "centric" : "acentric"))
  }));

  // 重複排除 & スコア降順で上位8件
  const unique = new Map(rows.map(r => [r.name, r]));
  const out = [...unique.values()].sort((a,b) => b.score - a.score);
  return out.slice(0, 8);
}
