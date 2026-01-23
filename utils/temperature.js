// utils/temperature.js

export function temperatureWeight(T) {
  if (!T || isNaN(T)) return 0;

  if (T < 150) return 0.2;   // 低温 → disorder 減少 → centric が安定
  if (T > 250) return -0.1;  // 室温 → disorder 増加 → acentric が増える

  return 0;
}
