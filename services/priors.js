// services/priors.js
import { parseFormula, meanZ } from '../utils/formula.js';

export function getPriors() {
  const formulaStr = document.getElementById('formulaInput').value.trim();
  const formulaObj = parseFormula(formulaStr);
  const meanZval = meanZ(formulaObj);

  const temperature = parseFloat(document.getElementById('tempInput').value);
  const zprime = parseFloat(document.getElementById('zprimeInput').value);
  const crystalSystem = document.getElementById('crystalSystemSelect').value || null;

  return {
    formulaObj,
    meanZval,
    temperature: Number.isFinite(temperature) ? temperature : null,
    zprime: Number.isFinite(zprime) ? zprime : null,
    crystalSystem
  };
}
