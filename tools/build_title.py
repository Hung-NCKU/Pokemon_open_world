"""Recompose the existing Emerald title tiles; never upscale or smooth source pixels."""
import os
from PIL import Image
from gen3_tiles import render_tilemap, png_rgba


def build_title(root, out):
    source = os.path.join(root, '.cache', 'pokeemerald', 'graphics', 'title_screen')
    if not os.path.isfile(os.path.join(source, 'rayquaza.bin')):
        return False
    pal = os.path.join(source, 'rayquaza_and_clouds.pal')
    background = Image.new('RGBA', (240, 160), (0, 74, 98, 255))
    for name in ['clouds', 'rayquaza']:
        layer = render_tilemap(os.path.join(source, name + '.png'), os.path.join(source, name + '.bin'), pal, 32, pal_offset=14)
        background.alpha_composite(layer.crop((0, 0, 240, 160)))
    background.save(os.path.join(out, 'title_background.png'))
    logo = png_rgba(os.path.join(source, 'pokemon_logo.png'), os.path.join(source, 'pokemon_logo.pal'))
    logo.crop(logo.getbbox()).save(os.path.join(out, 'title_pokemon.png'))
    return True
