import sys, json
from PIL import Image
d=sys.argv[1]; tl=json.load(open(f'{d}/timeline.json'))
fs=[]
for e in tl:
  if e['t'] in ('still','tap'): fs.append(e['img'])
  if e['t']=='seq': fs.append(e['frames'][-1][0])
ims=[Image.open(f).resize((150,325)) for f in fs]
cols=min(10,len(ims)); rows=(len(ims)+cols-1)//cols
o=Image.new('RGB',(150*cols,325*rows),'white')
for k,im in enumerate(ims): o.paste(im,((k%cols)*150,(k//cols)*325))
o.save(f'/tmp/sh_{d}.jpg'); print(d, len(fs))
