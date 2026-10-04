export const messages = {
  ja: {
    tagline: "両手が、ふたりのダンサーになる。", sub: "うまく踊らなくていい。好きに動かそう。",
    play: "両手で PLAY", demo: "カメラなしで遊ぶ", howto: "あそびかた", choose: "今日のふたり", left: "LEFT · 元気な子", right: "RIGHT · のんびりな子", bear: "くま", bunny: "うさぎ",
    hold: "両手を、カメラの中へ。", holdDetail: "手のひら全体を映すと、ふたりが登場。", one: "もう片方の手も映してね。", loading: "ふたりを呼んでいます…", permission: "カメラの許可を待っています。",
    camera: "インカメラ", practice: "カメラなしの練習", demoTip: "足元の輪をドラッグ。近づけると、ハイタッチ！", cameraTip: "好きに動かそう。ふたりがダンスに変えてくれる。",
    pause: "ひと休み", resume: "つづける", paused: "ちょっと、ひと休み。", pausedDetail: "ふたりも待っているよ。", sound: "効果音", highFive: "ハイタッチ", spin: "くるっと", hug: "ぎゅっ", jump: "ジャンプ", sparkle: "キラキラ", step: "ステップ", dash: "ダッシュ", crouch: "しゃがむ",
    highFiveTip: "両手を近づけてみよう。", spinTip: "片方の手で、まるを描いてみよう。", poseTip: "好きなポーズで、はいチーズ！", finalTip: "今日のふたり、最高。", freeTip: "振っても、止めても。それでいい。",
    lost: "手のひら全体を、もう一度カメラの中へ。", error: "カメラを開始できませんでした。許可と接続を確認するか、カメラなしで遊べます。", cameraRetry: "カメラを再試行", photo: "写真を保存", photoError: "写真を用意できませんでした。もう一度遊ぶと撮り直せます。", again: "もう一回！", next: "次のおもちゃ", share: "ふたりをシェア", result: "今日も、いいコンビ。", caption: "30秒だけの、小さな友だち。", disabled: "写真を準備中…",
    steps: [["両手を映そう", "手のひら全体をカメラに。ふたりが勝手にごあいさつ。"], ["好きに動かそう", "左右へ振る、上げる、まるを描く。正解はありません。"], ["近づけて、はいチーズ", "ハイタッチ、もっと近づけてハグ。最後は自動で記念写真。"]],
  },
  en: {
    tagline: "Your hands become two tiny dancers.", sub: "No perfect moves. Just a little joy.",
    play: "PLAY with your hands", demo: "Play without a camera", howto: "How to play", choose: "Meet your duo", left: "LEFT · The lively one", right: "RIGHT · The easygoing one", bear: "Bear", bunny: "Bunny",
    hold: "Bring both hands into the frame.", holdDetail: "Show your whole palms to meet your pals.", one: "Bring your other hand into the frame.", loading: "Calling your little pals…", permission: "Waiting for camera permission.",
    camera: "FRONT CAMERA", practice: "CAMERA-FREE PRACTICE", demoTip: "Drag the rings. Bring them together for a high-five!", cameraTip: "Move any way you like. Your pals will make a dance of it.",
    pause: "Pause", resume: "Keep dancing", paused: "A tiny breather.", pausedDetail: "Your pals will wait for you.", sound: "Sound effects", highFive: "High-five", spin: "Spin", hug: "Hug", jump: "Jump", sparkle: "Sparkle", step: "Step", dash: "Dash", crouch: "Crouch",
    highFiveTip: "Bring your hands closer together.", spinTip: "Draw a little circle with either hand.", poseTip: "Make any pose. Say cheese!", finalTip: "A little moment. A lovely duo.", freeTip: "Wiggle, wave, or do absolutely nothing.",
    lost: "Bring your whole palms back into the frame.", error: "Camera could not start. Check permission and connection, or play without a camera.", cameraRetry: "Try camera again", photo: "Save photo", photoError: "Photo could not be prepared. Play again to take another.", again: "ONE MORE!", next: "Next toy", share: "Share your duo", result: "A very good little duo.", caption: "Tiny friends, for thirty seconds.", disabled: "Preparing photo…",
    steps: [["Show both hands", "Whole palms in the frame. Your pals will say hello."], ["Move however you like", "Wave, lift, draw a circle. There are no wrong moves."], ["Come closer. Say cheese!", "High-five, then hug. Finish with an automatic souvenir photo."]],
  },
};
export const textFor = locale => messages[locale === "ja" ? "ja" : "en"];
