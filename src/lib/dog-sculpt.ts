import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'

type Volume = { c: [number, number, number]; r: [number, number, number] }
const merge = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25 }
/** Bake one continuous sculpted surface, rather than intersecting visible balls. */
export function sculpt(volumes: Volume[], half: [number,number,number], center: [number,number,number], softness=.04, resolution=52) {
  const marching = new MarchingCubes(resolution,new THREE.MeshBasicMaterial(),false,false,20000);marching.isolation=0
  for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
    const px=(x/resolution*2-1)*half[0]+center[0],py=(y/resolution*2-1)*half[1]+center[1],pz=(z/resolution*2-1)*half[2]+center[2]
    let field=100
    for(const v of volumes){const distance=(Math.hypot((px-v.c[0])/v.r[0],(py-v.c[1])/v.r[1],(pz-v.c[2])/v.r[2])-1)*Math.min(...v.r);field=merge(field,distance,softness)}
    marching.field[x+y*resolution+z*resolution*resolution]=-field
  }
  marching.update()
  const geometry=new THREE.BufferGeometry(),count=marching.geometry.drawRange.count
  for(const key of ['position','normal']){const a=marching.geometry.getAttribute(key);geometry.setAttribute(key,new THREE.BufferAttribute(new Float32Array(a.array.slice(0,count*3)),3))}
  geometry.scale(...half);geometry.translate(...center);geometry.computeBoundingSphere()
  marching.geometry.dispose();(marching.material as THREE.Material).dispose()
  return geometry
}
export function puppyTorso(){return sculpt([
  {c:[-.07,0,0],r:[.32,.17,.145]},
  {c:[-.25,.005,0],r:[.135,.16,.145]},
  {c:[.155,.018,0],r:[.17,.182,.15]},
  {c:[.24,.065,0],r:[.10,.13,.118]},
], [.46,.38,.23],[0,.035,0],.07)}
export function puppyFace(){return sculpt([
  {c:[0,.005,0],r:[.157,.151,.134]},
  {c:[.082,-.043,.068],r:[.083,.065,.074]},
  {c:[.082,-.043,-.068],r:[.083,.065,.074]},
  {c:[.135,-.018,0],r:[.098,.055,.074]},
  {c:[.164,-.061,.036],r:[.062,.044,.060]},
  {c:[.164,-.061,-.036],r:[.062,.044,.060]},
  {c:[.12,-.092,0],r:[.095,.029,.080]},
],[.28,.215,.19],[.025,-.015,0],.033,58)}
export function puppyEar(side:number){return sculpt([
  {c:[0,-.023,0],r:[.064,.052,.025]},
  {c:[-.022,-.088,side*.016],r:[.064,.087,.032]},
  {c:[-.045,-.145,side*.012],r:[.049,.044,.032]},
],[.11,.16,.07],[-.014,-.065,0],.025,36)}
export function puppyFur(base: string, chest = false, face = false) {
  const material=new THREE.MeshStandardMaterial({color:base,roughness:.92})
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCoatPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCoatPosition=position;')
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vCoatPosition;
float coatGrain(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
`).replace('#include <color_fragment>',`#include <color_fragment>
float grain=coatGrain(floor(vCoatPosition*vec3(260.,660.,260.)));
float strands=sin(vCoatPosition.y*720.+sin(vCoatPosition.x*175.)*2.)*.5+.5;
diffuseColor.rgb*=.955+grain*.045+strands*.035;
${chest?'float bib=smoothstep(.12,.26,vCoatPosition.x)*(1.-smoothstep(-.015,.105,vCoatPosition.y));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.69,.46),bib*.65);':''}
${face?'float muzzle=smoothstep(.08,.16,vCoatPosition.x)*(1.-smoothstep(-.035,.01,vCoatPosition.y));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.74,.54),muzzle*.85);':''}
`)
  }
  material.customProgramCacheKey=()=>`puppy-coat-${chest}-${face}`
  return material
}
const rings=14,sides=12
export function fleshyLeg(material:THREE.Material){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((rings+1)*(sides+1)*3),3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array((rings+1)*(sides+1)*3),3).setUsage(THREE.DynamicDrawUsage))
  const indices=[];for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1)}geometry.setIndex(indices)
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;return mesh
}
const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),point=new THREE.Vector3(),axis=new THREE.Vector3()
export function bendLeg(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,radius:number){
  const positions=mesh.geometry.getAttribute('position') as THREE.BufferAttribute,normals=mesh.geometry.getAttribute('normal') as THREE.BufferAttribute
  for(let i=0;i<=rings;i++){
    const t=i/rings,u=1-t;point.copy(a).multiplyScalar(u*u).addScaledVector(b,2*u*t).addScaledVector(c,t*t)
    tangent.copy(b).sub(a).multiplyScalar(u).addScaledVector(axis.copy(c).sub(b),t).normalize()
    axis.set(Math.abs(tangent.y)>.9?1:0,Math.abs(tangent.y)>.9?0:1,0);normal.crossVectors(tangent,axis).normalize();binormal.crossVectors(tangent,normal).normalize()
    const r=THREE.MathUtils.lerp(radius,.031,t)*(1+.1*Math.sin(Math.PI*t))
    for(let j=0;j<=sides;j++){const angle=j/sides*Math.PI*2,cs=Math.cos(angle),sn=Math.sin(angle),index=i*(sides+1)+j;axis.copy(normal).multiplyScalar(cs).addScaledVector(binormal,sn);positions.setXYZ(index,point.x+axis.x*r,point.y+axis.y*r,point.z+axis.z*r);normals.setXYZ(index,axis.x,axis.y,axis.z)}
  }
  positions.needsUpdate=true;normals.needsUpdate=true;mesh.geometry.boundingBox=null
}
