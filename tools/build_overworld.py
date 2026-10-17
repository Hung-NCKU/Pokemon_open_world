"""Build six-frame HGSS-style walking sprites; cached sources pinned for reproducibility."""
import concurrent.futures, json, time, urllib.request
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
REV = '73b3fbeb574327cd9420c89e56bef5aa3c08fead'
BASE = f'https://raw.githubusercontent.com/rh-hideout/pokeemerald-expansion/{REV}/'
CACHE = ROOT / '.cache/overworld-source'
OUT = ROOT / 'assets/gen3/overworld'

def fetch(path):
    dest = CACHE / path
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        for attempt in range(4):
            try:
                dest.write_bytes(urllib.request.urlopen(BASE + path, timeout=45).read()); break
            except Exception:
                if attempt == 3: raise
                time.sleep(attempt + 1)
    return dest

def build():
    CACHE.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    treefile = CACHE / 'tree.json'
    if not treefile.exists():
        treefile.write_bytes(urllib.request.urlopen(f'https://api.github.com/repos/rh-hideout/pokeemerald-expansion/git/trees/{REV}?recursive=1').read())
    paths = {e['path'] for e in json.loads(treefile.read_text())['tree']}
    dextext = (ROOT / 'data/pokedex.js').read_text(encoding='utf8')
    dex = json.loads(dextext[dextext.index('{'):dextext.rindex('}')+1])
    aliases = {'nidoran-f':'nidoran_f','nidoran-m':'nidoran_m','mr-mime':'mr_mime','mime-jr':'mime_jr','type-null':'type_null','flabebe':'flabebe'}
    jobs = []
    for n, mon in dex.items():
        slug = aliases.get(mon['en'], mon['en'].replace('-', '_'))
        candidates = [f'graphics/pokemon/{slug}', f'graphics/pokemon/{slug}/normal', f'graphics/pokemon/{slug}/plant', f'graphics/pokemon/{slug}/land', f'graphics/pokemon/{slug}/altered', f'graphics/pokemon/{slug}/incarnate', f'graphics/pokemon/{slug}/shield', f'graphics/pokemon/{slug}/strawberry']
        folder = next((p for p in candidates if p+'/overworld.png' in paths and (p+'/overworld_normal.pal' in paths or p+'/overworld_default.pal' in paths)), None)
        if folder: jobs.append((n, folder))
        else: print('Missing', n, slug)
    def convert(job):
        n, folder = job
        im = Image.open(fetch(folder+'/overworld.png'))
        values = fetch(folder+('/overworld_normal.pal' if folder+'/overworld_normal.pal' in paths else '/overworld_default.pal')).read_text().split()[3:]
        pal = [tuple(map(int, values[i:i+3])) for i in range(0,len(values),3)]
        rgba = Image.new('RGBA', im.size)
        rgba.putdata([(*pal[int(p)],255) if int(p) else (0,0,0,0) for p in im.getdata()])
        # Keep native pixels and six original poses; right faces mirror the left pair.
        rgba.save(OUT / f'{n}.png', optimize=True)
        return n
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        done = list(pool.map(convert, jobs))
    (OUT/'coverage.json').write_text(json.dumps({'revision':REV,'species':sorted(map(int,done))}))
    manifest = ROOT / 'assets/gen3/manifest.js'
    if manifest.exists():
        text = manifest.read_text(encoding='utf8'); man = json.loads(text[text.index('{'):text.rindex('}')+1]); man['overworld'] = list(map(int, done)); manifest.write_text('window.GEN3='+json.dumps(man,ensure_ascii=False)+';\n',encoding='utf8')
    print('Built',len(done),'species;',sum(p.stat().st_size for p in OUT.glob('*.png')),'bytes')
if __name__ == '__main__': build()
