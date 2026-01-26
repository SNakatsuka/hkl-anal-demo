// ui/reports.js
export function renderScrewGlideReport(extContainer, screw, glide) {
  // extReport を取得 or 新規作成
  let extReport = document.getElementById('extReport');
  if (!extReport) {
    extReport = document.createElement('div');
    extReport.id = 'extReport';
    extReport.style.marginTop = "12px";
    extReport.style.padding = "8px";
    extReport.style.background = "#0b1220";
    extReport.style.border = "1px solid #122036";
    extReport.style.borderRadius = "8px";
  }

  // extContainer の末尾に常に移動（UI 安定化）
  extContainer.appendChild(extReport);
  extReport.innerHTML = "";

  // -------------------------
  // 1) Screw (0k0 → 21@b)
  // -------------------------
  {
    const sec = document.createElement('div');
    sec.style.marginTop = "10px";

    const even = `${screw.even.present}/${screw.even.total}`;
    const odd  = `${screw.odd.present}/${screw.odd.total}`;

    let msg = `
      <b>直列条件（0k0 → 2₁@b）</b><br>
      even(k): ${even} / odd(k): ${odd} ⇒ <b>${screw.call}</b>
    `;

    // データ不足の明示
    if (screw.score === 0 && screw.call.includes("不可")) {
      msg += `<br><span class="hint">※ 0k0 の反射数が不足しています</span>`;
    } else {
      // score の軽い表示（SG 推定との整合性）
      msg += `<br><span style="color:#9ca3af;font-size:0.9em">score=${screw.score.toFixed(2)}</span>`;
    }

    sec.innerHTML = msg;
    extReport.appendChild(sec);
  }

  // -------------------------
  // 2) Glide (h0l → a/c/n/d)
  // -------------------------
  {
    const sec = document.createElement('div');
    sec.style.marginTop = "10px";

    let msg = `
      <b>帯域条件（h0l → glide）</b><br>
      <div style="margin-left:8px">${glide.summary}</div>
    `;

    // データ不足の明示
    const best = glide.best;
    const total = best.counts.totAllow + best.counts.totForb;
    if (total < 30) {
      msg += `<span class="hint">※ h0l の反射数が不足しています</span>`;
    } else {
      msg += `<br><span style="color:#9ca3af;font-size:0.9em">confidence=${glide.confidence.toFixed(2)}</span>`;
    }

    sec.innerHTML = msg;
    extReport.appendChild(sec);
  }
}
