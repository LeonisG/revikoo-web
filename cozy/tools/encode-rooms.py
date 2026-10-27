from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'assets/room/oak'
for source in root.glob('*.png'):
    image=Image.open(source).convert('RGBA')
    assert image.size==(1400,900)
    image.save(source.with_suffix('.webp'),'WEBP',quality=90,method=6,exact=True)
print('Encoded room frames:',len(list(root.glob('*.webp'))))
