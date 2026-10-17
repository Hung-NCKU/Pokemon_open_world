"""Mirror battle sprites to same-origin assets; record exactly which variants exist."""
import concurrent.futures,json,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/gen3/battle'; CACHE=ROOT/'.cache/battle-source'
BASE='https://raw.githubusercontent.com/PokeAPI/sprites/289e842364648ec0495ae4ba12f48d5cbfbf670b/sprites/pokemon/'
def build():
    text=(ROOT/'data/pokedex.js').read_text(encoding='utf8');dex=json.loads(text[text.index('{'):text.rindex('}')+1])
    jobs=[f'{variant}{n}.png' for n in dex for variant in ('','back/')]
    jobs += [f'versions/generation-iii/emerald/{variant}{n}.png' for n in range(1,387) for variant in ('','back/','shiny/','back/shiny/')]
    jobs += [f'versions/generation-v/black-white/animated/{variant}{n}.gif' for n in range(387,650) for variant in ('','back/')]
    def fetch(path):
        dest=OUT/path;dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists():return path
        for attempt in range(3):
            try:
                data=urllib.request.urlopen(BASE+path,timeout=30).read()
                if not (data.startswith(b'\x89PNG') or data.startswith(b'GIF8')):raise ValueError('Not PNG')
                dest.write_bytes(data);return path
            except urllib.error.HTTPError as e:
                if e.code==404:return None
                if attempt==2:raise
            except Exception:
                if attempt==2:raise
            time.sleep(attempt+1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:done=[p for p in pool.map(fetch,jobs) if p]
    manifest=ROOT/'assets/gen3/manifest.js';text=manifest.read_text(encoding='utf8');man=json.loads(text[text.index('{'):text.rindex('}')+1]);man['battleSprites']=done;manifest.write_text('window.GEN3='+json.dumps(man,ensure_ascii=False)+';\n',encoding='utf8')
    from build_menu_icons import build as build_menu_icons
    build_menu_icons()
    text=manifest.read_text(encoding='utf8');man=json.loads(text[text.index('{'):text.rindex('}')+1]);man['ui']['icons']=1025;manifest.write_text('window.GEN3='+json.dumps(man,ensure_ascii=False)+';\n',encoding='utf8')
    print('Local battle sprites:',len(done))
if __name__=='__main__':build()
