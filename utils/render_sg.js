export function renderSG(container, ext, eStats) {
  if (!ext || !eStats) {
    container.textContent = "未計算";
    return;
  }

  const lattice = ext.best.type;
  const centro = eStats.likely.includes("centric");

  const sgList = suggestSG(lattice, centro);

  container.innerHTML = `
    <p>格子心：<b>${lattice}</b></p>
    <p>E 分布：<b>${centro ? "centro" : "acentro"}</b></p>

    <h4>候補：</h4>
    <ul class="sg-list">
      ${sgList.map(sg => `<li>${sg}</li>`).join("")}
    </ul>
  `;
}

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
  return centro
    ? ["P-1", "P2/m", "Pmmm"]
    : ["P1", "P212121", "Pna21"];
}
