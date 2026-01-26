# hkl-anal-demo
# 概要
結晶学データの.hklファイルをブラウザ上で解析・変換するためのシンプルなウェブツールです。
主に強度(I)から構造因子(F)への変換とE正規化をサポート。
JavaScriptベースのクライアントサイドアプリで、ドラッグ&ドロップ対応。教育・研究の初期解析に便利です。
最近の更新（2026年1月23日）：
空間群候補関連の機能強化（sg_candidates.js）
アプリロジック（app.js）
UI（index.html, style.css）の改善
MVPを超えて、空間群推定に向けた基盤を整備中。

# 機能
.hklファイルの読み込み（ドラッグ&ドロップまたはファイル選択）
コメント行（#, !, ; で開始）のスキップ
強度(I)から|F|への簡易変換: |F| = sqrt(max(I, 0))
E正規化: Wilson型の単一グローバル平均 (E = F / sqrt(<F^2>))
出力: 変換結果のテキスト表示（将来のビジュアル化予定）

# インストール/デプロイ
GitHub Pagesで簡単にホスト可能です。このリポジトリをフォークまたはクローン。
GitHubリポジトリのSettings > Pages > Source: Deploy from a branch / Branch: main / Folder: / (root) を設定。
生成されたURL（例: https://yourusername.github.io/hkl-anal-demo/）にアクセス。

ローカルでテストする場合:index.htmlをブラウザで開くだけ（サーバー不要）。

# 使い方
デプロイされたページにアクセス。
.hklファイルをドロップまたは「ファイルを選択」ボタンでアップロード。
自動的に解析・変換が行われ、結果が表示されます。

# 入力フォーマット
各行: 空白区切りの h k l I sigma（1行1反射）。
コメント行: #, !, ; で開始（無視されます）。
例:Sample HKL data
1 0 0 100.0 5.0
0 1 0 90.0 4.5

# 現在の進捗
（MVP+α）基本変換とグローバルWilson正規化を実装済み。
最近の進捗: 空間群候補の処理を強化（sg_candidates.js）。異常散乱や双晶補正の準備中。
追加予定の即時実装: 分解能シェル別正規化、B因子推定、欠測補正。

# 今後のロードマップ
分解能計算（波長とユニットセル入力からd*算出）。
シェル別Wilson正規化。
初期位相推定（直接法/dual-spaceの試作）。
空間群推定（ONNX Runtime Web + WebGPU統合）。
C++/RustコアのWASM化（Emscripten/wasm-bindgen）。
Web Workerによる並列化。
出力のビジュアル化（チャートや3D構造プレビュー）。
AI/ML要素の追加（Grok統合による自動最適化提案）。

# ライセンス
MIT License. 詳細はLICENSEファイル参照。
貢献プルリクエスト歓迎！ 
バグ報告や機能提案はIssuesへ。

作者: Soichiro Nakatsuka (@SNakatsuka_JP)

