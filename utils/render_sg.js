
// utils/render_sg.js

// 推奨：renderSG(container, candidates, { ext, eHist, screw, glide })
// 後方互換：renderSG(container, ext, eStats/eHist) でも動作する

export function renderSG(container, arg2, arg3) {
  // ---------- フォールバック検出 ----------
  // パターンA（推奨）：arg2 = candidates(Array), arg3 = context(Object)
  // パターンB（旧式） ：arg2 = ext(Object), arg3 = eStats/eHist(Object)
  let candidates = [];
  let context = {};

  const isArray = Array.isArray(arg2);
  if (isArray) {
    candidates = arg2;
    context = arg3 || {};
  } else {
    // 旧式呼び出し：renderSG(container, ext, eStats/eHist)
    const ext = arg2;
    const eStatsOrEHist = arg3;
    if (!ext || !eStatsOrEHist) {
      container.textContent = "未計算";
      return;
    }
    const lattice = ext.best?.type || "P";
    // eStats/language に依存していた「centro推定」を E分布から復元
    const isCentric = inferCentricFromStatsOrHist(eStatsOrEHist);
    const names = suggestSG(lattice, isCentric);
    candidates = names.map(name => ({
      name,
      score: 1.0,          // 簡易スコア（旧互換のため定数）
      lattice,
      centric: !!isCentric
    }));
    context = { ext, eHist: normalizeToEHist(eStatsOrEHist) };
  }

  // ---------- 描画 ----------
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.padding = "8px";
  wrap.style.background = "#0b1220";
  wrap.style.border = "1px solid #122036";
  wrap.style.borderRadius = "8px";

  const h = document.createElement("div");
  h.innerHTML = `<b>空間群候補ランキング（簡易）</b>`;
  h.style.marginBottom = "6px";
  wrap.appendChild(h);

  if (!candidates || candidates.length === 0) {
    const p = document.createElement("div");
    p.style.color = "#9ca3af";
    p.textContent = "候補を生成できませんでした（データ不足）";
    wrap.appendChild(p);
    container.appendChild(wrap);
    return;
  }

  const top = candidates[0];
  const meta = document.createElement("div");
  meta.style.color = "#cfe";
  meta.style.marginBottom = "8px";
  meta.innerHTML = `
    格子心: <b>${top.lattice || "-"}</b><br>
    セントロ性: <b>${top.centric ? "centro" : "acentro"}</b>
  `;
  wrap.appendChild(meta);

  const list = document.createElement("div");
  list.style.color = "#cfe";
  list.innerHTML = candidates
    .map(c => `<b>${c.name}</b> <span style="color:#9ca3af">(score=${toFixedSafe(c.score,2)})</span>`)
    .join("<br>");
  wrap.appendChild(list);

  // 参考情報（コンテキスト）を下に小さく出す
  if (context?.ext || context?.eHist || context?.screw || context?.glide) {
    const hint = document.createElement("div");
    hint.style.color = "#9ca3af";
    hint.style.fontSize = "0.9em";
    hint.style.marginTop = "8px";
    hint.innerHTML = `
      <span>※ 判定根拠:
        centering=${context.ext?.best?.type ?? "-"}
        / glide=${context.glide?.best?.name ?? "-"}
        / screw=${context.screw?.call ?? "-"}
        / ⟨|E²−1|⟩=${toFixedSafe(context.eHist?.meanE2m1, 3) ?? "-"}
      </span>
    `;
    wrap.appendChild(hint);
  }

  container.appendChild(wrap);
}

// ---------- 旧ロジックの補助関数（互換維持） ----------
function inferCentricFromStatsOrHist(obj) {
  // eStats でも eHist でも、最終的に "centric らしさ" を返す
  // eStats: { likely: "centric（セントロ）" | "acentric（非セントロ）" ... }
  // eHist : { meanE2m1 } -> 0.968 に近ければ centric, 0.736 に近ければ acentric
  if (!obj) return null;

  if (typeof obj.meanE2m1 === "number") {
    const m = obj.meanE2m1;
    const diffA = Math.abs(m - 0.736);
    const diffC = Math.abs(m - 0.968);
    return diffC < diffA;
  }
  if (typeof obj.likely === "string") {
    return obj.likely.toLowerCase().includes("centric");
  }
  return null;
}

function normalizeToEHist(obj) {
  // eStats / eHist どちらでも meanE2m1 を返せるように薄く正規化
  if (!obj) return null;
  if (typeof obj.meanE2m1 === "number") return obj;
  // eStats からは meanE2m1 が取れない場合もあるので null に
  return null;
}

function toFixedSafe(x, nd=2) {
  return (typeof x === "number" && isFinite(x)) ? x.toFixed(nd) : null;
}

// ---------- 旧 suggestSG（あなたのリストを尊重して互換維持） ----------
function suggestSG(lattice, centro) {
  if (lattice === "I") {
    return centro
      ? ["Immm", "Ibam", "I2/m", "I-4", "I4/m"]
      : ["I222", "I212121", "I4", "I41"];
  }
  if (lattice === "C") {
    return centro
      ? ["C2/m", "Cmmm", "Ccca"]
      : ["C2221", "Cmc21"];
  }
  if (lattice === "F") {
    return centro
      ? ["Fm-3m", "Fd-3m"]
      : ["F222", "Fdd2"];
  }
  // P / R(hex) などまとめて P として fallback
  return centro
    ? ["P-1", "P2/m", "Pmmm"]
    : ["P1", "P212121", "Pna21"];
}
