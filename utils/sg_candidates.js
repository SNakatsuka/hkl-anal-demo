
// utils/sg_candidates.js

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
  if (Math.abs(diffA - diffC) < 0.02) return null; // きわどい時は保留
  return diffC < diffA ? true : false; // true → centric
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
  const centricFlag = isCentricByE(eHist); // true|false|null

  const pool = COMMON_SG[lattice] || COMMON_SG.P;
  let seeds = [];
  if (centricFlag === true)       seeds = pool.centric;
  else if (centricFlag === false) seeds = pool.acentric;
  else                            seeds = [...pool.centric, ...pool.acentric];

  // 重み
  const wCenter = centeringWeight(ext);
  const wGlide  = glideWeight(glide);
  const wScrew  = screwWeight(screw);
  const wE      = (centricFlag !== null) ? 0.2 : 0.0;

  // ベーススコア（過剰誘導を避ける）
  const base = 0.2;

  let rows = seeds.map(name => {
    let s = base + 0.8 * wCenter + 1.2 * wGlide + 0.5 * wScrew + wE;

    // glide が強い場合のみ候補名の「/a, /c, /n, d など」を微後押し
    if (wGlide > 0) {
      const gname = glide?.best?.name || "";
      // /( ^|\/ )c( \/|$ )/ で "c" グライドの部位にマッチ
      if (gname.startsWith("c-glide") && /(^|\/)c(\/|$)/.test(name)) s += 0.10;
      if (gname.startsWith("a-glide") && /(^|\/)a(\/|$)/.test(name)) s += 0.08;
      if (gname.startsWith("n-glide") && /(^|\/)n(\/|$)/.test(name)) s += 0.06;
      // d-glide: Fdd2 など中間にも現れるので全体検索
      if (gname.startsWith("d-glide") && /d/.test(name)) s += 0.04;
    }

    // screw が強い時は 21 を含む候補へ微加点
    if (wScrew > 0 && /21/.test(name)) s += 0.08;

    return { name, score: s, lattice, centricState: centricFlag === null ? "unknown" : (centricFlag ? "centric" : "acentric") };
  });

  const { formulaObj, meanZval, temperature, zprime, crystalSystem } = priors;

  let wFormula = 0;
  if (typeof meanZval === "number") {
    if (meanZval > 20) wFormula += 0.2;  // 重元素 → centric 寄り
    if (meanZval < 10) wFormula += 0.1;  // 有機物 → P21/c, P-1 が多い
  } else {
    // 将来: formulaObj から平均Zを推定して wFormula を与える余地あり
  }

  const wTemp = temperatureWeight(temperature);
  const wZp   = zprimeWeight(zprime);

  // 結晶系の強制（SYSTEM_TO_LATTICE 準拠）
  if (crystalSystem) {
    const allowed = SYSTEM_TO_LATTICE[crystalSystem] || [];
    rows = rows.filter(r => allowed.some(L => r.name.startsWith(L)));
  }

  // 最終スコア加算
  rows.forEach(r => {
    r.score += wFormula + wTemp + wZp;
  });

  // 重複排除 & スコア降順で上位8件
  const unique = new Map(rows.map(r => [r.name, r]));
  const out = [...unique.values()].sort((a, b) => b.score - a.score);
  return out.slice(0, 8);
}
