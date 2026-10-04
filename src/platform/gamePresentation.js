import { escapeHtml as esc, copy, inputLabel } from './copy.js';
import { titleOf, subtitleOf } from './experiments.js';
import { artworkMarkup } from './gameArtwork.js';

// Each entrance teaches the actual rules, including calibration and fresh edges.
export const gameGuides = {
  'solo-hand-beat': {
    ja: ['その手、ビートに乗れる？', ['手を映す','片手をカメラの中へ'], ['カタチを合わせる','開く・握る・ピース・サムズアップ'], ['ビートで決める','光るタイミングで16回']],
    en: ['Can your hands keep the beat?', ['Show one hand','Keep it inside the frame'], ['Match the shape','Open, fist, peace or thumbs up'], ['Catch the beat','16 chances to get it right']],
  },
  'solo-finger-gun': {
    ja: ['指でねらって、口でBAN!', ['顔と指を映す','最初は口を閉じて準備'], ['指で照準を合わせる','人差し指を的に向けよう'], ['口を開けてBAN!','閉じてから開けると、次の一発']],
    en: ['Aim with your finger. BAN with your mouth!', ['Show your face and finger','Start with your mouth closed'], ['Point at the target','Aim with your index finger'], ['Open your mouth: BAN!','Close, then open for the next shot']],
  },
  'solo-eat-dont-eat': {
    ja: ['食べる？ それとも、ガマン？', ['口を閉じて準備','いつもの口の形を覚える'], ['食べ物はパクッ','口を開けて食べよう'], ['ほかは口を閉じる','15秒で12個を見分ける']],
    en: ['A snack… or a very bad idea?', ['Start with lips closed','Calibrate your relaxed mouth'], ['Open wide for food','Take a bite when it is edible'], ['Keep everything else out','12 decisions in 15 seconds']],
  },
  'solo-blink-horror': {
    ja: ['目を閉じる勇気、ある？', ['目を開けて進む','出口へ向かって逃げよう'], ['気配がしたら閉じる','両目を閉じると敵が退く'], ['26秒を逃げきる','音と距離を頼りに進もう']],
    en: ['Dare to close your eyes?', ['Look to move forward','Keep heading for the exit'], ['Close both eyes to hide','Make the approaching thing retreat'], ['Survive 26 seconds','Listen closely. Choose your moment.']],
  },
  'solo-pinch-world': {
    ja: ['その手で、小さな大仕事。', ['手を重ねてグー','手のひらのカーソルで掴む'], ['握ったまま運ぶ','四角は壁のすき間を通す'], ['手を開いて置く','同じ形のくぼみへ置こう']],
    en: ['Your hand. A tiny world.', ['Palm over the shape, then fist','Close your whole hand to grab'], ['Carry with a fist','Take the square through the gap'], ['Open your palm to drop','Place it in the matching socket']],
  },
  'solo-ghost-trail': {
    ja: ['さっきの自分が、追ってくる。', ['顔でリングを動かす','最初の3秒は軌跡を記録'], ['過去の動きをよける','3・6・9・12秒前の自分が出現'], ['30秒を逃げきる','残り3ライフ。すれ違うと加点']],
    en: ['Your past is catching up.', ['Move the ring with your face','First, leave a three-second trail'], ['Dodge your earlier moves','Echoes return after 3, 6, 9 and 12s'], ['Last for 30 seconds','Three lives. Near misses earn extra.']],
  },
  'voice-note-blaster': {
    ja: ['その「ド」が、弾になる。', ['楽な高さでドを歌う','1秒伸ばして、自分の基準に'], ['ド・レ・ミ・ファ・ソ','歌った音の高さで撃ち分ける'], ['敵を止めよう','20連続ヒットでフィーバー']],
    en: ['Your voice is the ammunition.', ['Hold a comfortable Do','One second sets your own pitch'], ['Sing Do, Re, Mi, Fa or So','Each note fires on its staff line'], ['Stop the incoming enemies','20 hits in a row trigger fever']],
  },
  'duo-tiny-bot-duel': {
    ja: ['ふたりの顔で、押し出しバトル。', ['ふたりで横に並ぶ','P1は左、P2は右。口を閉じる'], ['顔を左右に動かす','自分のロボットでよけよう'], ['口を開けて撃つ','閉じて次の一発。相手を押し出せ']],
    en: ['Two faces. One tiny showdown.', ['Sit side by side','P1 left, P2 right. Close your mouths.'], ['Lean to move your bot','Dodge with small face movements'], ['Open your mouth to fire','Close to rearm. Push them out!']],
  },
  'guardian-spirit': {
    ja: ['そのポーズが、守護霊の力。', ['片手を振って攻撃','パンチ、腕を伸ばすとショット'], ['両腕を広げて守る','シールドで敵の攻撃を防ごう'], ['両手を上げて覚醒','ゲージ満タンでボスを倒す']],
    en: ['Your pose. Your guardian’s power.', ['Sweep a hand to punch','Extend an arm for a spirit shot'], ['Spread both arms to shield','Block the incoming attacks'], ['Raise both hands to ascend','With a full gauge, defeat the boss']],
  },
  'outcam-watermelon-guide': {
    ja: ['見える相方の声を、信じよう。', ['ひとりが撮影する','アウトカメラにスイカが出現'], ['声で場所を伝える','もうひとりはスイカが見えない'], ['手を下へ振り下ろす','30秒以内に3個を割ろう']],
    en: ['Listen to your partner. Smash.', ['One player holds the camera','Only they see the virtual melons'], ['Guide your partner by voice','Tell them where to aim'], ['Swing a hand down','Three melons. A 30-second limit.']],
  },
  'outcam-false-bridge': {
    ja: ['それ、橋に見えてきた。', ['何もない背景を映す','1秒静止して、背景を覚える'], ['身近な形を合わせる','位置・角度・距離で白いガイドへ'], ['LOCKで道にする','橋と柱で5つの世界をつなごう']],
    en: ['Wait… that could be a bridge.', ['Frame an empty background','Hold still for one second'], ['Fit an everyday shape','Match the white guide with your camera'], ['LOCK it into the world','Build bridges and pillars in five worlds']],
  },
  'outcam-frame-smuggler': {
    ja: ['映せ、隠せ、バレずに戻せ。', ['撮る人と運ぶ人に分かれる','前後カメラを選び、片手を映す'], ['検問だけ画面の外へ','それ以外は宝石を映し続ける'], ['すぐ戻して届ける','30秒・4回の検問を突破しよう']],
    en: ['Frame it. Hide it. Get away with it.', ['Choose operator and smuggler','Choose a camera, then show one hand'], ['Hide only during inspections','Otherwise keep the gem in frame'], ['Bring it back to deliver','Four inspections in 30 seconds']],
  },
  'solo-daitai-hero': {
    ja: ['だいたい合ってれば、勇者。', ['顔を中央で3秒静止','ひとりの顔で準備しよう'], ['左右へ動いて答える','真ん中は軽くうなずく'], ['中央に戻って次へ','30秒間、だいたいを当てよう']],
    en: ['A good guess makes a great hero.', ['Hold your face still for 3s','One face, centered in the frame'], ['Lean left or right to answer','Nod for the middle choice'], ['Return to center for the next','30 seconds of heroic estimation']],
  },
  'outcam-the-camera-is-it': {
    ja: ['映せば、そこに道ができる。', ['スマホで行き先を映す','フレームの中だけに足場が出現'], ['彼の足元も忘れずに','進むのは彼、道を作るのはあなた'], ['5つの出口へ導く','各ステージ15〜30秒']],
    en: ['Point your phone. Make a path.', ['Frame the way ahead','Only the framed platforms exist'], ['Keep his feet in view too','He walks. You create the ground.'], ['Reach all five exits','15–30 seconds in each world']],
  },
};

export function guideFor(game, locale) { return gameGuides[game.id]?.[locale === 'ja' ? 'ja' : 'en']; }
const sourceLabel = (source,locale) => locale === 'ja' ? source === 'demo' ? '練習 · カメラなし' : source === 'voice' ? 'カメラ + 声' : 'カメラプレイ' : source === 'demo' ? 'PRACTICE · NO CAMERA' : source === 'voice' ? 'CAMERA + VOICE' : 'CAMERA PLAY';
export function launchMarkup(game, locale) {
  const ja = locale === 'ja', guide = guideFor(game,locale);
  return `<section class="arcade-entry"><div class="arcade-edition"><span>${esc(game.exp)} / ${esc(game.collection)}</span><span>${game.players}${copy(locale,'players')} · ${copy(locale,'seconds',{n:game.duration})}</span></div>
    <h1>${esc(titleOf(game,locale))}</h1><p class="arcade-hook">${esc(guide?.[0] ?? subtitleOf(game,locale))}</p>
    <div class="arcade-hero preview-active">${artworkMarkup(game)}<span class="arcade-input">${game.input.map(i=>esc(inputLabel(i,locale))).join(' + ')}</span></div>
    <ol class="arcade-steps">${(guide?.slice(1) ?? []).map(([title],i)=>`<li><b aria-hidden="true">0${i+1}</b><span>${esc(title)}</span></li>`).join('')}</ol>
    ${game.orientation === 'landscape' ? `<p class="orientation-guide">${copy(locale,'rotate')}</p>` : ''}
    <div class="launch-controls"><button class="launch-camera" type="button" disabled>PLAY <span>↗</span><small>${copy(locale,game.requiresMicrophone?'microphone':'camera')}</small></button>${game.demo ? `<button class="launch-demo" type="button" disabled>${copy(locale,'demo')} →</button>`:''}<button class="launch-howto" type="button">${ja?'遊び方':'HOW TO PLAY'} <span>＋</span></button></div>
    <p class="launch-status" role="status">${copy(locale,'loading')}</p><details class="arcade-privacy"><summary>${ja?'カメラのこと':'ABOUT YOUR CAMERA'}</summary><p>${esc(game[ja?'privacyJa':'privacyEn'] ?? copy(locale,'privacyText'))}</p></details></section>`;
}
export function howtoMarkup(game,locale) {
  const ja=locale==='ja',guide=guideFor(game,locale);
  return `<p class="platform-kicker">${esc(titleOf(game,locale))}</p><h2 id="sheet-title">${ja?'遊び方':'HOW TO PLAY'}</h2><ol class="arcade-howto">${(guide?.slice(1)??[]).map(([title,detail],i)=>`<li><b aria-hidden="true">0${i+1}</b><div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div></li>`).join('')}</ol><p>${esc(game[ja?'launchReasonJa':'launchReasonEn']??subtitleOf(game,locale))}</p>`;
}

// Select only measured fields. In particular, zero, failure and interrupted
// rounds must never be promoted to a clear or a fabricated personal best.
export function resultModel(game,r,locale) {
  const ja=locale==='ja',say=(a,b)=>ja?a:b, number=n=>Number.isFinite(n)?n.toLocaleString(ja?'ja-JP':'en-US'):'—';
  const seconds=n=>Number.isFinite(n)?`${(n/1000).toFixed(1)}s`:'—';
  const metric=(a,b,v)=>({label:say(a,b),value:v}),pct=n=>Number.isFinite(n)?`${Math.round(n)}%`:'—';
  let title=say('ナイスプレイ！','NICE PLAY'),hero=number(r.score),unit=say('点','PTS'),hint=say('もう一回、記録を伸ばそう。','One more round. Can you beat it?'),metrics=[];
  switch(game.id) {
    case 'solo-hand-beat': case 'solo-eat-dont-eat':
      title=game.id==='solo-hand-beat'?say('ビートをつかんだ？','CATCH THE BEAT?'):say('見分けられた？','GOOD TASTE?');
      metrics=[metric('成功','HITS',`${number(r.hits)} / ${number(r.total)}`),metric('正解率','ACCURACY',pct(r.accuracy))];break;
    case 'solo-finger-gun':
      title=say('指先の腕前は？','HOW SHARP IS YOUR AIM?');
      metrics=[metric('命中','HITS',number(r.hits)),metric('命中率','ACCURACY',pct(r.accuracy)),metric('発射','SHOTS',number(r.shots))];break;
    case 'solo-blink-horror':
      title=r.outcome==='escaped'?say('闇から、生還。','OUT OF THE DARK.'):r.outcome==='timeout'?say('出口まで、あと少し。','THE EXIT WAS SO CLOSE.'):say('すぐ後ろにいた。','IT WAS RIGHT BEHIND YOU.');
      hero=Number.isFinite(r.seconds)?r.seconds.toFixed(1):'—';unit=say('秒 生き延びた','SECONDS SURVIVED');
      hint=r.outcome==='escaped'?say('次も、目を閉じる勇気を。','Dare to escape again?'):say('近づく気配がしたら、両目を閉じよう。','Close both eyes when it gets close.');
      metrics=[metric('隠れた回数','HIDES',number(r.hides)),metric('進んだ距離','PROGRESS',`${number(r.score)}%`)];break;
    case 'solo-pinch-world':
      title=say('小さな大仕事、完了。','A TINY JOB, WELL DONE.');hero='3 / 3';unit=say('課題クリア','TASKS COMPLETE');
      metrics=[metric('クリア時間','TIME',seconds(r.seconds*1000)),metric('つかんだ回数','GRABS',number(r.successfulGrabs))];
      hint=r.clean?say('一度も落とさず、ぴったり。','A perfect little delivery.'):say('次は、もっとそっと運んでみよう。','Try an even gentler touch next time.');break;
    case 'solo-ghost-trail':
      title=r.outcome==='survived'?say('過去の自分を、振り切った。','YOU OUTRAN YOUR PAST.'):say('過去の自分に、追いつかれた。','YOUR PAST CAUGHT UP.');
      metrics=[metric('生存時間','SURVIVAL',seconds(r.seconds*1000)),metric('ニアミス','NEAR MISSES',number(r.nearMisses)),metric('残りライフ','LIVES',number(r.lives))];break;
    case 'voice-note-blaster':
      title=r.reason==='STOPPED'?say('ここで、ひと休み。','TAKE A BREATHER.'):say('その声、いい武器だ。','THAT VOICE HAS FIREPOWER.');
      metrics=[metric('命中率','ACCURACY',pct(r.accuracy)),metric('最大コンボ','BEST COMBO',number(r.maxCombo)),metric('PERFECT','PERFECT',pct(r.perfectRate))];break;
    case 'duo-tiny-bot-duel':
      title=r.winner?say(`P${r.winner}の勝ち！`,`P${r.winner} WINS!`):say('いい勝負、引き分け！','A WELL-MATCHED DRAW!');
      hero=r.winner?`P${r.winner}`:'DRAW';unit=r.reason==='RING_OUT'?say('押し出し！','RING OUT!'):say('タイムアップ','TIME UP');
      hint=say('次は、どっちが勝つ？','Who takes the rematch?');
      metrics=[metric('P1 命中','P1 HITS',number(r.hits?.[0])),metric('P2 命中','P2 HITS',number(r.hits?.[1])),metric('対戦時間','ROUND TIME',seconds(r.durationMs))];break;
    case 'guardian-spirit':
      title=r.victory?say('守護霊と、勝利のポーズ。','VICTORY. STRIKE A POSE.'):say('守護霊は、まだそばに。','YOUR GUARDIAN IS STILL HERE.');
      hint=say('WARDENと一緒に、記念の一枚も。','Take a portrait with WARDEN, too.');
      metrics=[metric('倒した敵','DEFEATED',number(r.defeated)),metric('最大コンボ','BEST COMBO',number(r.combo)),metric('防いだ攻撃','BLOCKS',number(r.blocks))];break;
    case 'outcam-watermelon-guide':
      title=r.hits===3?say('声がつないだ、3つのヒット。','THREE MELONS. GREAT TEAMWORK.'):say('ふたりの息、合った？','IN SYNC WITH YOUR PARTNER?');hero=`${number(r.hits)} / 3`;unit=say('スイカを割った','MELONS SMASHED');
      hint=say('役割を交代して、もう一回。','Swap who holds the camera and try again.');metrics=[metric('スコア','SCORE',number(r.score))];break;
    case 'outcam-false-bridge':
      title=say('身近な形で、世界がつながった。','ORDINARY SHAPES. FIVE NEW WORLDS.');hero=`${number(r.completed)} / 5`;unit=say('世界クリア','WORLDS COMPLETE');
      hint=say('次は、どんな形を使おう？','What shape will you try next?');metrics=[metric('クリア時間','TIME',seconds(r.seconds*1000)),metric('自分で確認','SELF-JUDGED',number(r.selfJudged))];break;
    case 'outcam-frame-smuggler':
      title=r.inspectionsCleared===4?say('密輸、大成功。','DELIVERY COMPLETE.'):say('検問、くぐり抜けた？','HOW MANY CHECKPOINTS?');
      metrics=[metric('検問クリア','CHECKPOINTS',`${number(r.inspectionsCleared)} / 4`),metric('見つかった回数','CAUGHT',number(r.caught)),metric('最速で隠した','FASTEST HIDE',seconds(r.bestHideMs))];hint=say('撮る人と運ぶ人を交代しよう。','Swap operator and smuggler for the next round.');break;
    case 'solo-daitai-hero':
      title=say('だいたいの腕前、どのくらい？','HOW GOOD WAS YOUR GUESS?');
      metrics=[metric('正解率','ACCURACY',pct(r.accuracy)),metric('最大コンボ','BEST COMBO',number(r.maxCombo)),metric('平均回答時間','AVG. RESPONSE',seconds(r.averageResponseTimeMs))];break;
    case 'outcam-the-camera-is-it':
      title=r.clear?say('5つの道を、つくった。','YOU MADE FIVE PATHS.'):say('道が消えても、もう一度。','A LOST PATH. ANOTHER CHANCE.');hero=`${number(r.completed)} / 5`;unit=say('ステージクリア','STAGES COMPLETE');
      hint=r.clear?say('次の世界も、あなたのフレームで。','Frame a new world next.'):say('彼の足元と、次の足場を一緒に映そう。','Frame his feet and the next landing together.');metrics=[metric('プレイ時間','TIME',seconds(r.seconds*1000))];break;
  }
  return {title,hero,unit,hint,metrics,source:sourceLabel(r.source,locale)};
}

export function resultMarkup(game,r,locale) {
  const ja=locale==='ja',m=resultModel(game,r,locale);
  return `<section class="arcade-result-card"><div class="arcade-edition"><span>${esc(titleOf(game,locale))}</span><span>ROUND COMPLETE</span></div><p class="arcade-result-source">${esc(m.source)}</p><h2>${esc(m.title)}</h2><div class="arcade-result-hero"><div class="arcade-result-art">${artworkMarkup(game)}</div><div><strong>${esc(m.hero)}</strong><span>${esc(m.unit)}</span></div></div><dl class="arcade-result-stats">${m.metrics.map(({label,value})=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="arcade-result-hint">${esc(m.hint)}</p><div class="result-actions"><button type="button" data-result-action="retry">↻ RETRY <small>${ja?'もう一回あそぶ':'PLAY AGAIN'}</small></button><button type="button" data-result-action="share">↗ ${ja?'友達に挑戦状':'CHALLENGE A FRIEND'}</button><button type="button" data-result-action="next">NEXT GAME →</button></div></section>`;
}
