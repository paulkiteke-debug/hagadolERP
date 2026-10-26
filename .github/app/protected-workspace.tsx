import {env} from '@/lib/runtime';
import {redirect} from 'next/navigation';
import {requireChatGPTUser} from './chatgpt-auth';
import {membership,AccessError} from '@/lib/security';
import {canReadModule,viewModule,isViewEnabled,landingView} from '@/lib/access-policy';
import ERP from './erp';
export default async function ProtectedWorkspace({view='Executive',path='/',tab}:{view?:string;path?:string;tab?:string}){
 const user=await requireChatGPTUser(path);let access;
 try{access=await membership(env as any,user);}catch(e){if(e instanceof AccessError)redirect('/access-denied');throw e;}
 if(access.role==='Office display'&&isViewEnabled('Office display'))redirect('/office-display');
 if(!landingView(access))redirect('/access-denied');
 if(!isViewEnabled(view))redirect('/');
 const target=canReadModule(access,viewModule(view))?view:landingView(access)!;
 return <ERP initial={{view:target,company:access.companies.length===2?'Group':access.companies[0],...(tab&&target===view?{tab}:{})}}/>;
}
