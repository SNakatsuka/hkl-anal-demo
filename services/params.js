// services/params.js
export function getExperimentParams() {
  // 必要に応じて input 要素から取得（存在しなければ NaN/undefined で返す）
  const lambdaEl   = document.getElementById('lambda');
  const thetaMaxEl = document.getElementById('thetaMax');
  const tempEl     = document.getElementById('temperature');
  const zprimeEl   = document.getElementById('zprime');
  const crystalEl  = document.getElementById('crystalSystem');
  const meanZvalEl = document.getElementById('meanZval');

  return {
    lambda: Number(lambdaEl?.value ?? NaN),
    thetaMax: Number(thetaMaxEl?.value ?? NaN),
    temperature: Number(tempEl?.value ?? NaN),
    zprime: Number(zprimeEl?.value ?? NaN),
    crystalSystem: crystalEl?.value || undefined,
    meanZval: Number(meanZvalEl?.value ?? NaN)
  };
}
