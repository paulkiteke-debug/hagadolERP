import {chatGPTSignOutPath} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default function AccessDenied(){return <main className="authpage"><img src="/brand/hagadol-logo.png" alt="Hagadol Water Solar"/><h1>ERP access required</h1><p>Your account does not have active ERP access. Ask the workspace owner to check your role and company permissions.</p><a className="primary" target="_top" href={chatGPTSignOutPath('/login')}>Sign out and switch account</a></main>}
