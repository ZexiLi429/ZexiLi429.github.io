export function topology(primitive) {
 const p=primitive.getAttribute('POSITION').getArray(),indices=primitive.getIndices().getArray(),map=new Map(),ids=[],points=[],edges=[]
 for(let i=0;i<p.length/3;i++){const key=[p[i*3],p[i*3+1],p[i*3+2]].map(v=>Math.round(v*1e5)).join(',');let id=map.get(key);if(id===undefined){id=points.length;map.set(key,id);points.push(Array.from(p.slice(i*3,i*3+3)));edges.push(new Set())}ids.push(id)}
 for(let i=0;i<indices.length;i+=3){const a=ids[indices[i]],b=ids[indices[i+1]],c=ids[indices[i+2]];edges[a].add(b).add(c);edges[b].add(a).add(c);edges[c].add(a).add(b)}
 return {points,edges,ids}
}
export function distances(graph,seed,allowed=()=>true){
 const distance=new Float64Array(graph.points.length).fill(Infinity),heap=[]
 const push=(id,d)=>{let i=heap.length;heap.push([id,d]);while(i){const p=(i-1)>>1;if(heap[p][1]<=d)break;heap[i]=heap[p];i=p}heap[i]=[id,d]}
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][1]<heap[c][1])c++;if(heap[c][1]>=last[1])break;heap[i]=heap[c];i=c}heap[i]=last}return top}
 for(let i=0;i<distance.length;i++)if(seed(graph.points[i])){distance[i]=0;push(i,0)}
 while(heap.length){const [a,d]=pop();if(d!==distance[a])continue;const p=graph.points[a];for(const b of graph.edges[a]){const q=graph.points[b];if(!allowed(q))continue;const next=d+Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);if(next<distance[b]){distance[b]=next;push(b,next)}}}
 return distance
}
