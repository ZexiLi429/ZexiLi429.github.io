import * as THREE from 'three'

/** Small visual iris shifts on the original surface. No eyeball geometry or rig. */
export function createSurfaceGaze(root: THREE.Object3D, enabled=true) {
 const offset=new THREE.Vector2(),desired=new THREE.Vector2(),head=root.getObjectByName('Head'),target=new THREE.Vector3()
 const fragment=`
 #include <map_fragment>
 #ifdef USE_MAP
  // The source texture contains a second, flat lower-frame stroke on the skin.
  // Restrict its repair to the recessed face surface; raised real frames stay intact.
  bool leftFace=vEyeRestPosition.x<0.0;
  vec2 repairCentre=leftFace?vec2(-0.065,0.5835):vec2(0.036,0.608);
  vec2 repairSize=leftFace?vec2(0.020,0.0045):vec2(0.023,0.0055);
  float repairMask=1.0-smoothstep(leftFace?0.65:0.80,1.0,length((vEyeRestPosition.xy-repairCentre)/repairSize));
  repairMask*=1.0-smoothstep(0.245,0.249,vEyeRestPosition.z);
  repairMask*=smoothstep(0.210,0.225,vEyeRestPosition.z);
  // The remaining light-brown rim is part of the same baked stroke: repair its
  // full colour range on the right patch, rather than leaving its lighter edge.
  float darkStroke=leftFace?1.0-smoothstep(0.22,0.42,dot(sampledDiffuseColor.rgb,vec3(0.2126,0.7152,0.0722))):1.0;
  vec3 adjacentSkin=texture2D(map,leftFace?vec2(0.361328,0.468356):vec2(0.903308,0.917739)).rgb;
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuse*adjacentSkin,repairMask*darkStroke);
  vec2 eyeCentre = vEyeRestPosition.x < 0.0 ? vec2(-0.087,0.640) : vec2(0.048,0.665);
  vec2 eyeXY=vEyeRestPosition.xy-eyeCentre;
  eyeXY.y-=eyeXY.x*0.18;
  float eyeRadius=length(eyeXY/vec2(0.025,0.007));
  float eyeMask=1.0-smoothstep(0.45,1.0,eyeRadius);
  vec2 px=dFdx(vEyeRestPosition.xy),py=dFdy(vEyeRestPosition.xy);
  vec2 uvDx=dFdx(vMapUv),uvDy=dFdy(vMapUv);
  float determinant=px.x*py.y-px.y*py.x;
  if(eyeMask>0.0 && vEyeRestPosition.z>0.195 && vEyeRestPosition.z<0.235 && length(irisOffset)>0.0000001){
   if(abs(determinant)>0.000000000001){
    vec2 displacement=-irisOffset*eyeMask;
    vec2 screenStep=vec2(py.y*displacement.x-py.x*displacement.y,-px.y*displacement.x+px.x*displacement.y)/determinant;
    vec2 uvStep=uvDx*screenStep.x+uvDy*screenStep.y;
    vec4 irisSample=texture2D(map,vMapUv+uvStep);
    diffuseColor=vec4(diffuse,opacity)*irisSample;
   }
  }
 #endif
 `
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return
  // Smooth only the tiny skin ridges beneath the duplicated strokes, never the raised frame.
  const geometry=object.geometry.clone(),positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal')
  const smoothNormal=new THREE.Vector3(),originalNormal=new THREE.Vector3()
  if(normals)for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),left=x<0
   const radius=Math.hypot((x-(left?-.065:.036))/(left?.020:.023),(y-(left?.5835:.608))/(left?.0045:.0055))
   const weight=(1-THREE.MathUtils.smoothstep(radius,left?.65:.80,1))*(1-THREE.MathUtils.smoothstep(z,.245,.249))*THREE.MathUtils.smoothstep(z,.210,.225)
   if(weight<=0)continue
   smoothNormal.set(left?(x+.025)*8:(x+.003)*7,.35,.90).normalize()
   originalNormal.fromBufferAttribute(normals,i).lerp(smoothNormal,weight).normalize()
   normals.setXYZ(i,originalNormal.x,originalNormal.y,originalNormal.z)
  }
  object.geometry=geometry
  const list=Array.isArray(object.material)?object.material:[object.material]
  const materials=list.map(original=>{
   if(!(original instanceof THREE.MeshStandardMaterial)||!original.map)return original
   const material=original.clone()
   material.onBeforeCompile=shader=>{
    shader.uniforms.irisOffset={value:offset}
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vEyeRestPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvEyeRestPosition=position;')
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vEyeRestPosition;\nuniform vec2 irisOffset;').replace('#include <map_fragment>',fragment).replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n#ifdef USE_MAP\nnormal=normalize(mix(normal,nonPerturbedNormal,repairMask));\n#endif')
   }
   material.customProgramCacheKey=()=> 'original-surface-iris-clean-v3'
   return material
  })
  object.material=Array.isArray(object.material)?materials:materials[0]
 })
 return {
  setManual(horizontal:number,vertical=0){offset.set(THREE.MathUtils.clamp(horizontal,-1,1)*.002,THREE.MathUtils.clamp(vertical,-1,1)*.0006)},
  reset(){offset.set(0,0)},
  pose(){return offset.toArray()},
  update(worldTarget:THREE.Vector3,dt:number){
   if(!head||!enabled)return false
   head.updateWorldMatrix(true,false);target.copy(worldTarget);head.worldToLocal(target)
   const x=THREE.MathUtils.clamp(Math.atan2(target.x,Math.max(.1,target.z))*.007,-.002,.002)
   const y=THREE.MathUtils.clamp(Math.atan2(target.y,Math.hypot(target.x,target.z))*.003,-.0006,.0006)
   offset.lerp(desired.set(x,y),1-Math.exp(-dt*6))
   if(Math.abs(offset.x-x)<1e-7)offset.x=x
   if(Math.abs(offset.y-y)<1e-7)offset.y=y
   return offset.x!==x||offset.y!==y
  },
 }
}
