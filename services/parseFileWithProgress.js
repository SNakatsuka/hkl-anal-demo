// services/parseFileWithProgress.js
import { parseHKL_line_auto } from '../utils/hkl.js';

// 既存 app.js の期待に合わせた戻り値を用意
export async function parseFileWithProgress(file, onProgress = () => {}) {
  const text = await file.text();
  const lines = text.split(/\r?\n/);
  const total = lines.length;

  let reflections = [];
  let skipped = 0;
  const formatStats = { whitespace: 0, "fixed-width": 0 };

  for (let i = 0; i < total; i++) {
    const line = lines[i];
    const parsed = parseHKL_line_auto(line);
    if (!parsed.ok) { skipped++; continue; }
    reflections.push(parsed.rec);

    // format 推定が返る仕様ならそれでカウント（なければ適当に whitespace++）
    if (parsed.format === 'fixed-width') formatStats["fixed-width"]++;
    else formatStats.whitespace++;
    if (i % 1000 === 0) onProgress((i / total) * 100, `解析中: ${i}/${total}`);
  }
  onProgress(100, `解析完了: ${reflections.length} 反射`);

  // 採用形式: 多い方
  const dominantFormat = (formatStats["fixed-width"] > formatStats.whitespace) ? "fixed-width" : "whitespace";
  return { reflections, skipped, formatStats, dominantFormat };
}
