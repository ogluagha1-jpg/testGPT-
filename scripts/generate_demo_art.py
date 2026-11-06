"""Create original illustrative demo posters. Optional regeneration requires Pillow."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math, random
out = Path(__file__).resolve().parents[1] / 'assets' / 'demo'
out.mkdir(parents=True, exist_ok=True)
W,H=720,1080
palettes=[((15,35,48),(181,128,74)),((13,20,40),(82,70,109)),((8,26,44),(26,104,106)),((49,28,51),(211,112,75))]
for n,(top,bottom) in enumerate(palettes):
 random.seed(38+n)
 im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
 for y in range(H):
  t=y/H; d.line((0,y,W,y),fill=tuple(int(a+(b-a)*t) for a,b in zip(top,bottom)))
 if n==2:
  glow=Image.new('RGBA',(W,H)); g=ImageDraw.Draw(glow)
  for band in range(5):
   pts=[(x, int(220+band*35+105*math.sin(x/220+band*.35))) for x in range(-20,W+20,4)]
   g.line(pts, fill=(70,235,165,90-band*12),width=28)
  im=Image.alpha_composite(im.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(18))).convert('RGB');d=ImageDraw.Draw(im)
 for _ in range(65):
  x,y=random.randrange(W),random.randrange(500);r=random.choice([1,1,2]);d.ellipse((x,y,x+r,y+r),fill=(185,191,172))
 if n in [0,3]:
  d.ellipse((380,240,600,460),fill=(230,178,113) if n==0 else (244,173,130))
 if n==1:
  d.ellipse((420,190,530,300),fill=(206,192,166))
  for depth in range(3):
   for x in range(-20,W,46+depth*14):
    y=random.randint(440,700)+depth*75;w=random.randint(35,75)
    d.rectangle((x,y,x+w,H),fill=[(38,44,62),(25,32,49),(12,22,34)][depth])
    for yy in range(y+15,920,30):
     if random.random()>.35: d.rectangle((x+12,yy,x+17,yy+8),fill=(176,143,101))
 else:
  for layer in range(4):
   y=500+layer*140
   pts=[(-20,H),(-20,y)]+[(x,int(y+random.randrange(-140,100))) for x in range(0,W+100,90)]+[(W,H)]
   d.polygon(pts,fill=[(62,87,94),(40,64,76),(22,44,59),(10,26,40)][layer])
 # Fade the lower edge for legible interface overlays; artwork contains no false movie metadata.
 shade=Image.new('RGBA',(W,H));g=ImageDraw.Draw(shade)
 for y in range(H): g.line((0,y,W,y),fill=(5,12,19,int(max(0,(y/H-.5)*1.9)*230)))
 im=Image.alpha_composite(im.convert('RGBA'),shade).convert('RGB')
 im.save(out / f"{['horizon','city','northern','summer'][n]}.jpg", quality=88)
