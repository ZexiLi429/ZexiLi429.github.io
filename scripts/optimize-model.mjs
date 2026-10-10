import { NodeIO } from '@gltf-transform/core'
import { dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'

const source = process.argv[2]
if (!source) throw new Error('Usage: node scripts/optimize-model.mjs <original.glb>')
const io = new NodeIO()
const doc = await io.read(source)
await MeshoptSimplifier.ready
await doc.transform(
  dedup(), weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: .16, error: .0015 }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [2048, 2048], quality: 92, chromaSubsampling: '4:4:4' }),
  prune(),
)
await io.write('public/models/scholar.glb', doc)
const triangles = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((n, p) => n + p.getIndices().getCount() / 3, 0)
const report = { source: path.basename(source), bytes: (await fs.stat('public/models/scholar.glb')).size, triangles, skins: doc.getRoot().listSkins().length, animations: doc.getRoot().listAnimations().length }
await fs.writeFile('public/models/model-info.json', JSON.stringify(report, null, 2))
console.log(report)
