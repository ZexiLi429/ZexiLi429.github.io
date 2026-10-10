import {NodeIO} from '@gltf-transform/core'
import fs from 'node:fs/promises'
import sharp from 'sharp'
const doc=await new NodeIO().read('public/models/scholar.glb'), primitive=doc.getRoot().listMeshes()[0].listPrimitives()[0]
const p=primitive.getAttribute('POSITION').getArray(),uv=primitive.getAttribute('TEXCOORD_0').getArray(),idx=primitive.getIndices().getArray()
const keys=new Map(),ids=[],points=[],edges=[]
for(let i=0;i<p.length/3;i++){const key=[p[i*3],p[i*3+1],p[i*3+2]].map(v=>Math.round(v*1e5)).join(',');let id=keys.get(key);if(id===undefined){id=points.length;keys.set(key,id);points.push(Array.from(p.slice(i*3,i*3+3)));edges.push(new Set())}ids.push(id)}
for(let i=0;i<idx.length;i+=3){const v=[ids[idx[i]],ids[idx[i+1]],ids[idx[i+2]]];for(let j=0;j<3;j++){edges[v[j]].add(v[(j+1)%3]);edges[v[(j+1)%3]].add(v[j])}}
for(const cutoff of [-.3,-.4,-.5,-.55]){const seen=new Set(),parts=[];for(let i=0;i<points.length;i++){if(seen.has(i)||points[i][1]>cutoff)continue;const stack=[i],part=[];seen.add(i);while(stack.length){const a=stack.pop();part.push(a);for(const b of edges[a])if(!seen.has(b)&&points[b][1]<=cutoff){seen.add(b);stack.push(b)}}if(part.length>20){const mean=[0,0,0],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const a of part)for(let k=0;k<3;k++){mean[k]+=points[a][k]/part.length;min[k]=Math.min(min[k],points[a][k]);max[k]=Math.max(max[k],points[a][k])}parts.push({n:part.length,mean,min,max})}}console.log(cutoff,JSON.stringify(parts))}
const texture=primitive.getMaterial().getBaseColorTexture();await fs.writeFile('preview-artifacts/source-base.jpg',texture.getImage())
const {data,info}=await sharp(texture.getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true})
const face=[];for(let i=0;i<p.length/3;i++){const x=p[i*3],y=p[i*3+1],z=p[i*3+2];if(y<.5||y>.75||z<.09||Math.abs(x)>.18)continue;const tx=Math.min(info.width-1,Math.max(0,Math.floor(uv[i*2]*info.width))),ty=Math.min(info.height-1,Math.max(0,Math.floor(uv[i*2+1]*info.height))),n=(ty*info.width+tx)*3;face.push({i,p:[x,y,z],uv:[uv[i*2],uv[i*2+1]],rgb:[...data.slice(n,n+3)]})}await fs.writeFile('preview-artifacts/face-vertices.json',JSON.stringify(face));console.log('face',face.length,'vertices',points.length)
