import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [command,...args]=process.argv.slice(2);
if(!['dev','build','start'].includes(command))throw new Error('Use dev, build or start.');
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),command,...args],{stdio:'inherit',env:process.env});
child.on('error',error=>{console.error(error.message);process.exitCode=1});
child.on('exit',(code,signal)=>{if(signal)process.kill(process.pid,signal);else process.exitCode=code??1});
