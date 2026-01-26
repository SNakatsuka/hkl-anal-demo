// ui/reports.js
export function renderScrewGlideReport(extContainer, screw, glide) {
  let extReport = document.getElementById('extReport');
  if (!extReport) {
    extReport = document.createElement('div');
    extReport.id = 'extReport';
    extReport.style.marginTop = "12px";
    extReport.style.padding = "8px";
    extReport.style.background = "#0b1220";
    extReport.style.border = "1px solid #122036";
    extReport.style.borderRadius = "8px";
    extContainer.appendChild(extReport);
  }
  extReport.innerHTML = "";

  // screw
  {
    const sec = document.createElement('div');
    sec.style.marginTop = "10px";
    const even = `${screw.even.present}/${screw.even.total}`;
    const odd  = `${screw.odd.present}/${screw.odd.total}`;
    sec.innerHTML = `
      <b>直列条件（0k0 → 2₁@b）</b><br>
      even(k): ${even} / odd(k): ${odd} ⇒ <b>${screw.call}</b>
    `;
    extReport.appendChild(sec);
  }
  // glide
  {
    const sec = document.createElement('div');
    sec.style.marginTop = "10px";
    sec.innerHTML = `
      <b>帯域条件（h0l → glide）</b><br>
      ${glide.summary}
    `;
    extReport.appendChild(sec);
  }
}
