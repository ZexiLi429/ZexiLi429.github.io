import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {MeshoptDecoder} from 'meshoptimizer'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder})
const fingerprint=doc=>{
  const vertices=[];let triangles=0
  for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
    const names=p.listSemantics().sort(),attributes=names.map(n=>p.getAttribute(n)),count=p.getAttribute('POSITION').getCount()
    for(let i=0;i<count;i++){let row=names.join(',')+':';for(const a of attributes){const n=a.getElementSize(),array=a.getArray();for(let j=0;j<n;j++)row+=array[i*n+j]+','}vertices.push(row)}
    triangles+=p.getIndices().getCount()/3
  }
  return {vertices:vertices.length,triangles,hash:createHash('sha256').update(vertices.sort().join('\n')).digest('hex'),skins:doc.getRoot().listSkins().map(s=>({joints:s.listJoints().map(n=>n.getName()),inverse:Array.from(s.getInverseBindMatrices().getArray())})),clips:doc.getRoot().listAnimations().map(a=>a.getName())}
}
const original=fingerprint(await io.read('public/models/scholar-head.glb'))
for(const file of ['scholar-mobile-v1.glb','scholar-web-v1.glb']){assert.deepEqual(fingerprint(await io.read('public/models/'+file)),original);console.log(file+': geometry, UVs, normals, skin weights and skeleton preserved')}
