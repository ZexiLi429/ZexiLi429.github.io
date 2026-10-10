import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS,EXTMeshoptCompression} from '@gltf-transform/extensions'
import {dedup,reorder,textureCompress} from '@gltf-transform/functions'
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer'
import sharp from 'sharp'
import fs from 'node:fs/promises'

await MeshoptEncoder.ready
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder})
const report=[]
for(const [name,resolution,quality] of [['scholar-mobile-v1',1024,88],['scholar-web-v1',2048,92]]){
  const doc=await io.read('public/models/scholar-head.glb')
  await doc.transform(dedup(),reorder({encoder:MeshoptEncoder}),textureCompress({encoder:sharp,targetFormat:'webp',resize:[resolution,resolution],quality}))
  // Lossless vertex coding preserves face-repair coordinates and head skin weights.
  // Do not quantize or simplify the already retouched face.
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({method:EXTMeshoptCompression.EncoderMethod.QUANTIZE})
  const output=`public/models/${name}.glb`;await io.write(output,doc)
  const decoded=await io.read(output)
  report.push({output,bytes:(await fs.stat(output)).size,skins:decoded.getRoot().listSkins().length,joints:decoded.getRoot().listSkins().flatMap(s=>s.listJoints().map(n=>n.getName())),textures:decoded.getRoot().listTextures().map(t=>({mime:t.getMimeType(),size:t.getSize()}))})
}
console.log(JSON.stringify({originalBytes:(await fs.stat('public/models/scholar-head.glb')).size,variants:report},null,2))
