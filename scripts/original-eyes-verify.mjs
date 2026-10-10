import { NodeIO } from '@gltf-transform/core'
import assert from 'node:assert/strict'
const io=new NodeIO(),source=await io.read('public/models/scholar.glb'),rig=await io.read(process.argv[2]||'public/models/scholar-upperbody-rig.glb')
const keys=new Set(),key=(p,n,uv,i)=>[...p.slice(i*3,i*3+3),...n.slice(i*3,i*3+3),...uv.slice(i*2,i*2+2)].map(v=>Math.round(v*1e6)).join(',')
for(const m of source.getRoot().listMeshes())for(const prim of m.listPrimitives()){const p=prim.getAttribute('POSITION').getArray(),n=prim.getAttribute('NORMAL').getArray(),uv=prim.getAttribute('TEXCOORD_0').getArray();for(let i=0;i<p.length/3;i++)if(p[i*3+1]>.48)keys.add(key(p,n,uv,i))}
let checked=0;for(const m of rig.getRoot().listMeshes())for(const prim of m.listPrimitives()){const p=prim.getAttribute('POSITION').getArray(),n=prim.getAttribute('NORMAL').getArray(),uv=prim.getAttribute('TEXCOORD_0')?.getArray();for(let i=0;i<p.length/3;i++)if(p[i*3+1]>.48){assert.ok(uv);assert.ok(keys.has(key(p,n,uv,i)),'Head/eye surface must match source geometry, normals and UV');checked++}}
assert.ok(checked>1000);assert.ok(!rig.getRoot().listNodes().some(n=>['RightEye','LeftEye','FixedEyelids'].includes(n.getName())));console.log(JSON.stringify({originalHeadAndEyes:true,matchedVertices:checked,independentEyeNodes:0}))
