import * as THREE from 'three'

/** Bounded eye rotations in head space; keep both pupils looking at one target. */
export function createCharacterGaze(root: THREE.Object3D) {
 const eyes = ['RightEye','LeftEye'].map(name=>root.getObjectByName(name)).filter((eye): eye is THREE.Object3D=>!!eye)
 const target = new THREE.Vector3(), origin = new THREE.Vector3()
 return {
  eyes,
  update(worldTarget: THREE.Vector3, dt: number, immediate = false) {
   let moving=false
   for(const eye of eyes){
    if(!eye.parent)continue
    eye.parent.updateWorldMatrix(true,false)
    target.copy(worldTarget);eye.parent.worldToLocal(target);origin.copy(eye.position);target.sub(origin)
    const yaw=THREE.MathUtils.clamp(Math.atan2(target.x,Math.max(.1,target.z)),-.17,.17)
    const pitch=THREE.MathUtils.clamp(-Math.atan2(target.y,Math.hypot(target.x,target.z)),-.09,.09)
    const alpha=immediate?1:1-Math.exp(-dt*7)
    eye.rotation.y=Math.abs(eye.rotation.y-yaw)<1e-5?yaw:THREE.MathUtils.lerp(eye.rotation.y,yaw,alpha)
    eye.rotation.x=Math.abs(eye.rotation.x-pitch)<1e-5?pitch:THREE.MathUtils.lerp(eye.rotation.x,pitch,alpha)
    if(Math.abs(eye.rotation.y-yaw)<1e-5)eye.rotation.y=yaw
    if(Math.abs(eye.rotation.x-pitch)<1e-5)eye.rotation.x=pitch
    moving ||= Math.abs(eye.rotation.y-yaw)>1e-5 || Math.abs(eye.rotation.x-pitch)>1e-5
   }
   return moving
  },
  reset(){for(const eye of eyes)eye.rotation.set(0,0,0)},
 }
}
