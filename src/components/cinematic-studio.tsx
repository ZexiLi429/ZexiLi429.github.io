import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { createCharacterHead } from '../lib/character-head'
import { createSurfaceGaze } from '../lib/character-surface-gaze'
import { exhibits } from '../lib/exhibits'
import { DAILY_URL, drawDailyDesk, type DeskState } from '../lib/daily-desk'
import { createStudioDog, createDogStep, createDogDishes, type DogPreview } from '../lib/studio-dog'

type Props = { onStatus: (status: 'loading' | 'ready' | 'error') => void; onProgress: (value:number)=>void; reduced: boolean; selectedFocus: number | null; lang: 'zh' | 'en'; onOpenExhibit: (index: number) => void; dailyDesk: DeskState }
type V = [number, number, number]
type Shot = { c: V; t: V; fov: number; turn: number; seat: number; arc?: V }
type Key = { y: number; shot: Shot }
const ease = (x: number) => { const t = THREE.MathUtils.clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }

export function StudioScene({ onStatus, onProgress, reduced, selectedFocus, lang, onOpenExhibit, dailyDesk }: Props) {
  const host = useRef<HTMLDivElement>(null), selection = useRef(selectedFocus)
  const hotspots = useRef<HTMLDivElement>(null)
  const pickExhibit = useRef<((x:number,y:number)=>number|null) | null>(null)
  const highlightExhibit = useRef<((index:number|null)=>void) | null>(null)
  const computerLink = useRef<HTMLAnchorElement>(null)
  const pickComputer = useRef<((x:number,y:number)=>boolean) | null>(null)
  const deskData = useRef(dailyDesk)
  const refreshScreen = useRef<(()=>void) | null>(null)
  const [dogPaused, setDogPaused] = useState(false)
  const dogTarget=useRef<HTMLButtonElement>(null)
  const petDog=useRef<((x?:number,y?:number)=>boolean)|null>(null)
  const [petFeedback,setPetFeedback]=useState(false)
  useEffect(()=>{if(!petFeedback)return;const timer=setTimeout(()=>setPetFeedback(false),3200);return()=>clearTimeout(timer)},[petFeedback])
  const dogPause = useRef(false)
  useEffect(()=>{dogPause.current=dogPaused},[dogPaused])
  useEffect(()=>{deskData.current=dailyDesk;refreshScreen.current?.()},[dailyDesk])
  useEffect(() => { selection.current = selectedFocus; if (host.current) host.current.dataset.cameraSettled = 'false' }, [selectedFocus])
  useEffect(() => {
    if (!host.current) return
    const container = host.current
    const compact=innerWidth<760
    let renderRatio=Math.min(devicePixelRatio,compact?1:1.5),slowFrames=0,drawFrames=0
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: !compact, powerPreference: 'high-performance' }) }
    catch { onStatus('error'); return }
    renderer.setPixelRatio(renderRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true
    renderer.shadowMap.autoUpdate=!compact
    container.appendChild(renderer.domElement)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0c1929'); scene.fog = new THREE.Fog('#0c1929', 11, 24)
    const camera = new THREE.PerspectiveCamera(38, 1, .08, 40)
    scene.add(new THREE.HemisphereLight('#b3d9ff', '#5e3523', 1.1))
    const key = new THREE.DirectionalLight('#ffdfb5', 3.8); key.position.set(-3, 4.5, 5); key.castShadow = true
    key.shadow.mapSize.set(compact?512:1024, compact?512:1024); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); key.shadow.normalBias = .025; scene.add(key)
    const rim = new THREE.DirectionalLight('#75bfff', 3.2); rim.position.set(3, 4, -3); scene.add(rim)
    const fill = new THREE.DirectionalLight('#b3dfff', .7); fill.position.set(4, 2.8, 4); scene.add(fill)
    const lampLight = new THREE.PointLight('#ffbb69', 14, 6, 2); lampLight.position.set(-1.65, 1.9, .4); scene.add(lampLight)
    const screenLight = new THREE.PointLight('#96d7ff', 3, 3, 2); screenLight.position.set(-.35, 1.6, .2); scene.add(screenLight)
    const materials = new Map<string, THREE.MeshStandardMaterial>()
    const mat = (color: string) => { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .65 })); return materials.get(color)! }
    const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, parent: THREE.Object3D = scene, round = false) => {
      const geometry = round ? new RoundedBoxGeometry(w, h, d, 2, Math.min(.045, w / 5, h / 5, d / 5)) : new THREE.BoxGeometry(w, h, d)
      const mesh = new THREE.Mesh(geometry, mat(color)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
    }
    const cylinder = (r1: number, r2: number, h: number, color: string, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 32), mat(color)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
    }
    const glow = (mesh: THREE.Mesh, color: string, intensity: number) => { const material = (mesh.material as THREE.MeshStandardMaterial).clone(); material.emissive.set(color); material.emissiveIntensity = intensity; mesh.material = material }
    box(22, .12, 18, '#49362c', 0, -.1, 0)
    for (let i = -11; i < 11; i++) box(.009, .002, 18, '#342820', i * .8, -.035, 0)
    box(16, 6, .15, '#152c41', 0, 2.9, -3.8); box(.12, 6, 12, '#142639', -4.8, 2.9, -1)
    // Blue-hour window carries the original night sky into the room.
    const sky = document.createElement('canvas'); sky.width = 1024; sky.height = 1024
    const sc = sky.getContext('2d')!, gradient = sc.createLinearGradient(0, 0, 0, 1024)
    gradient.addColorStop(0, '#071325'); gradient.addColorStop(1, '#377194'); sc.fillStyle = gradient; sc.fillRect(0, 0, 1024, 1024)
    let random = 429; const rand = () => { random = (random * 16807) % 2147483647; return random / 2147483647 }
    for (let i = 0; i < 160; i++) { sc.fillStyle = `rgba(207,234,255,${.15 + rand() * .6})`; sc.beginPath(); sc.arc(rand() * 1024, rand() * 850, .6 + rand() * 1.4, 0, Math.PI * 2); sc.fill() }
    const skyTexture = new THREE.CanvasTexture(sky); skyTexture.colorSpace = THREE.SRGBColorSpace
    const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.5), new THREE.MeshBasicMaterial({ map: skyTexture })); windowMesh.position.set(-2.2, 2.85, -3.7); scene.add(windowMesh)
    for (const x of [-3.9, -2.2, -.5]) box(.035, 3.6, .08, '#354f60', x, 2.85, -3.64)
    for (const y of [1.1, 2.85, 4.6]) box(3.48, .035, .08, '#354f60', -2.2, y, -3.64)
    for (let i = 0; i < 11; i++) box(.035, 4.1, .055, '#766048', -4.5 + i * .075, 2.05, -3.6)
    // Desk, screen and chair form one persistent workstation around the person.
    const desk = new THREE.Group(); desk.position.set(-.4, 0, .45); scene.add(desk)
    box(3.15, .13, 1.35, '#a17a50', 0, 1.05, 0, desk, true); box(2.95, .5, .08, '#624936', 0, .75, .52, desk, true)
    const grain = document.createElement('canvas'); grain.width = 1024; grain.height = 256
    const gc = grain.getContext('2d')!; gc.fillStyle = '#a17a50'; gc.fillRect(0, 0, 1024, 256)
    for (let i = 0; i < 170; i++) { gc.strokeStyle = i % 3 ? '#76523220' : '#d3b18530'; gc.lineWidth = .5 + rand(); gc.beginPath(); const y = rand() * 256; gc.moveTo(0, y); gc.bezierCurveTo(280, y + rand() * 18, 600, y - rand() * 18, 1024, y + rand() * 8); gc.stroke() }
    const woodTexture = new THREE.CanvasTexture(grain); woodTexture.colorSpace = THREE.SRGBColorSpace; mat('#a17a50').map = woodTexture; mat('#a17a50').color.set('#ffffff')
    for (const x of [-1.3, 1.3]) box(.07, 1, 1.1, '#182d3b', x, .5, 0, desk, true)
    glow(box(2.9, .012, .015, '#d9a465', 0, .97, .6, desk), '#edb56f', .65)
    const monitor = new THREE.Group(); monitor.position.set(-.72, 1.08, .32); monitor.rotation.y = 1.68; scene.add(monitor)
    box(.4, .035, .3, '#1b2a36', 0, .02, 0, monitor, true); box(.055, .18, .055, '#425968', 0, .11, -.02, monitor)
    box(1.02, .672, .028, '#111f2b', 0, .53, 0, monitor, true)
    const code = document.createElement('canvas'); code.width = 1800; code.height = 1140; drawDailyDesk(code,deskData.current)
    const screenTexture = new THREE.CanvasTexture(code); screenTexture.colorSpace = THREE.SRGBColorSpace
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(.996, .646), new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false })); screen.position.set(0, .531, .016); monitor.add(screen)
    // Match the original screen's highlight lobe and room-light position.
    // The dark transparent glass keeps only a faint reflection over the display.
    const screenGlass = new THREE.Mesh(new THREE.PlaneGeometry(.996, .646), new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: .18, roughness: .35, metalness: 0, depthWrite: false }))
    screenGlass.position.set(0, .531, .017); monitor.add(screenGlass)
    screenTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())
    monitor.traverse(object=>{if(object instanceof THREE.Mesh)object.userData.dailyDesk=true})
    const keyboard = new THREE.Group(); keyboard.position.set(-.15, 1.14, .48); keyboard.rotation.y = .3; scene.add(keyboard)
    box(.76, .04, .28, '#243b4a', 0, 0, 0, keyboard, true)
    for (let row = 0; row < 4; row++) for (let col = 0; col < 13; col++) box(.042, .008, .042, '#91a4ac', -.33 + col * .054, .025, -.09 + row * .054, keyboard, true)
    box(.23, .017, .23, '#6b818a', .55, 1.14, .51, scene, true)
    cylinder(.12, .1, .19, '#ccc0a7', .82, 1.19, .35); cylinder(.103, .103, .007, '#30231c', .82, 1.288, .35)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.075, .018, 12, 24), mat('#ccc0a7')); handle.position.set(.96, 1.2, .35); scene.add(handle)
    cylinder(.17, .17, .035, '#ad895b', -1.67, 1.135, .35); cylinder(.012, .012, .64, '#ad895b', -1.67, 1.45, .35)
    glow(cylinder(.095, .25, .22, '#dcaf70', -1.67, 1.88, .35), '#f4b267', .35)
    // The seat is tucked under the rear desk edge; the back supports the torso.
    const chair = new THREE.Group(); chair.position.set(.10,0,-.84); scene.add(chair)
    box(.7, .14, .6, '#334b56', 0, .68, 0, chair, true); box(.68, .75, .12, '#334b56', 0, 1.12, -.30, chair, true); cylinder(.04, .04, .6, '#233642', 0, .32, 0, chair)
    // A real rear apron hides the half-body edge below the tabletop, rather than
    // cutting the torso at tabletop height and leaving a floating silhouette.
    box(2.95,.42,.06,'#624936',0,.82,-.60,desk,true)
    const plant = (x: number, z: number, size = 1) => {
      const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(size); scene.add(group)
      cylinder(.24, .17, .43, '#8e795d', 0, .215, 0, group); cylinder(.012, .012, 1.5, '#537663', 0, 1.1, 0, group)
      for (let i = 0; i < 11; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(i % 2 ? '#547864' : '#33594d')); const a = i * 2.4; leaf.scale.set(.11, .32, .045); leaf.position.set(Math.cos(a) * .19, .65 + i * .105, Math.sin(a) * .19); leaf.rotation.set(Math.sin(a) * .6, a, Math.cos(a) * .8); group.add(leaf) }
    }
    plant(-2.7, -2.2, 1.3); plant(4, -2.8, 1.6)
    box(3.6, .1, .6, '#87674b', 2.4, 1.15, -2.9, scene, true)
    const galleryLights: THREE.MeshStandardMaterial[] = []
    const galleryPanels: THREE.Mesh[] = []
    const galleryHints: THREE.LineLoop[] = []
    for (let i = 0; i < 3; i++) {
      const x = .9 + i * 1.05; box(.86, 1.12, .08, '#71624c', x, 2.2, -3.6, scene, true)
      const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 1920; const ctx = canvas.getContext('2d')!; ctx.scale(3,3)
      ctx.fillStyle = '#163047'; ctx.fillRect(0, 0, 512, 640); ctx.fillStyle = '#96b5c8'; ctx.font = '22px sans-serif'; ctx.fillText('ZEXI / EXPLORATIONS', 38, 64)
      ctx.strokeStyle = ['#86c8d6', '#e3b879', '#a3addf'][i]; ctx.lineWidth = 2
      if(i===0){for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.ellipse(256, 270, 90 + j * 14, 140 - j * 15, j * .4, 0, Math.PI * 2); ctx.stroke() }}
      else if(i===1){for(let j=0;j<3;j++){const y=180+j*80;ctx.beginPath();ctx.moveTo(110,y);ctx.lineTo(256,y-45);ctx.lineTo(402,y);ctx.lineTo(256,y+45);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(110,y);ctx.lineTo(110,y+25);ctx.lineTo(256,y+70);ctx.lineTo(402,y+25);ctx.lineTo(402,y);ctx.moveTo(256,y+45);ctx.lineTo(256,y+70);ctx.stroke()}}
      else{const joints=[[130,400],[185,315],[275,265],[325,175],[365,155]];ctx.lineWidth=10;ctx.lineJoin='round';ctx.beginPath();joints.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();ctx.lineWidth=2;for(const [x,y]of joints.slice(1,4)){ctx.beginPath();ctx.arc(x,y,15,0,Math.PI*2);ctx.fillStyle='#163047';ctx.fill();ctx.stroke()}ctx.beginPath();ctx.ellipse(150,410,80,18,0,0,Math.PI*2);ctx.stroke()}
      ctx.fillStyle = '#f0f5f8'; ctx.font = '600 38px sans-serif'; ctx.fillText(exhibits[i].wall, 30, 510); ctx.fillStyle = '#b4cedf'; ctx.font = '600 22px sans-serif'; ctx.fillText('OPEN EXHIBIT  ↗', 30, 565)
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy())
      const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: .22, roughness: .8 }); galleryLights.push(material)
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(.78, 1.04), material); panel.position.set(x, 2.2, -3.55); panel.userData.exhibitIndex=i; scene.add(panel); galleryPanels.push(panel)
      // These hints live inside the depth-tested scene, so only the portions
      // behind neither the character nor furniture are visible.
      const hint=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.385,-.515,.004),new THREE.Vector3(.385,-.515,.004),new THREE.Vector3(.385,.515,.004),new THREE.Vector3(-.385,.515,.004)]),new THREE.LineBasicMaterial({color:'#91b9cf',transparent:true,opacity:.28,depthTest:true,depthWrite:false}))
      hint.position.copy(panel.position);hint.visible=false;scene.add(hint);galleryHints.push(hint)
    }
    const galleryRay=new THREE.Raycaster()
    pickComputer.current=(x,y)=>{
      galleryRay.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera)
      return galleryRay.intersectObjects(scene.children,true).find(hit=>hit.object instanceof THREE.Mesh)?.object.userData.dailyDesk===true
    }
    pickExhibit.current=(x,y)=>{
      galleryRay.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera)
      const hit=galleryRay.intersectObjects(scene.children,true).find(hit=>hit.object instanceof THREE.Mesh)
      return typeof hit?.object.userData.exhibitIndex==='number'?hit.object.userData.exhibitIndex:null
    }
    for (let i = 0; i < 9; i++) { const a = -.9 + i * .18; const step = box(.64, .11 * (i + 1), .38, '#6c5946', 3.2 + Math.cos(a) * 1.1, .055 * (i + 1), -2 + Math.sin(a) * 1.1); step.rotation.y = -a }
    box(1.6, .1, .6, '#725944', 2.55, 1.15, -1.8, scene, true); box(1.4, .08, .38, '#192a37', 2.55, 1.25, -1.8, scene, true)
    for (let i = 0; i < 22; i++) box(.049, .025, .26, '#c6c7be', 1.88 + i * .062, 1.3, -1.75)
    for (const x of [1.9, 3.2]) box(.07, 1.1, .07, '#2b3d46', x, .55, -1.8)
    const dog=createStudioDog();scene.add(dog.root,createDogStep(),createDogDishes())
    if(compact)dog.root.traverse(object=>{object.castShadow=false})
    petDog.current=(x,y)=>{if(x!==undefined&&y!==undefined){galleryRay.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,1-y/innerHeight*2),camera);const object=galleryRay.intersectObjects(scene.children,true).find(h=>h.object instanceof THREE.Mesh)?.object;if(!object?.userData.dogPet){if(object?.userData.dailyDesk)window.open(DAILY_URL,'_blank','noopener,noreferrer');if(typeof object?.userData.exhibitIndex==='number')hotspots.current?.querySelectorAll('button')[object.userData.exhibitIndex]?.click();return false}}const result=dog.pet(camera.position);dirty=true;return result}
    type DogHost = HTMLDivElement & { previewDog?: (mode:DogPreview)=>void }
    if(import.meta.env.DEV)(container as DogHost).previewDog=mode=>{dog.preview(mode);dirty=true}
    const character = new THREE.Group(); scene.add(character)
    const waist = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.7)
    let disposed = false, loaded = false, dirty = true,readyToReveal=false,shadersReady=false
    refreshScreen.current=()=>{drawDailyDesk(code,deskData.current);screenTexture.needsUpdate=true;dirty=true}
    highlightExhibit.current=index=>{galleryHints.forEach((hint,i)=>{hint.visible=index===i});dirty=true}
    let headLook: ReturnType<typeof createCharacterHead> | null = null
    let microGaze: ReturnType<typeof createSurfaceGaze> | null = null
    const microEnabled=new URLSearchParams(location.search).get('eyes')!=='off'
    const disposeObject = (root: THREE.Object3D) => root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) { for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose(); material.dispose() } } })
    onStatus('loading')
    const modelFile=innerWidth<760?'scholar-mobile-v1.glb':'scholar-web-v1.glb'
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(`${import.meta.env.BASE_URL}models/${modelFile}`, gltf => {
      if (disposed) { disposeObject(gltf.scene); return }
      const bounds = new THREE.Box3().setFromObject(gltf.scene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()), scale = 2.65 / size.y
      gltf.scene.scale.setScalar(scale); gltf.scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
      gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; for (const material of Array.isArray(object.material) ? object.material : [object.material]) { material.clippingPlanes = [waist]; material.clipShadows = true; if (material instanceof THREE.MeshStandardMaterial) material.normalScale.set(.55, .55) } } })
      character.add(gltf.scene); headLook=createCharacterHead(gltf.scene); microGaze=createSurfaceGaze(gltf.scene,microEnabled); loaded = true; dirty = true; renderer.shadowMap.needsUpdate=true
      void renderer.compileAsync(scene,camera).then(()=>{if(!disposed){shadersReady=true;readyToReveal=true;dirty=true}}).catch(()=>{if(!disposed){shadersReady=true;readyToReveal=true;dirty=true}})
    }, event=>{if(!disposed&&event.total>0)onProgress(Math.min(99,Math.round(event.loaded/event.total*100)))}, () => { if (!disposed) onStatus('error') })
    // Opening: upper-left portrait -> centred face close-up -> desk relationship.
    // Chapter transitions have zero velocity and acceleration at both ends.
    const shots: Shot[] = [
      { c: [3.4, 2.9, 4.2], t: [.8, 1.75, -.55], fov: 38, turn: .08, seat: -.15 },
      { c: [2.1, 2.6, 3.05], t: [.9, 1.6, -.55], fov: 38, turn: .08, seat: -.15 },
      { c: [.65, 2.46, 1.25], t: [.25, 2.06, -.5], fov: 34, turn: .06, seat: -.15 },
      { c: [2.45, 2.4, 3.65], t: [1.05, 1.8, -.5], fov: 40, turn: .08, seat: -.15 },
      { c: [-2.1, 2.2, 3.7], t: [-.7, 1.8, -.55], fov: 37, turn: -.25, seat: -.15, arc: [0, .3, -.65] },
      { c: [1.15, 2.25, 2.35], t: [1.1, 1.94, -.5], fov: 40, turn: .2, seat: -.15, arc: [1.5, 1.35, -.8] },
      { c: [-1.1, 2.35, 2.8], t: [-.45, 1.98, -.65], fov: 35, turn: -.25, seat: -.15, arc: [-.6, .15, -.8] },
      { c: [2.8, 1.95, 3.5], t: [.65, 1.55, -.25], fov: 38, turn: .10, seat: -.48, arc: [.25, .35, -.5] },
    ]
    let keys: Key[] = []
    const composer=compact?null:new EffectComposer(renderer,new THREE.WebGLRenderTarget(innerWidth,innerHeight,{type:THREE.HalfFloatType,samples:4}))
    const bokeh=compact?null:new BokehPass(scene,camera,{focus:4,aperture:.0011,maxblur:.008})
    if(composer&&bokeh){composer.addPass(new RenderPass(scene,camera));composer.addPass(bokeh);composer.addPass(new OutputPass())}
    const uniforms = bokeh?.uniforms as Record<string, { value: number }> | undefined
    const resize = () => {
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer?.setSize(innerWidth, innerHeight)
      keys = [{ y: 0, shot: shots[0] }, { y: innerHeight * .12, shot: shots[1] }, { y: innerHeight * .38, shot: shots[2] }, { y: innerHeight * .8, shot: shots[3] }]
      let previous = shots[3]
      for (const [i, id] of ['about', 'projects', 'music', 'resume'].entries()) { const element = document.getElementById(id); const stop = (element ? element.getBoundingClientRect().top + scrollY : innerHeight * (i + 2)) - innerHeight * .1; keys.push({ y: stop - innerHeight * .68, shot: previous }, { y: stop, shot: shots[i + 4] }); previous = shots[i + 4] }
      dirty = true
    }
    resize(); addEventListener('resize', resize)
    const layoutObserver=new ResizeObserver(resize)
    const story=document.querySelector('.studio-story');if(story)layoutObserver.observe(story)
    let frame = 0, last = 0, current = scrollY, focusBlend = 0,lastShadowSeat=Infinity,lastShadowTurn=Infinity
    const cv = new THREE.Vector3(), tv = new THREE.Vector3(), av = new THREE.Vector3(), bv = new THREE.Vector3(), head = new THREE.Vector3()
    const onScroll = () => { dirty = true; container.dataset.cameraSettled = 'false' }; addEventListener('scroll', onScroll, { passive: true })
    const animate = (time: number) => {
      frame = requestAnimationFrame(animate)
      if (document.hidden || time - last < 15) return
      const dt = Math.min((time - last) / 1000, .2); last = time
      current = reduced ? scrollY : THREE.MathUtils.lerp(current, scrollY, 1 - Math.exp(-dt * 7)); if (Math.abs(current - scrollY) < .3) current = scrollY
      // Opening a scroll preserves the workstation composition and body contact.
      const goal = 0
      focusBlend = reduced ? goal : THREE.MathUtils.lerp(focusBlend, goal, 1 - Math.exp(-dt * 5)); if (Math.abs(focusBlend - goal) < .001) focusBlend = goal
      const dogChanged=dog.update(dt,{active:current>innerHeight*.8&&selection.current===null,paused:dogPause.current,reduced})
      dirty=dogChanged||dirty
      if(current<1&&scrollY===0&&!readyToReveal){current=0;container.dataset.cameraSettled='true';return}
      if ((!dirty && current === scrollY && focusBlend === goal)||!loaded||!shadersReady) return
      dirty = current !== scrollY || focusBlend !== goal
      let index = 0; while (index < keys.length - 2 && current > keys[index + 1].y) index++
      const a = keys[index].shot, b = keys[index + 1].shot, raw = THREE.MathUtils.clamp((current - keys[index].y) / (keys[index + 1].y - keys[index].y), 0, 1)
      const blend = reduced ? (raw < .5 ? 0 : 1) : ease(raw)
      cv.fromArray(a.c).lerp(bv.fromArray(b.c), blend)
      const arc = b.arc ?? [0, 0, 0], bow = a === b ? 0 : Math.sin(blend * Math.PI) ** 2
      cv.x += arc[0] * bow; cv.y += arc[1] * bow; cv.z += arc[2] * bow
      tv.fromArray(a.t).lerp(bv.fromArray(b.t), blend)
      const seat = THREE.MathUtils.lerp(a.seat, b.seat, blend)
      const turn=THREE.MathUtils.lerp(a.turn,b.turn,blend)
      if(compact&&(Math.abs(seat-lastShadowSeat)>.015||Math.abs(turn-lastShadowTurn)>.02)){renderer.shadowMap.needsUpdate=true;lastShadowSeat=seat;lastShadowTurn=turn}
      const seated=THREE.MathUtils.clamp((-.15-seat)/.33,0,1)
      // The hoodie extends well behind its root. Keep the backrest behind that
      // surface while the chair rolls toward the desk with the sitting motion.
      chair.position.z=THREE.MathUtils.lerp(-.84,-.60,seated)
      character.position.set(THREE.MathUtils.lerp(.25,.10,seated),seat,THREE.MathUtils.lerp(-.6,-.34,seated))
      character.rotation.y = THREE.MathUtils.lerp(a.turn, b.turn, blend); character.rotation.x=-.025*seated
      // Retain torso continuity below the desk. The tucked-in desk/chair geometry
      // occludes the partial body; the remaining cut stays down by the seat.
      waist.constant = -.73
      head.set(character.position.x,seat+2.34,character.position.z+.10)
      if (index > 3 && a !== b && !reduced) tv.lerp(head, bow * .52)
      camera.fov = THREE.MathUtils.lerp(a.fov, b.fov, blend)
      if (focusBlend > 0) { cv.lerp(av.set(2.25, 1.95, 2.65), focusBlend); tv.lerp(av.set(.5, 1.55, -.1), focusBlend); camera.fov = THREE.MathUtils.lerp(camera.fov, 34, focusBlend) }
      const small = innerWidth < 760
      if (small) { cv.z += 1.2; tv.x = -.1; tv.y = seat + 1.45; if (index < 3) { cv.z += .6; camera.fov = Math.max(camera.fov, 44) } camera.fov += 4 }
      camera.position.copy(cv); camera.lookAt(tv); camera.updateProjectionMatrix()
      camera.updateMatrixWorld(); scene.updateMatrixWorld()
      if(dogTarget.current){
        const points=[]
        for(const x of [-.62,.60])for(const y of [0,.78])for(const z of [-.22,.22])points.push(dog.root.localToWorld(new THREE.Vector3(x,y,z)).project(camera))
        const xs=points.map(p=>(p.x+1)*innerWidth/2),ys=points.map(p=>(1-p.y)*innerHeight/2),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top
        dogTarget.current.hidden=!(current>innerHeight*.8&&selection.current===null&&points.every(p=>p.z>-1&&p.z<1)&&left+width>0&&left<innerWidth&&top+height>85&&top<innerHeight)
        Object.assign(dogTarget.current.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'})
      }
      if(computerLink.current){
        const points=[[-.51,.194,-.014],[.51,.194,-.014],[.51,.866,-.014],[-.51,.866,-.014],[-.51,.194,.017],[.51,.194,.017],[.51,.866,.017],[-.51,.866,.017]].map(([x,y,z])=>monitor.localToWorld(new THREE.Vector3(x,y,z)).project(camera))
        const xs=points.map(p=>(p.x+1)*innerWidth/2),ys=points.map(p=>(1-p.y)*innerHeight/2)
        const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top
        computerLink.current.hidden=!(current>innerHeight*.8&&points.every(p=>p.z>-1&&p.z<1)&&left+width>0&&left<innerWidth&&top+height>85&&top<innerHeight&&width>24)
        Object.assign(computerLink.current.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`})
      }
      // Native buttons follow the projected picture plane: touch and keyboard
      // interaction share the same targets without intercepting reading cards.
      galleryPanels.forEach((panel,i)=>{
        const button=hotspots.current?.children[i] as HTMLButtonElement | undefined
        if(!button)return
        const points=[[-.39,-.52],[.39,-.52],[.39,.52],[-.39,.52]].map(([x,y])=>panel.localToWorld(new THREE.Vector3(x,y,0)).project(camera))
        const xs=points.map(p=>(p.x+1)*innerWidth/2),ys=points.map(p=>(1-p.y)*innerHeight/2)
        const left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top
        const visible=current>innerHeight*.8&&points.every(p=>p.z>-1&&p.z<1)&&left+width>0&&left<innerWidth&&top+height>85&&top<innerHeight&&width>24
        button.hidden=!visible
        if(visible){button.style.left=`${left}px`;button.style.top=`${top}px`;button.style.width=`${width}px`;button.style.height=`${height}px`;button.style.clipPath=`polygon(${xs.map((x,j)=>`${(x-left)/width*100}% ${(ys[j]-top)/height*100}%`).join(',')})`}
      })
      const headMoving=headLook?.update(camera.position,dt,reduced)??false
      let eyesMoving=false
      dirty=headMoving||dirty
      if(microGaze){if(reduced)microGaze.reset();else{eyesMoving=microGaze.update(camera.position,dt);dirty=eyesMoving||dirty}}
      if(uniforms) {uniforms.focus.value = head.clone().sub(cv).dot(camera.getWorldDirection(av)); uniforms.aperture.value = .0011 + bow * .0002}
      if(bokeh)bokeh.enabled = !small && !reduced && loaded && (index<3||bow>.02)
      for (let i = 0; i < galleryLights.length; i++) galleryLights[i].emissiveIntensity = selection.current === i ? .8 : .22
      const drawStart=performance.now()
      if(composer)composer.render();else renderer.render(scene,camera)
      drawFrames++;if(performance.now()-drawStart>24)slowFrames++
      if(drawFrames>=45){if(slowFrames>20&&renderRatio>(compact?.75:1)){renderRatio=Math.max(compact?.75:1,renderRatio-.15);renderer.setPixelRatio(renderRatio);composer?.setPixelRatio(renderRatio);resize()}drawFrames=0;slowFrames=0}
      if(readyToReveal){readyToReveal=false;onStatus('ready')}
      if(import.meta.env.DEV){container.dataset.renderProfile=JSON.stringify({compact,postprocessing:!!composer,pixelRatio:renderRatio,drawMs:performance.now()-drawStart,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,time})}
      container.dataset.cameraSettled = String(current === scrollY && focusBlend === goal)
      if (import.meta.env.DEV) container.dataset.cameraPose = JSON.stringify({ position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov })
      if (import.meta.env.DEV && headLook){container.dataset.headPose=JSON.stringify(headLook.pose());container.dataset.headSettled=String(!headMoving&&!eyesMoving&&current===scrollY)}
      if (import.meta.env.DEV) container.dataset.microEyePose=JSON.stringify(microGaze?.pose()??[0,0])
      if (import.meta.env.DEV) container.dataset.dogState=JSON.stringify(dog.inspect())
    }
    frame = requestAnimationFrame(animate)
    const wake = setInterval(() => {if(scrollY>0) dirty = true }, 500)
    const lost = (event: Event) => { event.preventDefault(); onStatus('error') }; renderer.domElement.addEventListener('webglcontextlost', lost)
    return () => { disposed = true;delete (container as DogHost).previewDog;layoutObserver.disconnect(); petDog.current=null;pickComputer.current=null;refreshScreen.current=null;pickExhibit.current=null;highlightExhibit.current=null;cancelAnimationFrame(frame); clearInterval(wake); removeEventListener('resize', resize); removeEventListener('scroll', onScroll); renderer.domElement.removeEventListener('webglcontextlost', lost); disposeObject(scene); composer?.passes.forEach(pass => pass.dispose()); composer?.dispose(); renderer.dispose(); renderer.domElement.remove() }
  }, [onStatus, reduced])
  return <><button ref={dogTarget} hidden type="button" className="dog-pet-target" aria-label={lang==='zh'?'摸摸嘻嘻':'Pet Xixi'} onClick={event=>{if(petDog.current?.(event.detail===0?undefined:event.clientX,event.detail===0?undefined:event.clientY))setPetFeedback(true)}}><span>{lang==='zh'?'摸摸嘻嘻':'Pet Xixi'}</span></button><div className="dog-pet-feedback" role="status" aria-live="polite">{petFeedback?(lang==='zh'?'嘻嘻：喜欢你摸摸我 ♡':'Xixi loves your pats ♡'):''}</div><div className="studio-canvas" ref={host} aria-hidden="true" /><button type="button" className="dog-rest-toggle" disabled={reduced} aria-pressed={dogPaused||reduced} onClick={()=>setDogPaused(value=>!value)} aria-label={lang==='zh'?(reduced?'减少动画已开启，嘻嘻安静陪伴':dogPaused?'让嘻嘻继续活动':'让嘻嘻趴下休息，暂停狗狗动画'):(dogPaused?'Let Xixi wander':'Let Xixi rest; pause dog animation')}><span aria-hidden="true">🐾</span><span>{lang==='zh'?'嘻嘻':'XIXI'}<small>{reduced?(lang==='zh'?'安静陪伴':'quiet company'):dogPaused?(lang==='zh'?'继续活动':'let’s wander'):(lang==='zh'?'休息一下':'take a rest')}</small></span></button><a ref={computerLink} hidden className="computer-hotspot" href={DAILY_URL} target="_blank" rel="noopener noreferrer" aria-label={lang==='zh'?'点击电脑，打开 AIHOT 日报（新标签页）':'Open AIHOT daily in a new tab'} onClick={event=>{if(event.detail!==0&&!pickComputer.current?.(event.clientX,event.clientY))event.preventDefault()}}><span>{lang==='zh'?'AIHOT · 打开日报 ↗':'AIHOT · Daily briefing ↗'}</span></a><div className="gallery-hotspots" ref={hotspots}>{exhibits.map((exhibit,i)=><button key={exhibit.id} hidden type="button" data-exhibit={exhibit.id} onPointerEnter={()=>highlightExhibit.current?.(i)} onPointerLeave={()=>highlightExhibit.current?.(null)} onFocus={()=>highlightExhibit.current?.(i)} onBlur={()=>highlightExhibit.current?.(null)} onClick={event=>{if(event.detail===0||pickExhibit.current?.(event.clientX,event.clientY)===i){highlightExhibit.current?.(null);onOpenExhibit(i)}}} aria-haspopup="dialog" aria-label={lang==='zh'?`打开${exhibit.name}展区`:`Open ${exhibit.en} exhibit`}/>)}</div></>
}
