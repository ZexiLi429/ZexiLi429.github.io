import { SphereGeometry } from 'three'
import sharp from 'sharp'

// Rebuild eyes behind existing eyelids. Source eye texture is removed only inside
// the aperture; glasses and surrounding face remain untouched.
export async function rebuildEyes(doc, primitive, bones, head) {
 const buffer=doc.getRoot().listBuffers()[0]
 const eyes=[{name:'RightEye',center:[-.087,.642,.184],rx:.027,ry:.007,slope:.19},{name:'LeftEye',center:[.048,.667,.184],rx:.028,ry:.0075,slope:.17}]
 const p=primitive.getAttribute('POSITION').getArray(),indices=primitive.getIndices().getArray(),kept=[];let removed=0
 const attributes=primitive.listSemantics().map(name=>({name,accessor:primitive.getAttribute(name),size:primitive.getAttribute(name).getElementSize(),array:Array.from(primitive.getAttribute(name).getArray())}))
 const eyeTriangles=[]
 const sourceUV=primitive.getAttribute('TEXCOORD_0').getArray()
 const texturedTriangles=[]
 for(let i=0;i<indices.length;i+=3){const tri=[indices[i],indices[i+1],indices[i+2]].map(a=>Array.from(p.slice(a*3,a*3+3)));if(tri.some(q=>eyes.some(e=>Math.abs(q[0]-e.center[0])<.04&&Math.abs(q[1]-e.center[1])<.023&&q[2]>.195&&q[2]<.232)))eyeTriangles.push(tri)}
 const surfaceZ=(x,y)=>{let z=-Infinity;for(const [a,b,c] of eyeTriangles){const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-10)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;if(u>=-.001&&v>=-.001&&u+v<=1.001){const candidate=u*a[2]+v*b[2]+(1-u-v)*c[2];if(candidate<.233)z=Math.max(z,candidate)}}return Number.isFinite(z)?z:.22}
 for(let i=0;i<indices.length;i+=3){const ids=[indices[i],indices[i+1],indices[i+2]],tri=ids.map(a=>Array.from(p.slice(a*3,a*3+3)));if(tri.some(q=>eyes.some(e=>Math.abs(q[0]-e.center[0])<.025&&Math.abs(q[1]-e.center[1])<.018&&q[2]>.195&&q[2]<.232)))texturedTriangles.push({p:tri,uv:ids.map(a=>Array.from(sourceUV.slice(a*2,a*2+2)))})}
 const sourcePixels=await sharp(primitive.getMaterial().getBaseColorTexture().getImage()).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const vertex=i=>attributes.map(a=>a.array.slice(i*a.size,(i+1)*a.size))
 const posIndex=attributes.findIndex(a=>a.name==='POSITION')
 const mid=(a,b)=>a.map((values,j)=>values.map((v,k)=>attributes[j].name==='JOINTS_0'?v:(v+b[j][k])/2))
 const cut=(a,b,c,depth)=>{if(depth){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);cut(a,ab,ca,depth-1);cut(ab,b,bc,depth-1);cut(ca,bc,c,depth-1);cut(ab,bc,ca,depth-1);return}
 const centroid=a[posIndex].map((v,k)=>(v+b[posIndex][k]+c[posIndex][k])/3)
 const inside=eyes.some(e=>{const x=centroid[0]-e.center[0],y=centroid[1]-e.center[1]-e.slope*x;return (x/e.rx)**2+(y/e.ry)**2<1&&centroid[2]>.195&&centroid[2]<.232})
 if(inside){removed++;return}for(const v of [a,b,c]){kept.push(attributes[posIndex].array.length/3);for(let j=0;j<attributes.length;j++)attributes[j].array.push(...v[j])}
 }
 for(let i=0;i<indices.length;i+=3){const v=[indices[i],indices[i+1],indices[i+2]]
 const near=v.some(a=>eyes.some(e=>Math.abs(p[a*3]-e.center[0])<.04&&Math.abs(p[a*3+1]-e.center[1])<.023&&p[a*3+2]>.19&&p[a*3+2]<.233))
 if(near)cut(...v.map(vertex),3);else kept.push(...v)
 }
 for(const a of attributes){if(a.name==='NORMAL')for(let i=0;i<a.array.length;i+=3){const length=Math.hypot(...a.array.slice(i,i+3))||1;for(let k=0;k<3;k++)a.array[i+k]/=length}a.accessor.setArray(new (a.accessor.getArray().constructor)(a.array))}
 primitive.setIndices(doc.createAccessor('FaceWithoutEyeApertures').setType('SCALAR').setArray(new Uint32Array(kept)).setBuffer(buffer))
 let lines='';for(let i=0;i<90;i++){const a=i*Math.PI*2/90,r=90+(i%5)*3;lines+=`<path d="M ${256+Math.cos(a)*52} ${256+Math.sin(a)*52} L ${256+Math.cos(a)*r} ${256+Math.sin(a)*r}" stroke="${i%2?'#68422d':'#241b16'}" stroke-width="2" opacity=".55"/>`}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs><radialGradient id="white"><stop stop-color="#bdb6b1"/><stop offset="1" stop-color="#a89a90"/></radialGradient><radialGradient id="iris"><stop stop-color="#201912"/><stop offset=".5" stop-color="#493322"/><stop offset=".85" stop-color="#30231b"/><stop offset="1" stop-color="#181815"/></radialGradient></defs><rect width="512" height="512" fill="url(#white)"/><circle cx="256" cy="256" r="155" fill="url(#iris)"/>${lines}<circle cx="256" cy="256" r="78" fill="#070809"/><ellipse cx="230" cy="220" rx="15" ry="10" fill="#eee8dc" opacity=".65"/><circle cx="284" cy="289" r="5" fill="#deddd9" opacity=".3"/></svg>`
 const texture=doc.createTexture('RebuiltBrownEyes').setImage(await sharp(Buffer.from(svg)).png().toBuffer()).setMimeType('image/png')
 const material=doc.createMaterial('RebuiltEyes').setBaseColorTexture(texture).setRoughnessFactor(.42).setMetallicFactor(0)
 const geometry=new SphereGeometry(1,64,40),gp=geometry.attributes.position.array,gn=geometry.attributes.normal.array,uv=new Float32Array(gp.length/3*2)
 const positions=new Float32Array(gp.length),normals=new Float32Array(gn.length)
 for(let i=0;i<gp.length/3;i++){positions[i*3]=gp[i*3]*.036;positions[i*3+1]=gp[i*3+1]*.025;positions[i*3+2]=gp[i*3+2]*.038;normals.set(gn.slice(i*3,i*3+3),i*3);uv[i*2]=gp[i*3+2]>0?gp[i*3]*.036/.04+.5:0;uv[i*2+1]=gp[i*3+2]>0?gp[i*3+1]*.025/.04+.5:0}
 const eyePrimitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor('EyePosition').setType('VEC3').setArray(positions).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor('EyeNormal').setType('VEC3').setArray(normals).setBuffer(buffer)).setAttribute('TEXCOORD_0',doc.createAccessor('EyeUV').setType('VEC2').setArray(uv).setBuffer(buffer)).setIndices(doc.createAccessor('EyeIndices').setType('SCALAR').setArray(new Uint16Array(geometry.index.array)).setBuffer(buffer)).setMaterial(material)
 const mesh=doc.createMesh('RebuiltEyeball').addPrimitive(eyePrimitive)
 for(const e of eyes){
  const pixels=Buffer.alloc(256*256*3)
  for(let row=0;row<256;row++)for(let col=0;col<256;col++){const dx=(col/255-.5)*.04,dy=(row/255-.5)*.04,color=[165,157,152];{let z=-Infinity,sample=null;const x=e.center[0]+dx,y=e.center[1]+dy;for(const tri of texturedTriangles){const [a,b,c]=tri.p,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(det)<1e-10)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;if(u>=0&&v>=0&&u+v<=1){const depth=u*a[2]+v*b[2]+(1-u-v)*c[2];if(depth>z&&depth<.232){z=depth;sample=tri.uv[0].map((value,k)=>u*value+v*tri.uv[1][k]+(1-u-v)*tri.uv[2][k])}}}if(sample){const tx=Math.min(sourcePixels.info.width-1,Math.max(0,Math.round(sample[0]*(sourcePixels.info.width-1)))),ty=Math.min(sourcePixels.info.height-1,Math.max(0,Math.round(sample[1]*(sourcePixels.info.height-1)))),i=(ty*sourcePixels.info.width+tx)*3;for(let k=0;k<3;k++)color[k]=sourcePixels.data[i+k]}}
   pixels.set(color,(row*256+col)*3)
  }
  const irisTexture=doc.createTexture(e.name+'OriginalIris').setImage(await sharp(pixels,{raw:{width:256,height:256,channels:3}}).png().toBuffer()).setMimeType('image/png')
  const irisMaterial=material.clone().setName(e.name+'Material').setBaseColorTexture(irisTexture).setRoughnessFactor(1)
  const eyeMesh=doc.createMesh(e.name+'Mesh').addPrimitive(eyePrimitive.clone().setMaterial(irisMaterial))
  const node=doc.createNode(e.name).setTranslation(e.center.map((v,i)=>v-[0,.49,.03][i]));head.addChild(node);node.addChild(doc.createNode(`${e.name}Surface`).setMesh(eyeMesh));bones.push(node)
 }
 mesh.dispose();eyePrimitive.dispose();material.dispose();texture.dispose()
 // Fixed eyelid edge conceals the tessellated aperture without moving with gaze.
 const rp=[],rn=[],ri=[]
 for(const e of eyes){const offset=rp.length/3;for(let ring=0;ring<2;ring++)for(let i=0;i<=128;i++){const angle=i/128*Math.PI*2,scale=ring?1.035:.98,x=e.center[0]+Math.cos(angle)*e.rx*scale,y=e.center[1]+Math.sin(angle)*e.ry*scale+e.slope*(x-e.center[0]);rp.push(x,y-.49,surfaceZ(x,y)-.03+.0007);rn.push(0,0,1)}for(let i=0;i<128;i++){const a=offset+i,b=a+129;ri.push(a,b,a+1,a+1,b,b+1)}}
 const rimPrimitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor('LidPosition').setType('VEC3').setArray(new Float32Array(rp)).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor('LidNormal').setType('VEC3').setArray(new Float32Array(rn)).setBuffer(buffer)).setIndices(doc.createAccessor('LidIndex').setType('SCALAR').setArray(new Uint16Array(ri)).setBuffer(buffer)).setMaterial(doc.createMaterial('FixedEyelidEdge').setBaseColorFactor([.12,.065,.046,1]).setRoughnessFactor(.85).setDoubleSided(true))
 // Keep a fixed marker for tests; discard the synthetic outline that looked pasted on.
 rimPrimitive.dispose();head.addChild(doc.createNode('FixedEyelids'))
 geometry.dispose();return {eyes,removedTriangles:removed}
}
