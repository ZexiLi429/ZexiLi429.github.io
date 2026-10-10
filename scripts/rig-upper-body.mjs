import { NodeIO } from '@gltf-transform/core'
import { Matrix4, Quaternion, Euler } from 'three'
import fs from 'node:fs/promises'
import { topology, distances } from './mesh-topology.mjs'
import { rebuildEyes } from './rebuild-eyes.mjs'
import { separateSleeves } from './separate-sleeves.mjs'
import { sleeveLining } from './sleeve-lining.mjs'
import { prune, weld } from '@gltf-transform/functions'
const headOnly = process.argv.includes('--head-only')
const gazeOnly = headOnly || process.argv.includes('--gaze-only')
const originalEyes = headOnly || (!gazeOnly && !process.argv.includes('--experimental-eyes'))

// A conservative spatial binding for this specific partial character.
// This is a reviewable prototype, not a general auto-rigger or a facial rig.
const io = new NodeIO(), doc = await io.read('public/models/scholar.glb')
const meshNode = doc.getRoot().listNodes().find(node => node.getMesh())
const identity = new Matrix4().elements
if (meshNode.getWorldMatrix().some((value, i) => Math.abs(value - identity[i]) > 1e-6)) throw new Error('Expected identity source transform')
const joints = [
  ['Root', -1, [0, 0, 0]], ['Hips', 0, [0, -.64, 0]],
  ['Spine', 1, [0, -.25, -.025]], ['Chest', 2, [0, .13, -.025]],
  ['Neck', 3, [0, .36, -.01]], ['Head', 4, [0, .49, .03]],
  ['LeftShoulder', 3, [.17, .22, -.03]], ['LeftUpperArm', 6, [.33, .19, -.02]],
  ['LeftForeArm', 7, [.46, -.23, .015]], ['LeftHand', 8, [.465, -.54, .10]],
  ['RightShoulder', 3, [-.17, .22, -.03]], ['RightUpperArm', 10, [-.33, .19, -.02]],
  ['RightForeArm', 11, [-.46, -.23, .015]], ['RightHand', 12, [-.465, -.54, .10]],
]
const buffer = doc.getRoot().listBuffers()[0]
const nodes = joints.map(([name]) => doc.createNode(name))
const inverse = new Float32Array(joints.length * 16)
for (const [i, [, parent, position]] of joints.entries()) {
  const origin = parent < 0 ? [0, 0, 0] : joints[parent][2]
  nodes[i].setTranslation(position.map((value, j) => value - origin[j]))
  if (parent >= 0) nodes[parent].addChild(nodes[i])
  inverse.set(new Matrix4().makeTranslation(-position[0], -position[1], -position[2]).elements, i * 16)
}
doc.getRoot().listScenes()[0].addChild(nodes[0])
const skin = doc.createSkin('ScholarUpperBodyPrototype').setSkeleton(nodes[0])
nodes.forEach(node => skin.addJoint(node))
skin.setInverseBindMatrices(doc.createAccessor('InverseBindMatrices').setType('MAT4').setArray(inverse).setBuffer(buffer))
meshNode.setSkin(skin)
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const split = (a, b, t) => [[a, 1 - t], [b, t]]
const bodyWeights = y => {
  const levels = [[1, -.64], [2, -.25], [3, .13], [4, .36], [5, .49]]
  if (y <= levels[0][1]) return [[1, 1]]
  for (let i = 0; i < levels.length - 1; i++) if (y < levels[i + 1][1]) return split(levels[i][0], levels[i + 1][0], smooth(levels[i][1], levels[i + 1][1], y))
  return [[5, 1]]
}
const armWeights = (x, y) => {
  const offset = x > 0 ? 6 : 10
  if (y > .14) return split(offset, offset + 1, smooth(.22, .36, Math.abs(x)))
  if (y > -.33) return split(offset + 1, offset + 2, 1 - smooth(-.33, -.14, y))
  return split(offset + 2, offset + 3, 1 - smooth(-.57, -.50, y))
}
let vertices = 0, maxWeightError = 0
const influenceCounts = new Array(joints.length).fill(0)
let sleeveReport
for (const primitive of meshNode.getMesh().listPrimitives()) {
  const graph = topology(primitive)
  const bodyDistance = distances(graph, ([x,y]) => Math.abs(x) < .25 || y > .32 || (y < .06 && Math.abs(x) < .345) || (y < -.48 && Math.abs(x) < .375))
  const armDistance = distances(graph, ([x,y]) => Math.abs(x) > .405 && y < .12 && y > -.72, ([x,y]) => Math.abs(x) > .2 && y < .36 && y > -.73)
  const field = new Float32Array(graph.ids.length)
  for(let i=0;i<field.length;i++){const id=graph.ids[i],[x,y]=graph.points[id];field[i]=Number.isFinite(armDistance[id])?bodyDistance[id]-armDistance[id]:-.1;if(y<-.5)field[i]=Math.abs(x)>.38?.1:-.1}
  const position = primitive.getAttribute('POSITION').getArray(), count = position.length / 3
  const jointIndices = new Uint16Array(count * 4), weights = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    const x = position[i * 3], y = position[i * 3 + 1]
    // Surface distance follows sleeves around the body; fingers never blend into hips.
    const id = graph.ids[i]
    let arm = Number.isFinite(armDistance[id]) ? smooth(-.035, .035, bodyDistance[id] - armDistance[id]) : 0
    if (y < -.5) arm = Math.abs(x) > .38 ? 1 : 0
    const combined = new Map()
    for (const [bone, weight] of bodyWeights(y)) combined.set(bone, (combined.get(bone) ?? 0) + weight * (1 - arm))
    for (const [bone, weight] of armWeights(x, y)) combined.set(bone, (combined.get(bone) ?? 0) + weight * arm)
    const best = [...combined].filter(([, value]) => value > 1e-7).sort((a, b) => b[1] - a[1]).slice(0, 4)
    const sum = best.reduce((value, [, weight]) => value + weight, 0)
    for (const [j, [bone, weight]] of best.entries()) { jointIndices[i * 4 + j] = bone; weights[i * 4 + j] = weight / sum; influenceCounts[bone]++ }
    maxWeightError = Math.max(maxWeightError, Math.abs(weights.subarray(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0) - 1))
  }
  primitive.setAttribute('JOINTS_0', doc.createAccessor('UpperBodyJoints').setType('VEC4').setArray(jointIndices).setBuffer(buffer))
  primitive.setAttribute('WEIGHTS_0', doc.createAccessor('UpperBodyWeights').setType('VEC4').setArray(weights).setBuffer(buffer))
  vertices += count
  if(!gazeOnly) sleeveReport = separateSleeves(doc, primitive, field, bodyWeights, armWeights)
}
const addAnimation = (name, tracks) => {
  const animation = doc.createAnimation(name)
  const times = [0, 1, 2, 3, 4]
  const input = doc.createAccessor(`${name}Time`).setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buffer)
  for (const [bone, angles] of tracks) {
    const output = new Float32Array(times.length * 4)
    angles.forEach((angle, i) => output.set(new Quaternion().setFromEuler(new Euler(...angle)).toArray(), i * 4))
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor(`${name}${bone}`).setType('VEC4').setArray(output).setBuffer(buffer)).setInterpolation('LINEAR')
    animation.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(nodes.find(node=>node.getName()===bone)).setTargetPath('rotation').setSampler(sampler))
  }
}
addAnimation('HeadTurn_Test', [['Head', [[0, 0, 0], [0, .12, 0], [0, 0, 0], [0, -.12, 0], [0, 0, 0]]]])
if(!gazeOnly) addAnimation('Wave_Test', [
 ['RightUpperArm', [[0,0,0], [-.25,0,-1.2],[-.25,0,-1.2],[-.25,0,-1.2],[0,0,0]]],
 ['RightForeArm', [[0,0,0],[-1.35,0,0],[-1.35,0,0],[-1.35,0,0],[0,0,0]]],
 ['RightHand', [[0,0,0],[.4,-.9,-.15],[.4,-.9,.15],[.4,-.9,-.15],[0,0,0]]],
])
addAnimation('IdleUpperBody_Test', [['Chest', [[0, 0, 0], [.005, 0, .003], [0, 0, 0], [-.005, 0, -.003], [0, 0, 0]]]])
const eyeReport = originalEyes ? null : await rebuildEyes(doc, meshNode.getMesh().listPrimitives()[0], nodes, nodes[5])
if(!gazeOnly) sleeveLining(doc, meshNode.getMesh(), bodyWeights)
if(eyeReport){const eyeInverses = new Float32Array(16*16);eyeInverses.set(inverse)
eyeReport.eyes.forEach((eye,i)=>{skin.addJoint(nodes[14+i]);eyeInverses.set(new Matrix4().makeTranslation(...eye.center.map(v=>-v)).elements,(14+i)*16)})
skin.getInverseBindMatrices().setArray(eyeInverses)
addAnimation('EyeLook_Test', eyeReport.eyes.map(eye=>[eye.name,[[0,0,0],[0,.12,0],[0,0,0],[0,-.12,0],[0,0,0]]]))
}
doc.getRoot().setExtras({ rigStatus: headOnly?'head-turn-original-surface':gazeOnly?'gaze-preserved-body':'reconstructed-sleeves-prototype', independentEyes: !originalEyes, originalEyes, missingLowerLegs: true, independentFingers: false, intendedUse: headOnly?'small head rotations only; original face, eyes and body retained':gazeOnly?'experimental eye tracking, rejected for visible seams':'basic arm/wrist greeting; reconstructed simplified sleeves, original fixed finger pose' })
await doc.transform(weld(),prune({keepLeaves:true}))
const output=headOnly?'scholar-head.glb':gazeOnly?'scholar-gaze.glb':'scholar-upperbody-rig.glb'
await io.write(`public/models/${output}`, doc)
const report = { status: gazeOnly?'rejected-eye-experiment':'reconstructed-prototype', source: 'scholar.glb', output, joints: skin.listJoints().map((node,i)=>({name:node.getName(),influencedVertices:influenceCounts[i]??0})), skins: 1, clips: doc.getRoot().listAnimations().map(animation => animation.getName()), sourceVertices:vertices, vertices:doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((s,p)=>s+p.getAttribute('POSITION').getCount(),0),0), maxWeightError, independentEyes: !originalEyes, originalEyes, eyeReport, sleeveReport, bytes:(await fs.stat(`public/models/${output}`)).size, note: originalEyes?'Original eyes preserved exactly; no independent eye tracking. Basic arm/wrist greeting with simplified sleeves and fixed original fingers.':gazeOnly?'Rejected eye reconstruction experiment; visible aperture seams. Not used by homepage.':'Basic arm/wrist greeting; upper sleeves and inner torso reconstructed, fixed original fingers. No finger, blink or leg animation.' }
if(headOnly){report.status='head-turn-original-surface';report.note='Small head rotation, original body/face/eye geometry and textures; no independent eye or arm animation.'}
await fs.writeFile(`public/models/${headOnly?'head-info':gazeOnly?'gaze-info':'upperbody-rig-info'}.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
