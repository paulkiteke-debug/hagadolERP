import {redirect} from 'next/navigation';
import {auth} from '@/auth';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export function safeReturnPath(value:string){try{if(!value.startsWith('/')||value.startsWith('//'))return '/';const url=new URL(value,'https://erp.local');if(url.origin!=='https://erp.local'||['/login','/logout'].includes(url.pathname)||url.pathname.startsWith('/api/auth'))return '/';return url.pathname+url.search+url.hash}catch{return '/'}}
export async function getChatGPTUser():Promise<ChatGPTUser|null>{
 if(!process.env.AUTH_SECRET)return null;
 const session=await auth();const user=session?.user as {id?:string;email?:string|null;name?:string|null}|undefined;
 if(!user?.id||!user.email)return null;
 return {userId:user.id,email:user.email,displayName:user.name||user.email,fullName:user.name||null};
}
export async function requireChatGPTUser(returnTo:string){const user=await getChatGPTUser();if(!user)redirect(chatGPTSignInPath(returnTo));return user}
export const chatGPTSignInPath=(returnTo='/')=>'/login?returnTo='+encodeURIComponent(safeReturnPath(returnTo));
export const chatGPTSignOutPath=(returnTo='/login')=>'/logout';
