import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=JSON.parse(fs.readFileSync('.next/server/app-paths-manifest.json','utf8'));
let passed=0;
for(const route of ['/crm/page','/finance/page','/eos/page','/office-display/page','/api/erp/route','/api/auth/[...nextauth]/route']){assert.ok(server[route],route+' has a Next.js build output');passed++;}
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
for(const name of ['vinext','vite','@cloudflare/vite-plugin','@cloudflare/workers-types','wrangler','workerd','miniflare','@opennextjs/cloudflare']){
 assert.ok(!Object.keys(lock.packages).some(key=>key.endsWith('node_modules/'+name)),name+' is absent from the install graph');passed++;
}
assert.ok(fs.existsSync('.next/BUILD_ID'));passed++;
console.log(JSON.stringify({passed,failed:0,output:'Next.js server and route manifests',browserNetworkMeasured:false}));
