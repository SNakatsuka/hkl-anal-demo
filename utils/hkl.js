
// HKL auto-detect parser: whitespace-separated OR fixed-width HKLF (SHELX)


// 1行をパース（空白区切り or 固定幅）
// 戻り値: {ok:boolean, rec?:{h,k,l,I,sig}, format?: "whitespace"|"fixed-width"}
export function parseHKL_line_auto(rawLine) {
  const line = rawLine.trim();
  if (!line) return { ok:false };

  // まず空白区切り
  const parts = line.split(/\s+/);
  if (parts.length >= 5) {
    const h = parseInt(parts[0], 10);
    const k = parseInt(parts[1], 10);
    const l = parseInt(parts[2], 10);
    const I = parseFloat(parts[3]);
    const sig = parseFloat(parts[4] ?? "0");
    if (![h,k,l].some(Number.isNaN) && Number.isFinite(I)) {
      return { ok:true, rec:{h,k,l,I,sig}, format:"whitespace" };
    }
  }

  // 固定幅（SHELX HKLF 想定：1–4,5–8,9–12,13–21,22–30）
  const h_str = rawLine.slice(0, 4).trim();
  const k_str = rawLine.slice(4, 8).trim();
  const l_str = rawLine.slice(8,12).trim();
  const I_str = rawLine.slice(12,21).trim();
  const s_str = rawLine.slice(21,30).trim();

  const h = parseInt(h_str, 10);
  const k = parseInt(k_str, 10);
  const l = parseInt(l_str, 10);
  const I = parseFloat(I_str);
  const sig = parseFloat(s_str);

  if (![h,k,l].some(Number.isNaN) && Number.isFinite(I)) {
    return { ok:true, rec:{h,k,l,I,sig}, format:"fixed-width" };
  }

  return { ok:false };
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

