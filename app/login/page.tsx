import {signIn} from '@/auth';
import {safeReturnPath} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{returnTo?:string}>}){
 const params=await searchParams,returnTo=safeReturnPath(params.returnTo||'/'),ready=!!(process.env.AUTH_SECRET&&process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET);
 return <main className="authpage"><img src="/brand/hagadol-logo.png" alt="Hagadol Water Solar"/><h1>Welcome to Hagadol ERP</h1><p>Sign in with your authorised Google account.</p>{ready?<form action={async()=>{'use server';await signIn('google',{redirectTo:returnTo})}}><button className="primary" type="submit">Sign in with Google</button></form>:<p role="status">Sign in is awaiting server configuration. Contact the workspace owner.</p>}<small>Water | Solar · From Source to Use.</small></main>;
}
