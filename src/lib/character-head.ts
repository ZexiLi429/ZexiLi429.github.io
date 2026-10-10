import * as THREE from 'three'

/** Conservative neck motion: the original eyes, glasses and face turn together. */
export function createCharacterHead(root: THREE.Object3D) {
 const head=root.getObjectByName('Head'),rest=head?.quaternion.clone()
 const target=new THREE.Vector3(),rotation=new THREE.Quaternion()
 let yaw=0,pitch=0
 return {
  update(worldTarget: THREE.Vector3,dt:number,reduced:boolean){
   if(!head?.parent||!rest)return false
   head.parent.updateWorldMatrix(true,false)
   target.copy(worldTarget);head.parent.worldToLocal(target);target.sub(head.position)
   const desiredYaw=reduced?0:THREE.MathUtils.clamp(Math.atan2(target.x,Math.max(.1,target.z)),-.12,.12)
   const desiredPitch=reduced?0:THREE.MathUtils.clamp(-Math.atan2(target.y,Math.hypot(target.x,target.z)),-.025,.025)
   const alpha=reduced?1:1-Math.exp(-dt*4.5)
   yaw=THREE.MathUtils.lerp(yaw,desiredYaw,alpha);pitch=THREE.MathUtils.lerp(pitch,desiredPitch,alpha)
   if(Math.abs(yaw-desiredYaw)<1e-5)yaw=desiredYaw
   if(Math.abs(pitch-desiredPitch)<1e-5)pitch=desiredPitch
   rotation.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));head.quaternion.copy(rest).multiply(rotation)
   return yaw!==desiredYaw||pitch!==desiredPitch
  },
  pose(){return {yaw,pitch}},
 }
}
