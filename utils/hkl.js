
// HKL auto-detect parser: whitespace-separated OR fixed-width HKLF (SHELX)
export function parseHKL_auto(text) {
  const lines = text.split(/\r?\n/);
  const data = [];
  let skipped = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { skipped++; continue; }

    // --- 1) 空白区切りを試す ---
    const parts = line.split(/\s+/);
    let isWhitespace = false;

    if (parts.length >= 5) {
      // 数値としてパース可能か？
      const [h0, k0, l0, I0, sig0] = parts;
      if (!isNaN(parseInt(h0)) &&
          !isNaN(parseInt(k0)) &&
          !isNaN(parseInt(l0)) &&
          !isNaN(parseFloat(I0))) {
        isWhitespace = true;
      }
    }

    if (isWhitespace) {
      // 空白区切りとして処理
      const h = parseInt(parts[0], 10);
      const k = parseInt(parts[1], 10);
      const l = parseInt(parts[2], 10);
      const I = parseFloat(parts[3]);
      const sig = parseFloat(parts[4] ?? "0");

      if (![h,k,l].some(Number.isNaN)) {
        data.push({h,k,l,I,sig});
        continue;
      }
    }

    // --- 2) 固定幅形式を試す（SHELX HKLF 固定桁） ---
    // 想定桁位置（0–3 / 4–7 / 8–11 / 12–20 / 21–29）
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
      data.push({h, k, l, I, sig});
    } else {
      skipped++;
    }
  }

  return { reflections: data, skipped };
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
``
