const messages = {
  ja: {
    eyebrow: "VIRTUAL COMPANION INPUT / EXP-020", title: "小さな動き。\n巨大な力。",
    intro: "格好いい、綺麗、かわいい、おちゃめ。あなたの相棒を選ぼう。小さな動きが精霊の大きな一撃になる。",
    chooseSpirit: "あなたの相棒は？", compositionSettings: "自分の映り方を調整", playerSize: "自分の表示サイズ",
    compactHelp: "プレイヤーを小さく切り抜いて表示。画面が見やすい距離で遊べます。手が見切れるときだけ、端末の角度を調整してね。",
    findBody: "画面が見やすい距離で、顔と両肩を映してね", bodyReady: "この距離でOK！ 自分は小さく、精霊は大きく。",
    showHands: "両手まで映すと、精霊の腕があなたについてくるよ", bodyCropped: "顔か肩が見切れているよ。端末の角度や立ち位置を少し調整してね",
    canvasLabel: "プレイヤーの動きに連動して魔物を倒す守護精霊", smash: "撃破！", multiHit: "まとめて撃破！",
    summon: "カメラで召喚", demo: "カメラなしで試す", privacy: "カメラ映像と写真は端末内で処理。サーバーには送信しません。",
    model: "守護霊を準備中…", permission: "カメラの許可を待っています…", live: "カメラ接続中", preview: "守護霊プレビュー", demoLabel: "DEMO / タッチ操作",
    align: "見やすい距離でOK。顔・肩・手を映してね", count: "そのまま、もう少し", awakened: "あなたの守護霊が目覚めた", comeback: "顔と肩をカメラに戻してね", recovery: "そのまま待って、戦闘再開",
    battle: "小さな動きを、大きな一撃へ", boss: "ボス出現。小悪魔を倒してゲージをためよう", pose: "両手を頭の上に上げよう！", ascend: "その力を、解き放て", victory: "守護霊と一緒に、記念の一枚", finish: "一緒に戦った証を残そう", timeout: "もう一度、一緒に挑もう。写真も撮れるよ。",
    photo: "PHOTO MODE", photoLead: "次は、あなたたちの時間。", poseButton: "POSE 切替", shot: "SHOT 撮影", hide: "写真のUI", sound: "サウンド", pause: "一時停止", resume: "再開", paused: "PAUSED", retry: "RETRY もう一度", cancel: "終了", selfie: "撮影モードへ", download: "写真を保存", export: "プレイ記録を保存", gallery: "最新の写真", captured: "写真を撮影しました。下のプレビューから保存できます。", captureError: "写真を作成できませんでした。もう一度撮影してください。",
    punch: "片手をすばやく左右に振る", shotHelp: "片腕を伸ばして突き出す", shield: "両腕を左右に広げる", ascendHelp: "ゲージMAXで両手を上げる", demoHelp: "A / D：パンチ · S：霊弾 · F：結界 · W：必殺技", lossHelp: "人体ロストを試す", returnHelp: "プレイヤーを戻す",
    off: "OFF", on: "ON", ready: "READY", poseNames: ["A / 腕組み", "B / 指差し", "C / 頭上の手", "D / ピース"],
    error: "カメラを開始できませんでした。カメラの許可、他のアプリで使用中でないか、通信を確認して再試行してください。デモも遊べます。",
    unavailable: "カメラが停止しました。再接続すると新しいラウンドを開始します。", denied: "カメラが許可されていません。ブラウザーのサイト設定から許可して、もう一度召喚してください。", storage: "記録はこのブラウザーに保存。DEMOは身体入力の検証には数えません。"
  },
  en: {
    eyebrow: "VIRTUAL COMPANION INPUT / EXP-020", title: "Small movements.\nOtherworldly power.",
    intro: "Cool, beautiful, cute or mischievous. Choose your companion. Small movements become enormous spirit strikes.",
    chooseSpirit: "CHOOSE YOUR COMPANION", compositionSettings: "ADJUST YOUR ON-SCREEN SIZE", playerSize: "YOUR DISPLAY SIZE",
    compactHelp: "Your cutout appears smaller, so you can stay close enough to see the screen. Adjust the camera angle if your hands are cropped.",
    findBody: "Stay where you can see the screen. Show your face and both shoulders", bodyReady: "This distance works! Small you, giant guardian.",
    showHands: "Show both hands to make your guardian's arms follow yours", bodyCropped: "Your face or a shoulder is cropped. Adjust the camera angle or your position slightly",
    canvasLabel: "A guardian spirit follows the player's arms and defeats demons", smash: "SMASH!", multiHit: "MULTI SMASH!",
    summon: "SUMMON WITH CAMERA", demo: "TRY WITHOUT CAMERA", privacy: "Camera frames and photos stay on your device. Nothing is sent to our server.",
    model: "Preparing your guardian…", permission: "Waiting for camera permission…", live: "CAMERA LIVE", preview: "GUARDIAN PREVIEW", demoLabel: "DEMO / TOUCH INPUT",
    align: "Stay close enough to see. Show your face, shoulders and hands", count: "Stay here for a moment", awakened: "Your guardian has awakened", comeback: "Bring your face and shoulders back into view", recovery: "Hold still. Returning to battle…",
    battle: "Turn small movements into mighty attacks", boss: "Defeat imps to fill your spirit gauge", pose: "Raise both hands above your head!", ascend: "Unleash your guardian", victory: "A portrait of you and your guardian", finish: "Keep a memory of your battle", timeout: "Try again together. You can still take a photo.",
    photo: "PHOTO MODE", photoLead: "Now, a moment for the two of you.", poseButton: "CHANGE POSE", shot: "TAKE SHOT", hide: "PHOTO UI", sound: "SOUND", pause: "PAUSE", resume: "RESUME", paused: "PAUSED", retry: "RETRY", cancel: "END ROUND", selfie: "ENTER PHOTO MODE", download: "SAVE PHOTO", export: "EXPORT PLAY RECORDS", gallery: "YOUR LATEST PHOTO", captured: "Photo captured. Save it from the preview below.", captureError: "Could not create the photo. Please try another shot.",
    punch: "Quickly sweep one hand sideways", shotHelp: "Extend or thrust one arm", shield: "Spread both arms to the sides", ascendHelp: "Raise both hands when the gauge is full", demoHelp: "A / D: punch · S: shot · F: shield · W: ascend", lossHelp: "TEST TRACKING LOSS", returnHelp: "RETURN PLAYER",
    off: "OFF", on: "ON", ready: "READY", poseNames: ["A / CROSSED ARMS", "B / POINT TOGETHER", "C / HAND ABOVE YOU", "D / PEACE"],
    error: "Could not start the camera. Check camera permission, other apps using it, and your connection. You can also try the demo.",
    unavailable: "The camera stopped. Reconnect to start a new round.", denied: "Camera permission was denied. Allow it in your browser’s site settings, then summon again.", storage: "Records stay in this browser. DEMO rounds do not verify body input."
  }
};
export const guardianCopy = (locale, key) => messages[locale]?.[key] ?? messages.en[key] ?? key;
