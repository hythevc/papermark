const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = __dirname;
const pages = [
 ['papermark-home','https://www.papermark.com/'],
 ['papermark-pricing','https://www.papermark.com/pricing'],
 ['docsend-home','https://www.docsend.com/'],
 ['docsend-pricing','https://www.docsend.com/pricing/'],
 ['firmex-vdr','https://www.firmex.com/virtual-data-room/'],
 ['ideals-home','https://www.idealsvdr.com/'],
];
(async()=>{
 const browser = await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:['--no-sandbox']});
 const results = await Promise.all(pages.map(async([name,url])=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}, deviceScaleFactor:1,ignoreHTTPSErrors:true});
  const page=await context.newPage();
  const result={name,url,viewportCaptures:[],capturedAt:new Date().toISOString()};
  try{
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   result.status=response?.status();
   await page.waitForTimeout(3500);
   result.finalUrl=page.url();result.title=await page.title();
   result.headings=await page.locator('h1,h2,h3').allTextContents();
   result.links=await page.locator('header a, nav a, footer a').evaluateAll(els=>els.map(e=>({text:e.textContent.trim(),href:e.href})).filter(e=>e.text));
   const body=await page.locator('body').innerText();fs.writeFileSync(path.join(out,name+'.txt'),body);
   for(const [width,height] of [[1440,1000],[390,844]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(1500);
    await page.screenshot({path:path.join(out,name+'-'+width+'.png'),fullPage:false});
    await page.screenshot({path:path.join(out,name+'-'+width+'-full.png'),fullPage:true});
    result.viewportCaptures.push({width,height,documentWidth:await page.evaluate(()=>document.documentElement.scrollWidth),file:name+'-'+width+'.png'});
   }
   result.visibleTextSnippet=body.slice(0,1800);
  }catch(e){result.error=e.message;}
  fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(result,null,2));await context.close();console.log(JSON.stringify(result));return result;
 }));
 fs.writeFileSync(path.join(out,'public-capture-manifest.json'),JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
