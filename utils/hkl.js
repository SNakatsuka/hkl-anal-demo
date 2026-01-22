
// 簡易 HKL パーサー: "h k l I sigma" 空白区切り（コメント行/空行を無視）
export function parseHKL(text) {
  const lines = text.split(/\r?\n/);
  const data = [];
  let skipped = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith(';')) {
      skipped++; continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length < 5) { skipped++; continue; }

    const h = parseInt(parts[0], 10);
    const k = parseInt(parts[1], 10);
    const l = parseInt(parts[2], 10);
    const I = Number(parts[3]);
    const sig = Number(parts[4]);

    if ([h,k,l].some(Number.isNaN) || !Number.isFinite(I)) { skipped++; continue; }

    data.push({ h, k, l, I, sig });
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
