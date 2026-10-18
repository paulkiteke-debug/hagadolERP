export const runtime='nodejs';
import type {SQLDatabase} from '@/lib/storage-types';
import {env} from '@/lib/runtime';
import {authenticate,AccessError,securityFailure} from '@/lib/security';
import {aiStatus,AIConfig} from '@/lib/os-ai';
import {releaseVersion,releaseScope} from '@/lib/release';
export const dynamic='force-dynamic';
export async function GET(){try{const {access}=await authenticate(env as any);if(!['Owner','Administrator'].includes(access.role))throw new AccessError('Only administrators can view release readiness.');const c=env as unknown as AIConfig&{DB:SQLDatabase};await c.DB.prepare('SELECT id, document_code FROM records LIMIT 1').first();await c.DB.prepare('SELECT id FROM ai_runs LIMIT 1').first();return Response.json({version:releaseVersion,scope:releaseScope,database:'Available',ai:aiStatus(c)},{headers:{'Cache-Control':'no-store'}});}catch(e){return securityFailure(e);}}
