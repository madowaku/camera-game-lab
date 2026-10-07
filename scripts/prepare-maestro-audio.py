"""Render a fixed original 16-bar, 120 BPM arrangement from CC0 VSCO recordings.
No runtime composition, source separation or paid service. Requires numpy/ffmpeg.
"""
from pathlib import Path
import hashlib, json, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Dev\AssetsShared\Audio\VSCO-2-CE-subset')
OUT = ROOT / 'src/maestro/music'
RATE = 22050
DURATION = 32
N = RATE * DURATION
OUT.mkdir(parents=True, exist_ok=True)

def sample(name):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(SOURCE / (name + '.wav')), '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-'])
    value = np.frombuffer(raw, dtype='<f4').copy()
    active = np.flatnonzero(np.abs(value) > max(.001, float(np.max(np.abs(value))) * .02))
    if len(active): value = value[max(0, active[0] - 100):]
    return value / max(.01, float(np.max(np.abs(value))))

samples = {name: sample(name) for name in ['violin', 'spiccato', 'trumpet', 'kick', 'snare', 'cymbal', 'tom', 'bell']}

def note(name, semitones=0, length=None):
    source = samples[name]
    step = 2 ** (semitones / 12)
    size = min(int(len(source) / step), int((length or 4) * RATE))
    value = np.interp(np.arange(size) * step, np.arange(len(source)), source)
    attack = min(size, int(.012 * RATE))
    release = min(size, int(.09 * RATE))
    value[:attack] *= np.linspace(0, 1, attack)
    value[-release:] *= np.linspace(1, 0, release)
    return value

def add(track, value, at, gain):
    start = round(at * RATE)
    end = min(len(track), start + len(value))
    if start < len(track): track[start:end] += value[:end - start] * gain

strings, brass, percussion = [np.zeros(N) for _ in range(3)]
chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
melody = [[72, 76, 79, 76], [76, 72, 69, 72], [72, 69, 76, 72], [74, 79, 74, 67]]
for bar in range(16):
    chord = chords[bar % 4]
    t = bar * 2
    # VSCO filenames use the DAW octave convention: these C4 strings sound C5
    # (about 523 Hz); the trumpet C3 sounds C4 (about 261 Hz).
    for pitch in chord: add(strings, note('violin', pitch - 72, 1.94), t, .12)
    for eighth in range(8):
        pitch = melody[bar % 4][eighth % 4] - (12 if bar < 8 else 0)
        add(strings, note('spiccato', pitch - 72, .23), t + eighth * .25, .18)
    for beat, pitch in enumerate(melody[bar % 4]):
        add(brass, note('trumpet', pitch - 60, .42 if beat != 3 else .46), t + beat * .5, .2 if beat % 2 == 0 else .14)
    for beat in range(4):
        add(percussion, note('kick' if beat % 2 == 0 else 'snare', length=.48), t + beat * .5, .28)
    add(percussion, note('tom', length=.6), t + 1.75, .14)
    if bar % 4 == 0: add(percussion, note('cymbal', length=1.8), t, .12)

def write(name, data, loop=False):
    if loop:
        # Circular ambience preserves identical loop lengths and end-to-start tails.
        data = data + np.roll(data, int(.09 * RATE)) * .1 + np.roll(data, int(.17 * RATE)) * .07
    data = np.tanh(data).astype('<f4') * .65
    dest = OUT / (name + '.ogg')
    # Replace only a complete recording: Vite must never cache a half-written
    # (or momentarily empty) asset when the renderer runs during development.
    temporary = OUT / (name + '.rendering.ogg')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ac', '1', '-ar', str(RATE), '-i', '-', '-c:a', 'libvorbis', '-q:a', '4', str(temporary)], input=data.tobytes(), check=True)
    temporary.replace(dest)
    return {'asset': str(dest.relative_to(ROOT)).replace('\\', '/'), 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'durationSeconds': len(data) / RATE}

rendered = [write(name, data, True) for name, data in zip(['strings', 'brass', 'percussion'], [strings, brass, percussion])]
for name in ['kick', 'snare', 'cymbal', 'tom', 'bell']:
    rendered.append(write(name, note(name, length=2 if name in ['cymbal', 'bell'] else .8)))
finale = np.zeros(RATE * 3)
for pitch in [60, 64, 67, 72]:
    add(finale, note('violin', pitch - 72, 2.8), 0, .18)
    add(finale, note('trumpet', pitch - 60, 2.2), 0, .14)
add(finale, note('kick', length=1.5), 0, .4)
add(finale, note('cymbal', length=3), 0, .3)
rendered.append(write('finale', finale))
(OUT / 'VSCO-LICENSE.txt').write_bytes((SOURCE / 'LICENSE.txt').read_bytes())
manifest = {'verifiedOn': '2026-10-07', 'title': 'Little Theatre', 'composition': 'Original fixed 16-bar C-major arrangement authored for Camera Game Lab; free commercial use.', 'bpm': 120, 'bars': 16,
    'recordings': {'source': 'https://github.com/sgossner/VSCO-2-CE', 'license': 'CC0-1.0', 'licenseUrl': 'https://github.com/sgossner/VSCO-2-CE/blob/master/LICENSE', 'credits': 'Sam Gossner, Simon Dalzell; sample cutting Elan Hickler / Soundemote'},
    'sourceFiles': [{'file': name, 'repositoryPath': path, 'sha256': hashlib.sha256((SOURCE / name).read_bytes()).hexdigest()} for name, path in json.loads((SOURCE / 'sources.json').read_text(encoding='utf-8-sig')).items()],
    'rendered': rendered, 'delivery': 'Three mono Vorbis loops, 22050 Hz, exact 32s; same AudioContext and start time; independent gains. No runtime composition.'}
(ROOT / 'docs/maestro-audio-assets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(json.dumps({'rendered': rendered, 'totalBytes': sum((ROOT / a['asset']).stat().st_size for a in rendered)}, indent=2))
