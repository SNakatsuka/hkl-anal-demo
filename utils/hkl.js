// utils/hkl.js
// HKL auto-detect parser: whitespace-separated OR fixed-width HKLF (SHELX)

// 文字コードを HKL の空白に合わせて正規化（タブ/NBSP/全角スペース→半角スペース）
// ただし固定幅の列幅を壊さないように、連続空白の圧縮はここでは行わない。
function normalizeSpacesForHKL(raw) {
  // 9: \t, 32: space, 160: NBSP, 12288: ideographic space
  return raw.replace(/[\u0009\u00A0\u3000]/g, ' ');
}

// 1行パース（空白区切り or 固定幅）を自動判定
export function parseHKL_line_auto(rawLine) {
  if (!rawLine) return { ok:false };

  // 空白種の正規化（桁幅は保持）
  const line = normalizeSpacesForHKL(rawLine);

  // --- 1) 空白区切りトライ（ここだけは連続空白を区切りとしてOK） ---
  // 先頭末尾の空白は許容して良いので trim するが、
  // 固定幅モードでは trim しないため、ここは line とは別に参照
  const wsCandidate = line.trim();
  if (wsCandidate) {
    const parts = wsCandidate.split(/\s+/); // ここは圧縮OK
    // --- (A) f2plus.dat：8列専用 (h k l F2 F2sigma F2raw Absorption flag) ---
    // 仕様: F2 は LP 補正済み・吸収なし・未平均 → SHELX 形式にするため Absorption で割る
    if (parts.length === 8) {
      const h = parseInt(parts[0], 10);
      const k = parseInt(parts[1], 10);
      const l = parseInt(parts[2], 10);
      const F2 = parseFloat(parts[3]);
      const F2sigma = parseFloat(parts[4]);
      // const F2raw = parseFloat(parts[5]); // 使わない場合は読み捨て
      const Abs = parseFloat(parts[6]);
      const flag = parts[7]; // テキストとして保持
      if (![h,k,l].some(Number.isNaN) && Number.isFinite(F2)) {
        // 安全策：Abs が 0 や非数のときの暴走回避
        const A = Number.isFinite(Abs) ? Math.max(Abs, 1e-12) : 1.0;
        const I  = F2 / A;
        const sig = Number.isFinite(F2sigma) ? (F2sigma / A) : undefined;
        return {
          ok: true,
          rec: { h, k, l, I, sig, absorption:A, flag },
          format: "f2plus-8cols"
        };
      }
    }
    // --- (B) 一般の空白区切り（5列 or 4列） ---
    if (parts.length >= 5) {
      const h = parseInt(parts[0], 10);
      const k = parseInt(parts[1], 10);
      const l = parseInt(parts[2], 10);
      const I = parseFloat(parts[3]);
      const sig = parseFloat(parts[4] ?? '0');
      if (![h,k,l].some(Number.isNaN) && Number.isFinite(I)) {
        return { ok:true, rec:{h,k,l,I,sig}, format:'whitespace' };
      }
    }
    if (parts.length === 4) {
      const h = parseInt(parts[0], 10);
      const k = parseInt(parts[1], 10);
      const l = parseInt(parts[2], 10);
      const I = parseFloat(parts[3]);
      if (![h,k,l].some(Number.isNaN) && Number.isFinite(I)) {
        return { ok:true, rec:{h,k,l,I}, format:'whitespace' };
      }
    }
  }
  
  // --- 2) 固定幅（SHELX HKLF 標準列幅） ---
  // 重要：ここでは trim しない。列幅で切る。
  // 列幅不足の短い行は不正としてスキップ。
  if (line.length >= 30) {
    const h_str = line.slice(0, 4);
    const k_str = line.slice(4, 8);
    const l_str = line.slice(8,12);
    const I_str = line.slice(12,21);
    const s_str = line.slice(21,30);

    const h = parseInt(h_str, 10);
    const k = parseInt(k_str, 10);
    const l = parseInt(l_str, 10);
    const I = parseFloat(I_str);
    const sig = parseFloat(s_str);

    if (![h,k,l].some(Number.isNaN) && Number.isFinite(I)) {
      return { ok:true, rec:{h,k,l,I,sig}, format:'fixed-width' };
    }
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

