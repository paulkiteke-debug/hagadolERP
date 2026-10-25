// Optional local browser QA. Requires Playwright and a Chromium executable.
// Runs only against the synthetic static fixture; never contacts the ERP database.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.env.CRM_PREVIEW_OUTPUT||'/tmp/hagadol-crm-browser-preview');
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+(req.url==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/'))throw Error('Invalid path');const bytes=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.html':'text/html'})[extname(path)]||'application/octet-stream');res.end(bytes);}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let passed=0;const check=(v,label)=>{assert.ok(v,label);passed++;};
async function noOverflow(label){check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),label+' has no page overflow');}
async function reset(){await page.goto(url);await page.getByRole('heading',{name:'Sales pipeline',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);}
try{
 await reset();
 check(await page.locator('.crmdeal').count()===6,'Hagadol board has its six synthetic deals');
 check(await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button').count()===4,'Four simple CRM navigation items');
 check(await page.locator('.crm-entity-switch').isVisible(),'Business switch is visible');
 check(await page.locator('.crm-shell > .erpSidebar').isHidden(),'CRM uses the supplied full width layout');
 check(await page.locator('.topbar').evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(38, 76, 92)','Slate header');
 check(await page.evaluate(()=>document.fonts.check('12px Tahoma')),'Tahoma font is loaded');
 await noOverflow('Desktop board');
 await page.screenshot({path:root+'/desktop.png',fullPage:true});
 // A guarded stage change must leave the stored card in its original stage.
 await page.getByLabel('Move School water supply to stage',{exact:true}).selectOption('Quotation');
 await page.getByRole('dialog',{name:'Stage change needs information'}).waitFor();
 check((await page.getByRole('dialog').innerText()).includes('Before moving to Quotation'),'Stage restrictions explain the target stage');
 await page.keyboard.press('Escape');
 check(await page.getByLabel('Move School water supply to stage',{exact:true}).inputValue()==='New','Rejected stage is not applied optimistically');
 // Native drag uses the same guarded, versioned mutation as the stage menu.
 await page.locator('.crm-board-v2').evaluate(e=>e.scrollIntoView({block:'start'}));
 await page.locator('.crmdeal').filter({has:page.getByRole('heading',{name:'School water supply',exact:true})}).dragTo(page.getByRole('region',{name:'Qualified deals',exact:true}),{sourcePosition:{x:30,y:40},targetPosition:{x:40,y:20}});
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('select')).find(e=>e.getAttribute('aria-label')==='Move School water supply to stage')?.value==='Qualified');
 check(await page.getByLabel('Move School water supply to stage',{exact:true}).inputValue()==='Qualified','Native drag saves a permitted stage');
 // Detail focus, form and saved record.
 await page.getByRole('button',{name:/School water supply/}).first().click();
 await page.getByRole('dialog',{name:'Deal details'}).waitFor();
 await page.screenshot({path:root+'/deal-drawer.png',fullPage:true});
 await page.keyboard.press('Escape');
 check(await page.locator('dialog').count()===0,'Escape closes the drawer');
 check(await page.locator('.dealcard:focus').count()===1,'Focus returns to the deal card');
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Contacts',exact:true}).click();
 await page.getByRole('heading',{name:'Contacts',exact:true}).waitFor();
 check(await page.getByText('Example Customer',{exact:true}).isVisible(),'Contacts directory is connected');
 await page.screenshot({path:root+'/contacts.png',fullPage:true});
 await page.getByRole('button',{name:'New contact',exact:true}).click();
 await page.getByRole('dialog',{name:'New contact'}).waitFor();
 await page.getByLabel('Contact name',{exact:true}).fill('Browser QA Contact');
 await page.getByLabel('Email',{exact:true}).fill('qa@example.invalid');
 await page.screenshot({path:root+'/contact-form.png',fullPage:true});
 await page.getByRole('button',{name:'Save contact',exact:true}).click();
 await page.getByRole('dialog',{name:'Contact details'}).getByRole('heading',{name:'Browser QA Contact',exact:true}).waitFor();
 check(true,'New contact is saved through the existing sample posting engine');
 await page.getByRole('button',{name:'Edit contact',exact:true}).click();await page.getByLabel('Phone',{exact:true}).fill('+256700001234');await page.getByRole('button',{name:'Save contact',exact:true}).click();await page.getByRole('dialog',{name:'Contact details'}).waitFor();await page.getByText('Customer and source details',{exact:true}).click();check(await page.getByRole('dialog',{name:'Contact details'}).getByText('+256700001234',{exact:true}).isVisible(),'Editing a contact preserves and updates the same record');await page.keyboard.press('Escape');
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Companies',exact:true}).click();await page.getByRole('button',{name:'New company',exact:true}).click();await page.getByLabel('Company name',{exact:true}).fill('Browser QA Company');await page.getByRole('button',{name:'Save company',exact:true}).click();await page.getByRole('dialog',{name:'Company details'}).getByRole('heading',{name:'Browser QA Company',exact:true}).waitFor();check(true,'Company creation is functional');await page.keyboard.press('Escape');
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Activities & Tasks',exact:true}).click();await page.getByRole('button',{name:'New activity',exact:true}).click();await page.getByLabel('Activity subject',{exact:true}).fill('Browser QA Call');await page.getByLabel('Owner',{exact:true}).fill('Example sales lead');await page.getByLabel('Activity type',{exact:true}).selectOption('Call');await page.getByRole('button',{name:'Save activity',exact:true}).click();await page.getByRole('dialog',{name:'Activity details'}).getByRole('heading',{name:'Browser QA Call',exact:true}).waitFor();check(true,'Call creation is functional');await page.keyboard.press('Escape');
 // Task completion updates the actual shared state and removes the priority item.
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Pipeline',exact:true}).click();
 await page.getByRole('button',{name:'Complete Discuss the pumping requirements',exact:true}).click();
 check(await page.getByRole('button',{name:'Complete Discuss the pumping requirements',exact:true}).count()===0,'Completed priority disappears after saved state refresh');
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Activities & Tasks',exact:true}).click();
 await page.getByLabel('Record status',{exact:true}).selectOption('Closed');
 check(await page.getByRole('button',{name:'Reopen Discuss the pumping requirements',exact:true}).isVisible(),'Completed task appears in closed activities');
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Pipeline',exact:true}).click();
 // Recording a loss is allowed even when technical requirements are missing.
 await page.getByLabel('Move School water supply to stage',{exact:true}).selectOption('Lost');
 await page.getByRole('dialog',{name:'Record deal loss'}).waitFor();
 await page.getByRole('button',{name:'Save loss',exact:true}).click();
 check(await page.getByLabel('Reason lost',{exact:true}).evaluate(e=>!e.validity.valid),'Loss reason is required');
 await page.getByLabel('Reason lost',{exact:true}).fill('Synthetic client postponed the work');
 await page.getByLabel('Follow up date, optional',{exact:true}).fill('2099-01-01');
 await page.getByRole('button',{name:'Save loss and follow up',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'detached'});
 check(await page.getByLabel('Move School water supply to stage',{exact:true}).count()===0,'Lost deal leaves the open pipeline');
 check(await page.getByRole('button',{name:/^Follow up: School water supply/}).isVisible(),'Loss generates a linked follow up in priorities');
 // Entity scope and group view.
 await page.getByRole('navigation',{name:'Operating business'}).getByRole('button',{name:'WMK Architects',exact:true}).click();
 await page.getByRole('heading',{name:'Design & project pipeline',exact:true}).waitFor();
 check(await page.locator('.crmdeal').count()===2,'WMK board isolates its two deals');
 check(await page.getByLabel('Move School water supply to stage',{exact:true}).count()===0,'WMK contains no Hagadol cards');
 await page.getByRole('navigation',{name:'Operating business'}).getByRole('button',{name:'Group view',exact:true}).click();
 await page.getByRole('heading',{name:'Group sales pipeline',exact:true}).waitFor();
 check(await page.locator('.crmdeal').count()===7,'Authorised group consolidates remaining open deals');
 // Search finds Bigin IDs and customer records across CRM views.
 await page.getByRole('searchbox',{name:'Search CRM',exact:true}).fill('QA-CONTACT-001');
 await page.getByRole('region',{name:'CRM search results'}).getByRole('button').first().click();
 await page.getByRole('dialog',{name:'Contact details'}).getByRole('heading',{name:'Example Customer',exact:true}).waitFor();
 check(true,'Global CRM search finds the exact source ID across record types');
 await page.keyboard.press('Escape');
 // Original Bigin CSV preview is read only and maintains row association.
 await reset();await page.getByText('Actions',{exact:true}).click();await page.getByRole('button',{name:'Bigin import review',exact:true}).click();
 const csv='Contact Id,Contact Name,First Name,Last Name,Company Name,Email,Phone,Job Title,Business Unit\n'+'zcrm_123456789012345,Example One,Example,One,Original Company,one@example.invalid,+256700001001,Engineer,Hagadol\n'+'zcrm_123456789012346,Example Two,Example,Two,Second Company,two@example.invalid,+256700001002,,Hagadol';
 await page.getByLabel('Choose a Bigin CSV').setInputFiles({name:'synthetic-bigin.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.locator('.crm-import-review tbody tr').first().waitFor();
 check((await page.locator('.crm-import-review tbody tr').first().innerText()).includes('+256700001001'),'Import preview keeps the first telephone on its own row');
 check((await page.locator('.crm-import-review tbody tr').nth(1).innerText()).includes('+256700001002'),'Import preview keeps the second telephone on its own row');
 check(await page.getByRole('button',{name:/Approve|Post import|Confirm import/}).count()===0,'Preview has no posting action');
 await page.screenshot({path:root+'/import-review.png',fullPage:true});await page.keyboard.press('Escape');
 // Narrow screens and real keyboard containment.
 await reset();await page.setViewportSize({width:390,height:844});
 await noOverflow('Mobile board');
 await page.screenshot({path:root+'/mobile.png',fullPage:true});
 await page.getByRole('button',{name:'New deal',exact:true}).click();
 await page.getByRole('dialog',{name:'New deal'}).waitFor();
 await page.getByLabel('Deal name',{exact:true}).fill('Mobile QA Deal');
 await page.getByLabel('Owner',{exact:true}).fill('Example owner');
 await page.getByLabel('Customer name, if not linked',{exact:true}).fill('Example Mobile Customer');
 await page.getByLabel('Value UGX',{exact:true}).fill('100000');
 for(let i=0;i<18;i++)await page.keyboard.press('Tab');
 check(await page.evaluate(()=>!!document.activeElement?.closest('dialog')),'Keyboard focus stays inside the modal form');
 await noOverflow('Mobile form');await page.screenshot({path:root+'/mobile-form.png',fullPage:true});
 await page.getByRole('button',{name:'Save deal',exact:true}).click();
 await page.getByRole('dialog',{name:'Deal details'}).getByRole('heading',{name:'Mobile QA Deal',exact:true}).waitFor();
 check(true,'Mobile deal form saves successfully');await page.keyboard.press('Escape');
 await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Companies',exact:true}).click();
 await noOverflow('Mobile companies directory');await page.screenshot({path:root+'/mobile-companies.png',fullPage:true});
 await page.setViewportSize({width:1024,height:768});await page.getByRole('navigation',{name:'CRM navigation'}).getByRole('button',{name:'Pipeline',exact:true}).click();await noOverflow('Tablet board');await page.screenshot({path:root+'/tablet.png',fullPage:true});
 // The other ERP modules retain their own navigation and layout.
 await page.locator('.mobilemenu > summary').click();await page.locator('.mobilemenu').getByRole('button',{name:'Finance',exact:true}).click();await page.locator('.finance-workspace').waitFor();check(await page.locator('.erpShell').evaluate(e=>!e.classList.contains('crm-shell')),'Finance retains the original ERP shell');await noOverflow('Finance after leaving CRM');
 check(errors.length===0,'No browser runtime errors: '+errors.join(', '));
 console.log(JSON.stringify({passed,failed:0,syntheticData:true,viewports:[1440,1024,390],liveProductionTouched:false}));
 await writeFile(root+'/browser-results.json',JSON.stringify({passed,failed:0,errors,syntheticData:true,liveProductionTouched:false},null,2));
}catch(e){await page.screenshot({path:root+'/failure.png',fullPage:true});console.error(e);process.exitCode=1;}finally{await browser.close();await new Promise(r=>server.close(r));}
