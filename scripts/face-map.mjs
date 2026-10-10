import fs from 'node:fs/promises'
import sharp from 'sharp'
const face=JSON.parse(await fs.readFile('preview-artifacts/face-vertices.json','utf8'))
const width=1600,height=1100,data=Buffer.alloc(width*height*3,30),depth=new Float32Array(width*height).fill(-Infinity)
for(const v of face){const x=Math.round((v.p[0]+.18)/.36*(width-1)),y=Math.round((.75-v.p[1])/.25*(height-1));for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++){const a=x+dx,b=y+dy;if(a<0||a>=width||b<0||b>=height)continue;const i=b*width+a;if(depth[i]<v.p[2]){depth[i]=v.p[2];for(let k=0;k<3;k++)data[i*3+k]=v.rgb[k]}}}
await sharp(data,{raw:{width,height,channels:3}}).png().toFile('preview-artifacts/face-map.png')
