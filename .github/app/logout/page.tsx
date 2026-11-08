import {signOut} from '@/auth';
export const dynamic='force-dynamic';
export default function Logout(){return <main className="authpage"><h1>Sign out</h1><form action={async()=>{'use server';await signOut({redirectTo:'/login'})}}><button className="primary" type="submit">Confirm sign out</button></form><a href="/">Return to ERP</a></main>}
