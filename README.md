# hkl-anal-demo

## 使い方
1. このリポジトリを `main` に push  
2. **Settings → Pages → Source: `Deploy from a branch` / Branch: `main` / Folder: `/ (root)`**  
3. 表示された URL にアクセス → `.hkl` をドロップ/選択

## 入力フォーマット
- 空白区切りの `h k l I sigma`（1 行 1 反射）。コメント行は `#, !, ;` で開始。

## 現状（MVP）
- |F| = sqrt(max(I, 0)) の簡易変換
- E 正規化: **Wilson 型の単一グローバル平均** `E = F / sqrt(<F^2>)`  
  - 実装予定: 分解能シェル別正規化、B 因子推定、異常散乱/双晶/欠測補正など

## 今後のロードマップ
- 分解能計算（波長とユニットセルを入力 → d* 算出）
- シェル別 Wilson 正規化
- 初期位相推定（直接法/dual-space の試作）
- 空間群推定（ONNX Runtime Web + WebGPU）
- C++/Rust コアを WASM 化（Emscripten/wasm-bindgen）
- Web Worker による並列化
