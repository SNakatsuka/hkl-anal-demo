
// HKL auto-detect parser: whitespace-separated OR fixed-width HKLF (SHELX)

export function parseHKL_auto_withFormat(text) {
  const lines = text.split(/\r?\n/);
  const data = [];
  let skipped = 0;

  let detected = null;  // "whitespace" / "fixed-width"

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { skipped++; continue; }

    // --- 空白区切り判定 ---
    const parts = line.split(/\s+/);
    if (parts.length >= 5 &&
      !isNaN(parseInt(parts[0])) &&
      !isNaN(parseInt(parts[1])) &&
      !isNaN(parseInt(parts[2])) &&
      !isNaN(parseFloat(parts[3])) ) {

      detected = detected || "whitespace";

      const h = parseInt(parts[0], 10);
      const k = parseInt(parts[1], 10);
      const l = parseInt(parts[2], 10);
      const I = parseFloat(parts[3]);
      const sig = parseFloat(parts[4] ?? "0");

      data.push({h,k,l,I,sig});
      continue;
    }

    // --- 固定幅 ---
    const h_str = raw.slice(0, 4).trim();
    const k_str = raw.slice(4, 8).trim();
    const l_str = raw.slice(8,12).trim();
    const I_str = raw.slice(12,21).trim();
    const sig_str = raw.slice(21,30).trim();

    const h = parseInt(h_str, 10);
    const k = parseInt(k_str, 10);
    const l = parseInt(l_str, 10);
    const I = parseFloat(I_str);
    const sig = parseFloat(sig_str);

    if (![h,k,l].some(Number.isNaN) && !Number.isNaN(I)) {
      detected = detected || "fixed-width";
      data.push({h,k,l,I,sig});
    } else {
      skipped++;
    }
  }

  return { reflections: data, skipped, format: detected ?? "unknown" };
}

// I → |F|：|F| = sqrt(max(I, 0))
// 注意：実務ではスケーリング/消衰/吸収補正が必要（MVPでは未実装）
export function intensityToAmplitude(reflections) {
  return reflections.map(r => ({
    ...r, F: Math.sqrt(Math.max(r.I, 0.0))
  }));
}

// CSV 文字列化
export function toCSV(rows, header) {
  const head = header.join(',');
  const body = rows.map(r => header.map(h => r[h]).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

