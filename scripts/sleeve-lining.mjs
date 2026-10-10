import { Vector3, SphereGeometry } from 'three'
export function sleeveLining(doc,mesh,bodyWeights){
 const buffer=doc.getRoot().listBuffers()[0],positions=[],normals=[],joints=[],weights=[],indices=[]
 for(const sign of [-1,1]){
 const a=new Vector3(sign*.30,.18,-.025),b=new Vector3(sign*.46,-.23,.015),axis=b.clone().sub(a).normalize(),u=new Vector3(0,0,1).cross(axis).normalize(),v=axis.clone().cross(u),offset=positions.length/3
 for(let row=0;row<=14;row++){const t=row/14,center=a.clone().lerp(b,t),radius=.114-(.016*t)+Math.sin(t*Math.PI*6)*.002,fore=Math.max(0,(t-.78)/.22)*.45;for(let col=0;col<=48;col++){const angle=col/48*Math.PI*2,normal=u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(v,Math.sin(angle));positions.push(...center.clone().addScaledVector(normal,radius).toArray());normals.push(...normal.toArray());joints.push(sign<0?11:7,sign<0?12:8,0,0);weights.push(1-fore,fore,0,0)}}
 for(let row=0;row<14;row++)for(let col=0;col<48;col++){const i=offset+row*49+col;indices.push(i,i+1,i+49,i+1,i+50,i+49)}
 }
 const shell=new SphereGeometry(1,48,32),sp=shell.attributes.position.array,sn=shell.attributes.normal.array,offset=positions.length/3
 for(let i=0;i<sp.length/3;i++){const point=[sp[i*3]*.343,sp[i*3+1]*.48-.15,sp[i*3+2]*.185-.015];positions.push(...point);normals.push(...sn.slice(i*3,i*3+3));const list=bodyWeights(point[1]);for(let k=0;k<4;k++){joints.push(list[k]?.[0]??0);weights.push(list[k]?.[1]??0)}}for(const i of shell.index.array)indices.push(offset+i);shell.dispose()
 const primitive=doc.createPrimitive().setMaterial(doc.createMaterial('ReconstructedInnerSleeves').setBaseColorFactor([.023,.024,.026,1]).setRoughnessFactor(.9).setDoubleSided(true))
 for(const [name,type,array] of [['POSITION','VEC3',new Float32Array(positions)],['NORMAL','VEC3',new Float32Array(normals)],['JOINTS_0','VEC4',new Uint16Array(joints)],['WEIGHTS_0','VEC4',new Float32Array(weights)]])primitive.setAttribute(name,doc.createAccessor(name+'Lining').setType(type).setArray(array).setBuffer(buffer))
 primitive.setIndices(doc.createAccessor('SleeveLiningIndices').setType('SCALAR').setArray(new Uint16Array(indices)).setBuffer(buffer));mesh.addPrimitive(primitive)
}
