// services/downloads.js
import { toCSV } from '../utils/hkl.js';

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function bindDownloads(btnE, btnF, getLastE, getLastF) {
  btnF.addEventListener('click', () => {
    const data = getLastF?.();
    if (!data) return;
    download('amplitude_F.csv', toCSV(data, ['h', 'k', 'l', 'F']));
  });
  btnE.addEventListener('click', () => {
    const data = getLastE?.();
    if (!data) return;
    download('normalized_E.csv', toCSV(data, ['h', 'k', 'l', 'E']));
  });
}
