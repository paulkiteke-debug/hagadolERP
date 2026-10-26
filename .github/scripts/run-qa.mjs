import {spawn} from 'node:child_process';
// Keep the retained architecture under regression coverage while the shipped
// application defaults to the smaller CRM and Finance profile.
const [profile,...args]=process.argv.slice(2);
if(!['core','full'].includes(profile)||!args.length)throw Error('Provide core or full and a Node test command.');
const child=spawn(process.execPath,args,{stdio:'inherit',env:{...process.env,NEXT_PUBLIC_ERP_MODULE_PROFILE:profile}});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',(code)=>{process.exitCode=code??1;});
