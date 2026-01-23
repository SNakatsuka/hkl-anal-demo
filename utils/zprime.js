// utils/zprime.js

export function zprimeWeight(zp) {
  if (!zp || isNaN(zp)) return 0;

  if (zp === 1) return 0.3;      // 最も一般的
  if (zp > 1) return -0.2;       // 対称性が下がる
  if (zp < 1) return 0.1;        // glide/screw が強い SG が増える

  return 0;
}
