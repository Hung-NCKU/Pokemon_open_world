"""Extend Emerald's menu atlas so party and PC never fetch one URL per icon."""
import concurrent.futures,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
def build():
    out=ROOT/'assets/gen3';cache=ROOT/'.cache/menu-icons';cache.mkdir(parents=True,exist_ok=True)
    def fetch(n):
        p=cache/f'{n}.png'
        if not p.exists():p.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/sprites/289e842364648ec0495ae4ba12f48d5cbfbf670b/sprites/pokemon/versions/generation-vii/icons/{n}.png',timeout=45).read())
        return n,p
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:icons=dict(pool.map(fetch,range(387,808)))
    old=Image.open(out/'mon_icons.png').convert('RGBA')
    sheet=Image.new('RGBA',(1024,((1025+31)//32)*64));sheet.paste(old.crop((0,0,1024,13*64)),(0,0))
    for n in range(387,1026):
        im=Image.open(icons[n] if n<=807 else out/f'battle/{n}.png').convert('RGBA')
        bbox=im.getbbox()
        if bbox:im=im.crop(bbox)
        im.thumbnail((30,30),Image.Resampling.NEAREST)
        x=((n-1)%32)*32+(32-im.width)//2;y=((n-1)//32)*64+(32-im.height)//2
        sheet.paste(im,(x,y));sheet.paste(im,(x,y+32))
    sheet.save(out/'mon_icons.png',optimize=True)
    print('Menu atlas: 1025 species,', (out/'mon_icons.png').stat().st_size,'bytes')
if __name__=='__main__':build()
