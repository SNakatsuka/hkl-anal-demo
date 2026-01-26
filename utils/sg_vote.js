// utils/sg_vote.js
// 複数 feature による空間群候補スコアの「投票（内訳付き）」モジュール
// - 重みは localStorage から取得（UI 未設定時は既定値）
// - 各候補 { name } に対して { total, breakdown[] } を返す

export const DEFAULT_WEIGHTS = {
  base: 0.20,
  center: 0.80,   // centeringWeight に掛ける係数
  glide: 1.20,    // glideWeight に掛ける係数
  screw: 0.50,    // screwWeight に掛ける係数
  eStat: 0.20,    // E統計が有効な時の固定加点
  priorZ: 1.00,   // meanZ 由来の加点をそのまま通す係数
  temp: 1.00,     // 温度寄与をそのまま通す係数
  zprime: 1.00,   // Z' 寄与をそのまま通す係数
  micro_glide: { c:0.10, a:0.08, n:0.06, d:0.04 },
  micro_screw21: 0.08
};

export function getVotingWeights() {
  try {
    const raw = localStorage.getItem("sg_vote_weights");
    if (!raw) return DEFAULT_WEIGHTS;
    const obj = JSON.parse(raw);
    return { ...DEFAULT_WEIGHTS, ...obj, micro_glide: { ...DEFAULT_WEIGHTS.micro_glide, ...(obj?.micro_glide||{}) } };
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

// -------- Feature weights (同値関数はここに一本化) --------
function centeringWeight(ext) {
  if (!ext || !ext.best) return 0;
  const best = ext.best;
  if (typeof best.ratio !== "number") return 0;
  if (best.type === "P(?)") return 0;
  const r = Math.min(best.ratio, 1.0);
  return Math.max(0, (0.8 - Math.min(r, 0.8)) / 0.8);
}

function glideWeight(glide) {
  if (!glide) return 0;
  const forb = glide?.ranked?.[0]?.forbRate;
  if (typeof forb !== "number") return 0;
  if (forb <= 0.05) return 1.0;
  if (forb <= 0.10) return 0.6;
  if (forb <= 0.20) return 0.3;
  return 0.0;
}

function screwWeight(screw) {
  if (!screw || typeof screw.score !== "number") return 0;
  if (screw.score >= 0.8) return 0.3;
  if (screw.score >= 0.5) return 0.15;
  return 0.0;
}

function temperatureWeight(T) {
  if (typeof T !== "number" || Number.isNaN(T)) return 0;
  if (T <= 120) return 0.05;
  if (T <= 200) return 0.03;
  return 0.0;
}
function zprimeWeight(zp) {
  if (typeof zp !== "number" || Number.isNaN(zp)) return 0;
  if (zp >= 3) return 0.10;
  if (zp >= 2) return 0.05;
  return 0.0;
}

function isCentricByE(eHist) {
  if (!eHist || typeof eHist.meanE2m1 !== "number") return null;
  const m = eHist.meanE2m1;
  const diffA = Math.abs(m - 0.736);
  const diffC = Math.abs(m - 0.968);
  if (Math.abs(diffA - diffC) < 0.02) return null;
  return diffC < diffA ? true : false;
}

// -------- コア：候補ごとのスコア内訳を作る --------
export function buildVotesForSeeds(seeds, features, weights = getVotingWeights()) {
  const { ext, eHist, screw, glide, priors = {} } = features;
  const centricFlag = isCentricByE(eHist);

  const wCenter = centeringWeight(ext);
  const wGlide  = glideWeight(glide);
  const wScrew  = screwWeight(screw);
  const wE      = (centricFlag !== null) ? weights.eStat : 0.0;

  // priors
  let wFormula = 0;
  const { meanZval, temperature, zprime } = priors;
  if (typeof meanZval === "number" && !Number.isNaN(meanZval)) {
    if (meanZval > 20) wFormula 
    if (meanZval < 10) wFormula 
  }
  const wTemp = temperatureWeight(temperature);
  const wZp   = zprimeWeight(zprime);

  const out = [];
  for (const name of seeds) {
    const breakdown = [];
    // base
    breakdown.push({ key:"base", value: weights.base });
    // center
    breakdown.push({ key:"centering", value: weights.center * wCenter });
    // glide（強い時だけ微加点）
    let glideSum = weights.glide * wGlide;
    if (wGlide > 0) {
      const gname = glide?.best?.name || "";
      if (gname.startsWith("c-glide") && /(^|\/)c(\/|$)/.test(name)) glideSum 
      if (gname.startsWith("a-glide") && /(^|\/)a(\/|$)/.test(name)) glideSum 
      if (gname.startsWith("n-glide") && /(^|\/)n(\/|$)/.test(name)) glideSum 
      if (gname.startsWith("d-glide") && /d/.test(name))             glideSum 
    }
    breakdown.push({ key:"glide", value: glideSum });
    // screw
    let screwSum = weights.screw * wScrew;
    if (wScrew > 0 && /21/.test(name)) screwSum 
    breakdown.push({ key:"screw21", value: screwSum });
    // E
    if (wE > 0) breakdown.push({ key:"Estats", value: wE });
    // priors
    if (wFormula) breakdown.push({ key:"priorZ", value: weights.priorZ * wFormula });
    if (wTemp)    breakdown.push({ key:"temp",   value: weights.temp   * wTemp    });
    if (wZp)      breakdown.push({ key:"zprime", value: weights.zprime * wZp      });

    const total = breakdown.reduce((a,b)=>a
    out.push({ name, total, breakdown, centricFlag });
  }
  return out;
}
