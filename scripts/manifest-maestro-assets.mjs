import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const asset = path => {
  const absolute = resolve(root,path);
  return {path:relative(root,absolute).replaceAll('\\','/'),bytes:statSync(absolute).size,sha256:createHash('sha256').update(readFileSync(absolute)).digest('hex')};
};
const source = path => ({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});
const manifest = {
  verifiedOn:'2026-10-07',
  images:{
    generator:'Built-in OpenAI Imagegen tool; no model version selector exposed.',
    prompts:'docs/maestro-image-prompts.md',
    orchestra:{
      source:'C:/Users/hiro/.codex/generated_images/01a1160c-7c63-7452-90ca-efc97fde248a/exec-a6b06c86-a621-467e-9626-19711308ade4.png',
      original:asset('src/maestro/assets/orchestra-v1.png'),runtime:asset('src/maestro/assets/orchestra-v1.webp'),
      processing:'2172x724 RGBA source; 1440x480 WebP; true alpha preserved. Three equal atlas cells. No third-party reference images.'
    },
    cover:{
      source:'C:/Users/hiro/.codex/generated_images/01a1160c-7c63-7452-90ca-efc97fde248a/exec-2c4659c1-ece1-42bc-983f-c693fa9a0ed8.png',
      original:asset('src/maestro/assets/cover-v1.png'),runtime:asset('src/maestro/assets/cover-v1.webp'),preview:asset('public/previews/maestro.webp'),
      processing:'Portrait source retained; 768px-wide WebP cover and 432px-wide feed preview. Title and interactive controls rendered in code.'
    }
  },
  orchestraMusic:{manifest:'docs/maestro-audio-assets.json',renderer:'scripts/prepare-maestro-audio.py',license:'CC0 recordings; original fixed arrangement for this project.',delivery:'Three 32-second stems at 120 BPM, plus sample-based one-shots. Inline lazy JS assets; no standalone audio in public/dist.'},
  applause:{
    title:'拍手 群衆03-3（短）',creator:'OtoLogic',
    page:'https://otologic.jp/free/se/applause-cheer01.html',terms:'https://otologic.jp/free/license.html',
    license:'CC-BY-4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',
    archive:source('C:/Dev/AssetsShared/Audio/OtoLogic/Applause-Crowd03-mp3.zip'),
    source:source('C:/Dev/AssetsShared/Audio/OtoLogic/Applause-Crowd03/Applause-Crowd03/Applause-Crowd03-3(Short).mp3'),
    runtime:asset('src/maestro/assets/applause.ogg'),
    processing:'First 4 seconds; gain 0.6; fade-out from 3 to 4 seconds; mono 22050Hz Vorbis quality 4.',
    attribution:'SE: OtoLogic (CC BY 4.0). Volume, length and encoding edited. Linked in live game and how-to sheet.',
    acquisition:'Official ZIP link downloaded through the browser; local source archive retained in AssetsShared.'
  },
  confirmation:{
    creator:'Kenney',page:'https://kenney.nl/assets/interface-sounds',license:'CC0-1.0',
    source:source('C:/Dev/AssetsShared/Audio/SE/kenney_interface-sounds/Audio/confirmation_001.ogg'),
    runtime:asset('src/maestro/assets/confirmation.ogg'),licenseFile:'src/maestro/assets/KENNEY-LICENSE.txt',processing:'Unmodified source copy.'
  },
  optionalPlaygroundBacking:{
    title:'おもちゃの一日',creator:'いまたく',page:'https://opentracks.com/bgm/detail/7044',
    license:'OpenTracks commercial background-use license',terms:'https://opentracks.com/help/articles/license/',creatorTerms:'https://opentracks.com/creator/detail/273#terms-of-use',
    runtime:asset('src/assets/music/toy-drum.mp3'),existingProvenance:'docs/toy-drum-assets.json',
    delivery:'Existing licensed inline MusicBed. Off by default; only active play; mute, pause, background and exit stop it. No source download, recording or export.'
  }
};
writeFileSync(resolve(root,'docs/maestro-assets.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Saved docs/maestro-assets.json');
