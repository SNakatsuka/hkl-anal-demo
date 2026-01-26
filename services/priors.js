// services/priors.js
import { parseFormula, meanZ } from '../utils/formula.js';

export function getPriors() {
  const formulaStr = document.getElementById('formulaInput').value.trim();
  const formulaObj = parseFormula(formulaStr);
  const meanZval = meanZ(formulaObj);

  // ★ HTML に合わせて ID を修正
  const temperature = parseFloat(document.getElementById('temperature').value);
  const zprime = parseFloat(document.getElementById('zprime').value);
  const crystalSystem = document.getElementById('crystalSystem').value || null;

  return {
    formulaObj,
    meanZval,
    temperature: Number.isFinite(temperature) ? temperature : null,
    zprime: Number.isFinite(zprime) ? zprime : null,
    crystalSystem
  };
}
