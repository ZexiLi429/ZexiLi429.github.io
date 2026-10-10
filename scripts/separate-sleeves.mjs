// Cut the generated fused armpit surface into independently moving sleeves and
// close both sides with dark inner fabric. Preserve textured exterior in rest pose.
export function separateSleeves(doc, primitive, field, bodyWeights, armWeights) {
 const buffer=doc.getRoot().listBuffers()[0],p=primitive.getAttribute('POSITION').getArray(),n=primitive.getAttribute('NORMAL').getArray(),uv=primitive.getAttribute('TEXCOORD_0').getArray(),indices=primitive.getIndices().getArray()
 const data={p:[],n:[],uv:[],j:[],w:[],i:[]},cap={p:[],n:[],uv:[],j:[],w:[],i:[]},seams=[]
 const get=i=>({p:Array.from(p.slice(i*3,i*3+3)),n:Array.from(n.slice(i*3,i*3+3)),uv:Array.from(uv.slice(i*2,i*2+2)),s:field[i]})
 const interpolate=(a,b,t)=>({p:a.p.map((v,k)=>v+(b.p[k]-v)*t),n:a.n.map((v,k)=>v+(b.n[k]-v)*t),uv:a.uv.map((v,k)=>v+(b.uv[k]-v)*t),s:0})
 const push=(v,arm,target)=>{const id=target.p.length/3;target.p.push(...v.p);target.n.push(...v.n);target.uv.push(...v.uv);const weights=(arm?armWeights(v.p[0],v.p[1]):bodyWeights(v.p[1])).filter(([,w])=>w>1e-7);for(let k=0;k<4;k++){target.j.push(weights[k]?.[0]??0);target.w.push(weights[k]?.[1]??0)}return id}
 const emit=(poly,arm)=>{for(let k=1;k<poly.length-1;k++){const tri=[poly[0],poly[k],poly[k+1]];if(arm&&tri.reduce((s,v)=>s+v.p[1],0)/3>-.22)continue;for(const v of tri)data.i.push(push(v,arm,data))}}
 const clip=(poly,arm)=>{const out=[];for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],ai=arm?a.s>=0:a.s<=0,bi=arm?b.s>=0:b.s<=0;if(ai)out.push(a);if(ai!==bi)out.push(interpolate(a,b,a.s/(a.s-b.s)))}return out}
 for(let i=0;i<indices.length;i+=3){const tri=[get(indices[i]),get(indices[i+1]),get(indices[i+2])];emit(clip(tri,false),false);emit(clip(tri,true),true);const crossings=[];for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3];if(a.s*b.s<0)crossings.push(interpolate(a,b,a.s/(a.s-b.s)))}if(crossings.length===2)seams.push(crossings)}
 const key=v=>v.p.map(x=>Math.round(x*1e6)).join(','),points=new Map(),adj=new Map()
 for(const [a,b] of seams){const ka=key(a),kb=key(b);if(ka===kb)continue;points.set(ka,a);points.set(kb,b);if(!adj.has(ka))adj.set(ka,new Set());if(!adj.has(kb))adj.set(kb,new Set());adj.get(ka).add(kb);adj.get(kb).add(ka)}
 const seen=new Set();let caps=0
 for(const start of adj.keys()){if(seen.has(start))continue;const loop=[],stack=[start];while(stack.length){const a=stack.pop();if(seen.has(a))continue;seen.add(a);loop.push(points.get(a));for(const b of adj.get(a))if(!seen.has(b))stack.push(b)}if(loop.length<3)continue
 // Order the closed seam by adjacency, not by polar angle on a concave sleeve.
 const ordered=[],visited=new Set();let current=start,prev=null;while(current&&!visited.has(current)){ordered.push(points.get(current));visited.add(current);const next=[...adj.get(current)].find(k=>k!==prev&&!visited.has(k));prev=current;current=next}
 if(ordered.length<3)continue;const center={p:[0,0,0],n:[0,0,1],uv:[0,0],s:0};for(const v of ordered)for(let k=0;k<3;k++)center.p[k]+=v.p[k]/ordered.length
 for(const arm of [false,true]){const sign=Math.sign(center.p[0])*(arm?-1:1);for(let k=0;k<ordered.length;k++){const a={...ordered[k],n:[sign,0,0]},b={...ordered[(k+1)%ordered.length],n:[sign,0,0]},c={...center,n:[sign,0,0]};for(const v of arm?[c,b,a]:[c,a,b])cap.i.push(push(v,arm,cap))}}caps++
 }
 const set=(primitive,target,prefix)=>{for(const [semantic,type,values,ArrayType] of [['POSITION','VEC3',target.p,Float32Array],['NORMAL','VEC3',target.n,Float32Array],['TEXCOORD_0','VEC2',target.uv,Float32Array],['JOINTS_0','VEC4',target.j,Uint16Array],['WEIGHTS_0','VEC4',target.w,Float32Array]])primitive.setAttribute(semantic,doc.createAccessor(prefix+semantic).setType(type).setArray(new ArrayType(values)).setBuffer(buffer));primitive.setIndices(doc.createAccessor(prefix+'Indices').setType('SCALAR').setArray(new Uint32Array(target.i)).setBuffer(buffer))}
 set(primitive,data,'SeparatedSleeves')
 const capPrimitive=doc.createPrimitive().setMaterial(doc.createMaterial('InnerHoodieFabric').setBaseColorFactor([.012,.013,.015,1]).setRoughnessFactor(.95).setDoubleSided(true));set(capPrimitive,cap,'ArmpitLining')
 // The fused underarm contour is not a clean cylindrical seam. A reconstructed
 // sleeve and inner torso shell close it instead of an unreliable triangle fan.
 capPrimitive.dispose()
 return {cutSegments:seams.length,detectedContours:caps,closure:'reconstructed inner torso and sleeve surfaces'}
}
