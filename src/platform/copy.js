const messages = {
  ja: {
    discover: "からだで、あそぼう。", swipe: "スワイプして、次のあそび", play: "PLAY", players: "人", seconds: "約{n}秒",
    favorite: "お気に入り", share: "シェア", info: "ゲーム情報", close: "閉じる", back: "フィードへ戻る", next: "NEXT GAME", retry: "RETRY", shareResult: "SHARE RESULT",
    input: "使うもの", duration: "プレイ時間", privacy: "カメラのこと", privacyText: "映像と音声は端末内で処理し、このアプリでは録画・送信しません。初回はMediaPipeモデルをダウンロードします。MediaPipe自体が利用状況を送信する場合があります。",
    search: "ゲーム・入力方法を検索", all: "すべて", empty: "まだ実験中。この条件のゲームは準備中です。", collection: "コレクション", inputFilter: "入力方法", explore: "次の実験を探そう。",
    onboarding: "からだが、コントローラー。", onboardingDetail: "スワイプで見つける。\nPLAYで、はじめる。", gotIt: "さあ、あそぼう →",
    before: "READY WHEN YOU ARE", camera: "カメラを使ってはじめる", microphone: "カメラとマイクを使ってはじめる", reason: "{input}の動きを、ゲームの操作に使います。", voiceReason: "口の位置と声の高さを、ゲームの操作に使います。", local: "映像・音声はこの端末内で処理します。", demo: "カメラなしで練習", loading: "ゲームを準備中…", failed: "読み込めませんでした。接続を確認して再試行してください。", reload: "再読み込み",
    rotate: "ふたりが映るように、横向きがおすすめ。", rotateDetail: "そのまま続けることもできます。", ready: "準備ができたら自動でスタート", saved: "お気に入りに追加", removed: "お気に入りから削除", copied: "共有テキストとURLをコピーしました", shared: "共有しました", copyManually: "リンクを選択してコピー", notFound: "この実験は見つかりませんでした。", completed: "実験完了！", nextHint: "次は、何であそぶ？", feedLabel: "ゲームの縦フィード。上下キーでも移動できます。", preview: "プレビュー", photoResume: "PHOTO MODE用にカメラを準備中…",
  },
  en: {
    discover: "PLAY WITH YOUR REAL WORLD.", swipe: "SWIPE FOR YOUR NEXT EXPERIMENT", play: "PLAY", players: "P", seconds: "~{n} SEC",
    favorite: "Favorite", share: "Share", info: "Game information", close: "Close", back: "Back to feed", next: "NEXT GAME", retry: "RETRY", shareResult: "SHARE RESULT",
    input: "YOUR CONTROLLER", duration: "ROUND LENGTH", privacy: "YOUR CAMERA", privacyText: "Images and audio are processed on your device, never recorded or uploaded by this app. MediaPipe models download on first use. MediaPipe itself may send usage metrics.",
    search: "Search games or inputs", all: "ALL", empty: "Still in the lab. No games match these filters yet.", collection: "COLLECTION", inputFilter: "INPUT", explore: "FIND YOUR NEXT EXPERIMENT.",
    onboarding: "YOUR BODY IS THE CONTROLLER.", onboardingDetail: "Swipe to discover.\nTap PLAY to begin.", gotIt: "LET'S PLAY →",
    before: "READY WHEN YOU ARE", camera: "ENABLE CAMERA & GO", microphone: "ENABLE CAMERA + MIC & GO", reason: "Your {input} movement controls the game.", voiceReason: "Your mouth position and the pitch of your voice control the game.", local: "Images and audio stay on this device.", demo: "PRACTICE WITHOUT CAMERA", loading: "Preparing your experiment…", failed: "Couldn't load this game. Check your connection and try again.", reload: "TRY AGAIN",
    rotate: "Turn your phone sideways to fit both players.", rotateDetail: "You can also continue in portrait.", ready: "Starts automatically when you're ready", saved: "Added to favorites", removed: "Removed from favorites", copied: "Share text and URL copied", shared: "Shared", copyManually: "Select and copy your link", notFound: "We couldn't find that experiment.", completed: "EXPERIMENT COMPLETE", nextHint: "WHAT WILL YOU PLAY NEXT?", feedLabel: "Game discovery feed. Use Up and Down keys to browse.", preview: "PREVIEW", photoResume: "Preparing camera for PHOTO MODE…",
  },
};
export const inputLabel = (input, locale) => locale === "ja" ? ({ HAND: "手", FACE: "顔", BODY: "からだ", VOICE: "声", BLINK: "まばたき", MOUTH: "口", PINCH: "つまむ" }[input] ?? input) : input;
export function copy(locale, key, values = {}) { return (messages[locale]?.[key] ?? messages.en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
