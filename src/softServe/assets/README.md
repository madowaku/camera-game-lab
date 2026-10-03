# SOFT SERVE assets

- `logo.png`: OpenAI imagegenで2026-10-03に生成した透過ロゴ。ユーザー提供の承認済み画面を参考に、SOFT / SERVEの立体文字、バニラ、コーラル、ピスタチオの葉を新規生成。
- 元の生成画像を720px幅へ縮小してPNG保存（382,834 bytes）。Viteのlazy presentation / game moduleから読み込む。
- クリーム、ワッフルコーン、ノズル、顔のサングラス、スプリンクル、王冠はCanvasのオリジナル描画。開始画面と発見画面の看板絵は `public/artwork/soft-serve-v1.webp` の生成画像。BGMはOpenTracksの「みるくぷりん」／キュスを使用し、共通shellが再生・停止を管理。利用条件は `src/assets/music/LICENSE.md` に記録。
- 承認済み4画面は `SOFT_SERVE_VISUAL_IMPLEMENTATION_PACK_v0.1.zip` 内の資料。参照写真の人物を実装へ固定表示しない。
- `output/playwright/creator-*.png` の顔はQA用の合成図形。実カメラ品質を示す画像ではない。
