import * as THREE from 'three'
import { puppyTorso, puppyFace, puppyEar, puppyFur, fleshyLeg, bendLeg } from './dog-sculpt'

type Place = 'floor' | 'table' | 'step'
type Motion = 'walk' | 'idle' | 'rest' | 'jump' | 'eat'
type Action = { motion: Motion; place: Place; to: THREE.Vector3; duration: number; arc?: number; node?: number }
type Options = { active: boolean; paused: boolean; reduced: boolean }
export type DogPreview = 'floor-walk' | 'floor-rest' | 'table-walk' | 'table-rest' | 'table-eat' | 'floor-eat'
const smooth = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10) }
const FLOOR = -.034, TABLE = 1.115, STEP = .52, SIZE = .72
// Routes stay outside the desk, chair, plant pots and the little stepping stool.
const route = [[-1.45,2.38],[-2.55,1.80],[-2.55,-.70],[-1.95,-1.55],[-1.10,-2.60],[1.20,-2.45],[2.60,-2.55],[2.10,-3.18],[3.05,-3.18]].map(([x,z])=>new THREE.Vector3(x,FLOOR,z))
const tabletop = [new THREE.Vector3(.40, TABLE, 1.02), new THREE.Vector3(.55, TABLE, 1.02)]
const tableEntrance = new THREE.Vector3(-1.30, TABLE, 1.02)
const step = new THREE.Vector3(-1.45, STEP, 1.72)

export function createStudioDog(random: () => number = Math.random) {
  const root = new THREE.Group(); root.name = 'Xixi'
  const body = new THREE.Group(); root.add(body); root.scale.setScalar(SIZE)
  const sphere = new THREE.SphereGeometry(1, 20, 14)
  const fur = puppyFur('#d8a04f',true)
  const honey = puppyFur('#bd843c')
  const cream = new THREE.MeshStandardMaterial({ color: '#f2d7a4', roughness: .97 })
  const dark = new THREE.MeshStandardMaterial({ color: '#241d18', roughness: .48 })
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: '#1c1814', roughness: .2 })
  const collarMaterial = new THREE.MeshStandardMaterial({ color: '#46675d', roughness: .82 })
  const tagMaterial = new THREE.MeshStandardMaterial({ color: '#d6b67b', metalness: .45, roughness: .4 })
  const shape = (parent: THREE.Object3D, material: THREE.Material, scale: [number, number, number], position: [number, number, number]) => {
    const mesh = new THREE.Mesh(sphere, material); mesh.scale.set(...scale); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  const torso=new THREE.Mesh(puppyTorso(),fur);torso.castShadow=true;torso.receiveShadow=true;body.add(torso)
  const neck = new THREE.Group(); neck.position.set(.22, .075, 0); body.add(neck)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.126, .019, 8, 24), collarMaterial); collar.rotation.x = Math.PI / 2; collar.position.set(.025, .025, 0); neck.add(collar)
  shape(neck, tagMaterial, [.026, .032, .009], [.035, -.012, .135])
  const head = new THREE.Group(); head.position.set(.04, .205, 0); neck.add(head)
  const face=new THREE.Mesh(puppyFace(),puppyFur('#dfa956',false,true));face.castShadow=true;head.add(face)
  shape(head,dark,[.029,.022,.046],[.224,-.022,0])
  for(const side of [-1,1]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.205,-.073,side*.036),new THREE.Vector3(.177,-.088,side*.069),new THREE.Vector3(.143,-.084,side*.084)])
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,.0022,5,false),dark))
  }
  const eyes: THREE.Mesh[] = [], ears: THREE.Group[] = []
  for (const side of [-1, 1]) {
    const eye = shape(head, eyeMaterial, [.027, .030, .014], [.080, .039, side * .114]); eye.rotation.y = side * .48; eyes.push(eye)
    shape(head, cream, [.0045, .006, .004], [.087, .048, side * .128])
    const ear = new THREE.Group(); ear.position.set(-.025, .074, side * .125); head.add(ear)
    const earMesh=new THREE.Mesh(puppyEar(side),honey);earMesh.castShadow=true;ear.add(earMesh)
    ears.push(ear)
  }
  const tail = new THREE.Group(); tail.position.set(-.34, .045, 0); body.add(tail)
  const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.075,.055,0),new THREE.Vector3(-.145,.155,0),new THREE.Vector3(-.20,.20,0)])
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve,18,.034,8,false),fur);tailMesh.castShadow=true;tail.add(tailMesh)
  shape(tail, cream, [.036, .037, .035], [-.20, .20, 0])
  const legs = [-1, 1].flatMap(side => [true, false].map(front => {
    const x = front ? .175 : -.23, z = side * .116
    const skin=fleshyLeg(fur);root.add(skin)
    const paw=shape(root,cream,[.059,.035,.044],[x,.035,z])
    return {x,z,front,side,skin,paw}
  }))
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 64
  const ctx = shadowCanvas.getContext('2d')!, shadowGradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 32)
  shadowGradient.addColorStop(0, 'rgba(0,0,0,.32)'); shadowGradient.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = shadowGradient; ctx.fillRect(0, 0, 64, 64)
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .55), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }))
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(-.02, .004, 0); root.add(shadow)
  root.traverse(o=>{if(o instanceof THREE.Mesh&&o!==shadow)o.userData.dogPet=true})
  let petTime=0,petFacing=0,lastMeal=-100
  const tableMeal=new THREE.Vector3(.53,TABLE,1.02),floorMeal=new THREE.Vector3(.47,FLOOR,-2.80)
  const from = new THREE.Vector3(), previous = new THREE.Vector3(), delta = new THREE.Vector3()
  const shoulder = new THREE.Vector3(), knee = new THREE.Vector3(), foot = new THREE.Vector3()
  let place: Place = 'table', node = 0, action: Action, queue: Action[] = [], elapsed = 0, clock = 0, gait = 0, lying = 1, walking = 0, jumping = 0, nextBlink = 3 + random() * 4, blink = 0, previewLocked = false
  let turnFrom = -.5, turnTo = -.5, wantsTable = false
  let floorTrips=0,direction=1
  let introduced=false
  root.position.copy(tabletop[0]); root.rotation.y = 0
  const wait = (motion: 'idle' | 'rest' | 'eat', seconds: number): Action => ({ motion, place, to: root.position.clone(), duration: seconds })
  const start = (next: Action) => {
    action = next; elapsed = 0; from.copy(root.position); previous.copy(root.position); turnFrom = root.rotation.y
    delta.subVectors(next.to, from); turnTo = delta.lengthSq() > .0001 ? Math.atan2(-delta.z, delta.x) : turnFrom
    // Idle turns never cross through the long way around.
    turnTo = turnFrom + THREE.MathUtils.euclideanModulo(turnTo - turnFrom + Math.PI, Math.PI * 2) - Math.PI
    if (next.motion === 'walk' && place === 'table') {
      turnFrom = THREE.MathUtils.euclideanModulo(turnFrom + Math.PI, Math.PI * 2) - Math.PI
      if(root.position.x>.2)turnFrom=THREE.MathUtils.clamp(turnFrom,-Math.PI,0)
      turnTo = delta.x > 0 ? 0 : -Math.PI
    }
  }
  const walkTo = (point: THREE.Vector3, nextNode?: number): Action => ({ motion: 'walk', place, to: point.clone(), duration: Math.max(2.8, point.distanceTo(root.position) / (.11 + random() * .025)), node: nextNode })
  const choose = () => {
    if (queue.length) { start(queue.shift()!); return }
    if (place === 'step') { start({ motion: 'jump', place: 'table', to: tableEntrance.clone(), duration: 1.05, arc: .40 }); return }
    if (place === 'table') {
      if(!introduced){introduced=true;start(walkTo(tabletop[1]));return}
      const pick = random()
      if(pick<.24&&clock-lastMeal>80){lastMeal=clock;queue=[{motion:'eat',place,to:tableMeal.clone(),duration:12}];start(walkTo(tableMeal));turnTo=0;return}
      if (pick < .42) start(wait('rest', 22 + random() * 26))
      else if (pick < .66) start(wait('idle', 7 + random() * 7))
      else if (pick < .84) start(walkTo(root.position.x < .2 ? tabletop[Math.floor(random()*2)] : tableEntrance))
      else {
        queue = [{ motion: 'jump', place: 'step', to: step.clone(), duration: 1.05, arc: .30 }, { motion: 'jump', place: 'floor', to: route[0].clone(), duration: .9, arc: .45, node: 0 }, { motion: 'idle', place: 'floor', to: route[0].clone(), duration: .4 }]
        if(root.position.distanceTo(tableEntrance)>.1)start(walkTo(tableEntrance))
        else start(queue.shift()!)
      }
      return
    }
    if (wantsTable && node === 0) {
      wantsTable = false;floorTrips=0
      queue = [{ motion: 'idle', place: 'step', to: step.clone(), duration: .7 }, { motion: 'jump', place: 'table', to: tableEntrance.clone(), duration: 1.05, arc: .40 }, { motion: 'walk', place: 'table', to: tabletop[0].clone(), duration: tableEntrance.distanceTo(tabletop[0])/.18 }, { motion: 'rest', place: 'table', to: tabletop[0].clone(), duration: 25 + random() * 20 }]
      start({ motion: 'jump', place: 'step', to: step.clone(), duration: .9, arc: .42 }); return
    }
    if(node<2&&!wantsTable){start(walkTo(route[node+1],node+1));return}
    if((node===4||node===5)&&clock-lastMeal>80&&random()<.32){lastMeal=clock;queue=[{motion:'eat',place,to:floorMeal.clone(),duration:12},walkTo(route[node],node)];start(walkTo(floorMeal));turnTo=0;return}
    if (action.motion === 'walk' && !wantsTable) { start(wait(random() < .6 ? 'rest' : 'idle', 8 + random() * 16)); return }
    if (floorTrips>=3&&random() < .28) wantsTable = true
    if (!wantsTable && random() < .22) { start(wait('rest', 18 + random() * 20)); return }
    if(node===0)direction=1;else if(node===route.length-1)direction=-1;else if(random()<.12)direction*=-1
    const next = wantsTable ? node + Math.sign(0 - node) : THREE.MathUtils.clamp(node + direction, 0, route.length - 1)
    const safeNode = next === node ? (node === 0 ? 1 : node - 1) : next
    start(walkTo(route[safeNode], safeNode))
  }
  start(wait('rest', 8 + random() * 8))

  const pose = (dt: number, still: boolean) => {
    const affection=petTime>0&&!still?Math.sin(Math.PI*petTime/3.2):0
    const eating=action.motion==='eat'&&!still&&petTime<=0
    const blend = 1 - Math.exp(-dt * 4.5)
    const rest = action.motion === 'rest' || (still && action.motion !== 'jump') ? 1 : 0
    lying = THREE.MathUtils.lerp(lying, rest, blend); if (Math.abs(lying - rest) < .002) lying = rest
    walking = THREE.MathUtils.lerp(walking, !still && petTime<=0 && action.motion === 'walk' ? 1 : 0, blend)
    jumping = action.motion === 'jump' ? Math.sin(Math.PI * Math.min(1, elapsed / action.duration)) : 0
    const breathe = still ? 0 : Math.sin(clock * 1.5) * .003
    body.position.y = THREE.MathUtils.lerp(.32, .165, lying) + Math.sin(gait * 2) * .007 * walking + breathe
    body.scale.y = 1 - lying * .12 + breathe * 1.1
    head.position.y = THREE.MathUtils.lerp(head.position.y,eating?-.085:THREE.MathUtils.lerp(.205,.11,lying)+affection*.04,blend)
    head.rotation.y = eating?0:affection*petFacing+(still?0:Math.sin(clock*.36)*.10*(1-walking))
    head.rotation.z = THREE.MathUtils.lerp(head.rotation.z,eating?-.80+Math.sin(clock*6)*.045:-.08-lying*.10+affection*.22,blend)
    tail.rotation.x = still?0:Math.sin(clock*(petTime>0?7:walking>.2?5:2.3))*(petTime>0?.42:.18)*(1-lying*.65)
    tail.rotation.z = -.10 + lying * .8
    ears.forEach((ear, i) => { ear.rotation.z = Math.sin(gait + i * Math.PI) * .04 * walking; ear.rotation.x = Math.sin(clock * .9 + i) * .025 * (still ? 0 : 1) })
    if (!still && clock > nextBlink) { blink = .18; nextBlink = clock + 3 + random() * 6 }
    blink = Math.max(0, blink - dt); eyes.forEach(eye => { eye.scale.y = blink > 0 ? .007 : .030-affection*.009 })
    for (const leg of legs) {
      const offset = leg.front === (leg.side === 1) ? 0 : Math.PI
      const phase = THREE.MathUtils.euclideanModulo(gait + offset, Math.PI * 2) / (Math.PI * 2)
      const stance = phase < .64, swing = (phase - .64) / .36
      const stride = stance ? .09 - .18 * phase / .64 : -.09 + .18 * smooth(swing)
      const lift = stance ? 0 : Math.sin(swing * Math.PI) * .055
      const restingX = leg.front ? .38 : -.26
      foot.set(THREE.MathUtils.lerp(leg.x + stride * walking, restingX, lying), .035 + lift * walking + jumping * .08, leg.z)
      if(place==='table'&&action.motion!=='jump') {
        const cosine=Math.cos(root.rotation.y),sine=Math.sin(root.rotation.y)
        const x=THREE.MathUtils.clamp(root.position.x+SIZE*(foot.x*cosine+foot.z*sine),-1.92,1.10)-root.position.x
        const z=THREE.MathUtils.clamp(root.position.z+SIZE*(-foot.x*sine+foot.z*cosine),.79,1.075)-root.position.z
        foot.x=(x*cosine-z*sine)/SIZE;foot.z=(x*sine+z*cosine)/SIZE
      }
      shoulder.set(leg.x, body.position.y + .012, leg.z * .94)
      knee.copy(shoulder).lerp(foot, .52); knee.x += (leg.front ? -.045 : .05) * (1 - lying) + .035 * jumping
      leg.paw.position.copy(foot); leg.paw.rotation.z = -.1 * jumping
      bendLeg(leg.skin,shoulder,knee,foot,leg.front?.043:.054)
    }
    shadow.visible = action.motion !== 'jump'
  }
  pose(1, false)

  return {
    root,
    pet(camera:THREE.Vector3){if(action.motion==='jump'||place==='step')return false;petTime=3.2;petFacing=THREE.MathUtils.clamp(Math.atan2(-(camera.z-root.position.z),camera.x-root.position.x)-root.rotation.y,-.45,.45);return true},
    update(dt: number, options: Options) {
      if (!options.active && !options.reduced) return false
      const wasPet=petTime>0;petTime=Math.max(0,petTime-dt)
      const still = options.paused || options.reduced
      if (!still) clock += dt
      // Finish an airborne landing before settling. Never freeze above a surface.
      const finishJump = action.motion === 'jump'
      if (!previewLocked && ((!still && petTime<=0) || finishJump || place === 'step')) {
        elapsed = Math.min(action.duration, elapsed + dt)
        const t = elapsed / action.duration
        if (action.motion === 'walk' || action.motion === 'jump') {
          root.position.lerpVectors(from, action.to, smooth(t))
          if (finishJump) root.position.y += Math.sin(t * Math.PI) * (action.arc ?? .3)
          root.rotation.y = THREE.MathUtils.lerp(turnFrom, turnTo, smooth(Math.min(1, t * 3)))
          gait += previous.distanceTo(root.position) / SIZE / .28 * Math.PI * 2; previous.copy(root.position)
        }
        if (t === 1) {
          root.position.copy(action.to); place = action.place
          if(action.motion==='walk'&&place==='floor')floorTrips++
          if (action.node !== undefined) node = action.node
          if (!still || place === 'step') choose()
          else start(wait('rest', 30))
        }
      }
      pose(dt, still)
      return !still || lying !== 1 || finishJump || wasPet
    },
    inspect() { return {name:'嘻嘻',petting:petTime>0, place, motion: action.motion, position: root.position.toArray(), yaw: root.rotation.y, lying, elapsed, duration: action.duration, paws: legs.map(leg => root.localToWorld(leg.paw.position.clone()).toArray()) } },
    preview(mode: DogPreview) {
      // Used only by the development preview and geometry/animation checks.
      place = mode.startsWith('table') ? 'table' : 'floor'; node = place==='floor'?route.length-1:0; queue = []; wantsTable = false
      root.position.copy(place === 'table' ? tabletop[0] : route[node]); root.rotation.y = .25
      const eating=mode.endsWith('eat');if(eating){root.position.copy(place==='table'?tableMeal:floorMeal);root.rotation.y=0;previewLocked=true;lying=0;walking=0;start(wait('eat',30));pose(1,false);return}
      const rest = mode.endsWith('rest'); previewLocked = rest; lying = rest ? 1 : 0; walking = rest ? 0 : 1
      start(rest ? wait('rest', 30) : walkTo(place === 'table' ? tabletop[1] : route[node-1], place === 'floor' ? node-1 : undefined)); pose(1, false)
    },
  }
}

export function createDogStep() {
  const group = new THREE.Group(); group.position.set(step.x, 0, step.z)
  const wood = new THREE.MeshStandardMaterial({ color: '#9a7954', roughness: .8 })
  const fabric = new THREE.MeshStandardMaterial({ color: '#45616a', roughness: .97 })
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.26, .25, .075, 32), fabric); seat.position.y = STEP - .0375; group.add(seat)
  for (const [x, z] of [[-.15, -.15], [.15, -.15], [-.15, .15], [.15, .15]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.021, .027, STEP - .075 - FLOOR, 10), wood)
    leg.position.set(x, (STEP - .075 + FLOOR) / 2, z); group.add(leg)
  }
  group.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true } })
  return group
}

export function createDogDishes(){
  const group=new THREE.Group()
  for(const [x,y,z] of [[.86,TABLE,1.02],[.80,FLOOR,-2.80]]){
    const bowl=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.06,0),new THREE.Vector2(.085,.018),new THREE.Vector2(.088,.056),new THREE.Vector2(.078,.056),new THREE.Vector2(.071,.025),new THREE.Vector2(0,.019)],40),new THREE.MeshStandardMaterial({color:'#789890',roughness:.4}));bowl.position.set(x,y,z);bowl.castShadow=true;bowl.receiveShadow=true;group.add(bowl)
    for(let i=0;i<14;i++){const food=new THREE.Mesh(new THREE.SphereGeometry(.011,8,6),new THREE.MeshStandardMaterial({color:'#684529',roughness:1}));const angle=i*2.4,r=.055*Math.sqrt(i/14);food.position.set(x+Math.cos(angle)*r,y+.033,z+Math.sin(angle)*r);group.add(food)}
  }
  return group
}
