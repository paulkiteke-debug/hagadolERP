import {env} from '@/lib/runtime';
import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../chatgpt-auth';
import {membership,AccessError} from '@/lib/security';
import OfficeScreen from '../erp-office-screen';
import {isModuleEnabled} from '@/lib/module-profile';
export const dynamic='force-dynamic';
export default async function OfficeDisplayPage(){const user=await requireChatGPTUser('/office-display');try{await membership(env as any,user);}catch(e){if(e instanceof AccessError)redirect('/access-denied');throw e;}if(!isModuleEnabled('Office'))redirect('/');return <OfficeScreen/>}
