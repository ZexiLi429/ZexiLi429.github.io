import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createCharacterGaze } from '../src/lib/character-gaze.ts'
import { createSurfaceGaze } from '../src/lib/character-surface-gaze.ts'

const viewport = document.querySelector('#viewport')
const scene = new THREE.Scene(); scene.background = new THREE.Color('#121c2a')
const camera = new THREE.PerspectiveCamera(35, 1, .01, 100)
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); viewport.append(renderer.domElement)
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, .12, 0); controls.enableDamping = true
const view = side => { camera.position.set(side ? 1.8 : 0, .28, side ? 2.8 : 3.8); controls.update() }; view(false)
scene.add(new THREE.HemisphereLight('#e8f1ff', '#6d5140', 2.1))
const key = new THREE.DirectionalLight('#fff1d9', 3); key.position.set(-2, 3, 4); scene.add(key)
const rim = new THREE.DirectionalLight('#a9caff', 1.5); rim.position.set(2, 1, -2); scene.add(rim)
const gazeOnly = new URLSearchParams(location.search).get('variant')==='gaze'
const original = new URLSearchParams(location.search).get('variant')==='original'
const headOnly = new URLSearchParams(location.search).get('variant')==='head'
const subtle = new URLSearchParams(location.search).get('variant')==='subtle'
if(gazeOnly){document.querySelector('h1').textContent='眼球重建试验 · 未采用';document.querySelector('h1+p').textContent='此试验在近景和侧面仍有接缝，已退出主页。主页及默认动作预览保留原眼睛。'}
const modelPath=(headOnly||subtle)?'/models/scholar-head.glb':original?'/models/scholar-upperbody-rig-v1.glb':gazeOnly?'/models/scholar-gaze.glb':'/models/scholar-upperbody-rig.glb'
const gltf = await new GLTFLoader().loadAsync(modelPath); scene.add(gltf.scene); scene.updateMatrixWorld(true)
if(original){document.querySelector('h1').textContent='原模型眼部';document.querySelector('h1+p').textContent='保留原眼睛和眼皮，没有独立眼球动画。'}
if(headOnly){document.querySelector('h1').textContent='头部转动 · 原眼部外观';document.querySelector('h1+p').textContent='主页采用此模型。脸、眼睛与眼镜一起轻微转动，没有独立眼球跟随。拖动转头滑块，或播放 HeadTurn_Test。';document.querySelector('#head').min=-7;document.querySelector('#head').max=7}
document.querySelector('a[download]').href=modelPath
const meshes = []; gltf.scene.traverse(object => { if (object.isSkinnedMesh) meshes.push(object) })
const skeleton = new THREE.SkeletonHelper(gltf.scene); skeleton.visible = false; scene.add(skeleton)
const mixer = new THREE.AnimationMixer(gltf.scene), head = gltf.scene.getObjectByName('Head')
const bindHead = head.quaternion.clone()
const gaze = createCharacterGaze(gltf.scene)
const surfaceGaze=(subtle||headOnly)?createSurfaceGaze(gltf.scene,subtle):null
const gazeLabel=document.createElement('label');gazeLabel.innerHTML='<input id="gaze" type="checkbox" checked> 眼球跟随镜头';document.querySelector('#skeleton').closest('label').before(gazeLabel)
if(!gaze.eyes.length&&!subtle){document.querySelector('#gaze').checked=false;document.querySelector('#gaze').disabled=true;gazeLabel.append('（已关闭，保留原眼睛）')}
if(subtle){document.querySelector('h1').textContent='原眼部 · 微视线试验';document.querySelector('h1+p').textContent='保留全部原网格、眼皮、眼镜与纹理，只小幅偏移虹膜。此效果由网页着色器实现，不是重建眼球骨骼。';gazeLabel.lastChild.textContent=' 微视线跟随镜头';document.querySelector('a[download]').textContent='下载原外观头部模型（不含网页视线效果）';const label=document.createElement('label');label.innerHTML='手动视线<input id="iris" type="range" min="-100" max="100" value="0" aria-label="手动视线方向">';gazeLabel.after(label);document.querySelector('#iris').oninput=event=>{document.querySelector('#gaze').checked=false;surfaceGaze.setManual(Number(event.target.value)/100)};document.querySelector('#gaze').onchange=event=>{if(!event.target.checked)surfaceGaze.reset()}}
const close=document.createElement('button');close.textContent='眼部特写';close.onclick=()=>{controls.target.set(-.025,.635,.15);camera.position.set(-.025,.635,1.05);controls.update()};document.querySelector('#side').after(close)
if(subtle){document.querySelectorAll('aside > p')[1].textContent='点击“眼部特写”，拖动“手动视线”比较左右变化，归零即可看到原始外观。此试验只适合微幅视线。';if(matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelector('#gaze').checked=false}
else if(headOnly)document.querySelectorAll('aside > p')[1].textContent='拖动转头滑块，或选择 HeadTurn_Test。此版本保留原身体与眼部外观。'
const select = document.querySelector('#clip')
gltf.animations.forEach(clip => select.add(new Option(clip.name, clip.name)))
select.onchange = () => { mixer.stopAllAction(); document.querySelector('#head').value = 0; head.quaternion.copy(bindHead); if(select.value) mixer.clipAction(gltf.animations.find(clip => clip.name === select.value)).reset().play() }
document.querySelector('#head').oninput = event => { mixer.stopAllAction(); select.value = ''; head.quaternion.copy(bindHead).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), Number(event.target.value)*Math.PI/180)) }
document.querySelector('#skeleton').onchange = event => skeleton.visible = event.target.checked
document.querySelector('#front').onclick = () => view(false)
document.querySelector('#side').onclick = () => view(true)
document.querySelector('#status').textContent = `${meshes.length} 个蒙皮网格 · ${meshes[0].skeleton.bones.length} 根骨骼 · ${gltf.animations.length} 段测试动画`
// Compare rest-pose skinning against source vertices, and verify a real head deformation.
let restError = 0, headMovement = 0, lowerMovement = 0
for(const mesh of meshes){ mesh.skeleton.update(); const positions = mesh.geometry.attributes.position; for(let i=0;i<positions.count;i++){const raw=new THREE.Vector3().fromBufferAttribute(positions,i), posed=mesh.applyBoneTransform(i,raw.clone());restError=Math.max(restError,raw.distanceTo(posed))} }
head.rotation.y = .12; scene.updateMatrixWorld(true)
for(const mesh of meshes){mesh.skeleton.update();const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){const raw=new THREE.Vector3().fromBufferAttribute(positions,i), moved=raw.distanceTo(mesh.applyBoneTransform(i,raw.clone()));if(raw.y>.6)headMovement=Math.max(headMovement,moved);if(raw.y<-.5)lowerMovement=Math.max(lowerMovement,moved)}}
head.quaternion.copy(bindHead); scene.updateMatrixWorld(true)
window.rigCheck = { restError, headMovement, lowerMovement, bones: meshes[0].skeleton.bones.length, clips: gltf.animations.map(clip=>clip.name) }
window.rigDebug = { camera, controls, scene, gltf, mixer, gaze, surfaceGaze }
const resize=()=>{camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.updateProjectionMatrix();renderer.setSize(viewport.clientWidth,viewport.clientHeight)};new ResizeObserver(resize).observe(viewport);resize()
const clock=new THREE.Clock();renderer.setAnimationLoop(()=>{const dt=clock.getDelta();mixer.update(dt);controls.update();if(document.querySelector('#gaze').checked&&select.value!=='EyeLook_Test'){gaze.update(camera.position,dt);surfaceGaze?.update(camera.position,dt)}renderer.render(scene,camera)})
