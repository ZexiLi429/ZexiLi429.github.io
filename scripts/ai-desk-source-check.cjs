const assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
const sample=JSON.parse(fs.readFileSync('public/data/ai-desk.json','utf8'));
const module=await import('./ai-desk-source.mjs?test='+Date.now());let requests=0;
global.fetch=async()=>{requests++;await new Promise(resolve=>setTimeout(resolve,20));return new Response(JSON.stringify(sample),{status:200,headers:{'Content-Type':'application/json'}})};
const all=await Promise.all(Array.from({length:20},()=>module.loadDeskFeed()));assert.equal(requests,1);assert.ok(all.every(v=>v.fetchedAt===all[0].fetchedAt));const fetchedAt=all[0].fetchedAt;
global.fetch=async()=>{requests++;return new Response('Unavailable',{status:503,headers:{'Retry-After':'10800'}})};
const stale=await module.loadDeskFeed(true);assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,fetchedAt);assert.equal(requests,2);await module.loadDeskFeed(true);assert.equal(requests,2);
console.log('Concurrent feed deduplication, dated fallback and Retry-After passed');
})().catch(e=>{console.error(e);process.exit(1)});
