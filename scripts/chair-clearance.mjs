import {NodeIO} from '@gltf-transform/core'
import {Vector3,Box3,Euler} from 'three'
import assert from 'node:assert/strict'
const doc=await new NodeIO().read('public/models/scholar-head.glb'),p=doc.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION').getArray(),bounds=new Box3()
for(let i=0;i<p.length;i+=3)bounds.expandByPoint(new Vector3(p[i],p[i+1],p[i+2]))
const center=bounds.getCenter(new Vector3()),scale=2.65/(bounds.max.y-bounds.min.y)
let minimumGap=Infinity
for(let step=0;step<=40;step++){
 const s=step/40
 let min=Infinity,count=0
 const yaw=-.25+(.10+.25)*s,seat=-.15-.33*s,x=.25-.15*s,z=-.6+.26*s
 for(let i=0;i<p.length;i+=3){const v=new Vector3((p[i]-center.x)*scale,(p[i+1]-bounds.min.y)*scale,(p[i+2]-center.z)*scale).applyEuler(new Euler(-.025*s,yaw,0)).add(new Vector3(x,seat,z));if(v.y>=.745&&v.y<=1.495&&Math.abs(v.x-.10)<=.34){min=Math.min(min,v.z);count++}}
 const chairFront=-.84+.24*s-.30+.06,gap=min-chairFront
 assert.ok(gap>.025,`Backrest intersects body at seated progress ${s}: ${gap}`)
 minimumGap=Math.min(minimumGap,gap)
}
console.log({checkedPoses:41,minimumBackrestGap:minimumGap})
