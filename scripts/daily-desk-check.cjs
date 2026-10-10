const {chromium}=require('C:/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');const payload=await page.evaluate(async()=>await(await fetch('/data/ai-desk.json')).json());
 await page.waitForSelector('[data-feed-status="live"]');await page.waitForFunction(()=>document.querySelector('[data-model-status="ready"]'));
 const expected=payload.items.sort((a,b)=>a.rank-b.rank).slice(0,3).map(x=>x.title);
 assert.deepEqual(await page.locator('.brief-reading li strong').allTextContents(),expected);assert.equal(await page.locator('.computer-hotspot').getAttribute('href'),'https://aihot.news/daily');
 const settle=async()=>{await page.waitForTimeout(300);await page.waitForFunction(()=>document.querySelector('.studio-canvas').dataset.headSettled==='true')};
 const go=async(id)=>{await page.evaluate(id=>scrollTo({top:document.querySelector('#'+id).getBoundingClientRect().top+scrollY-innerHeight*.1,behavior:'instant'}),id);await settle()};
 await go('about');await page.locator('.daily-brief summary').click();await page.screenshot({path:'preview-artifacts/daily-desk-reading.png'});
 await page.evaluate(async()=>{const m=await import('/src/lib/daily-desk.ts');const cache=JSON.parse(localStorage.getItem('zexi-ai-desk-v1'));const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1140;m.drawDailyDesk(canvas,{...cache,status:'live',day:m.shanghaiDay()});window.deskPNG=canvas.toDataURL();});
 fs.writeFileSync('preview-artifacts/daily-screen.png',Buffer.from((await page.evaluate(()=>window.deskPNG)).split(',')[1],'base64'));
 await page.locator('.daily-brief summary').click();await go('resume');await page.screenshot({path:'preview-artifacts/daily-desk-studio.png'});
 // Test the projected computer's real raycast click. Nearby furniture must not navigate.
 const target=await page.locator('.computer-hotspot').boundingBox();let clicked=false;
 await page.route('https://aihot.news/daily',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>AIHOT daily</title>'}));
 for(let row=1;row<5&&!clicked;row++)for(let col=1;col<5&&!clicked;col++){
  const x=target.x+target.width*col/5,y=target.y+target.height*row/5;
  if(!await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('.computer-hotspot')!==null,{x,y}))continue;
  const popupPromise=page.waitForEvent('popup',{timeout:700}).catch(()=>null);await page.mouse.click(x,y);const popup=await popupPromise;
  if(popup){await popup.waitForLoadState();assert.equal(popup.url(),'https://aihot.news/daily');await popup.close();clicked=true}
 }
 assert.ok(clicked,'Computer must have a reachable physical click target');
 await page.locator('.computer-hotspot').focus();const keyboardPopup=page.waitForEvent('popup');await page.keyboard.press('Enter');const popup=await keyboardPopup;await popup.waitForLoadState();assert.equal(popup.url(),'https://aihot.news/daily');await popup.close();
 // Cached offline data retains its source date and never reports a live status.
 await page.route('**/data/ai-desk.json',route=>route.abort());await page.reload();await page.waitForSelector('[data-feed-status="cached"]');assert.deepEqual(await page.locator('.brief-reading li strong').allTextContents(),expected);assert.ok((await page.locator('.brief-meta').textContent()).includes('离线缓存'));
 const dayTest=await page.evaluate(async()=>{const m=await import('/src/lib/daily-desk.ts');return {before:m.shanghaiDay(new Date('2026-10-08T15:59:59Z')),after:m.shanghaiDay(new Date('2026-10-08T16:00:00Z')),a:m.dailyPhrase('2026-10-08'),b:m.dailyPhrase('2026-10-09')}});assert.equal(dayTest.before,'2026-10-08');assert.equal(dayTest.after,'2026-10-09');assert.notEqual(dayTest.a,dayTest.b);
 const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await mobile.route('**/data/ai-desk.json',route=>route.fulfill({json:payload}));await mobile.goto('http://127.0.0.1:5173/#about');await mobile.waitForSelector('[data-feed-status="live"]');await mobile.locator('.daily-brief summary').click();await mobile.locator('.daily-brief').scrollIntoViewIfNeeded();await mobile.screenshot({path:'preview-artifacts/daily-desk-mobile.png'});assert.equal(await mobile.locator('.brief-reading li').count(),3);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);fs.writeFileSync('preview-artifacts/daily-desk-check.json',JSON.stringify({passed:true,liveSource:expected,physicalClick:clicked,keyboard:true,cache:true,dayTest,mobile:true,errors},null,2));await browser.close();console.log('Live top3, physical and keyboard computer link, offline cache, daily rollover and mobile passed');
})().catch(e=>{console.error(e);process.exit(1)});
