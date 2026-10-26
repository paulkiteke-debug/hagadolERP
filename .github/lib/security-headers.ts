/** Shared browser policy used by Next.js and response unit checks. */
export function securityHeaders(development=false){return [
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'Referrer-Policy',value:'same-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
 {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline'"+(development?" 'unsafe-eval'":'')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'self'"},
];}
export function secureResponse(request:Request,original:Response){
 const response=new Response(original.body,original),url=new URL(request.url);
 for(const header of securityHeaders())response.headers.set(header.key,header.value);
 if(url.protocol==='https:')response.headers.set('Strict-Transport-Security','max-age=31536000');
 const asset=/^\/(?:assets\/|_next\/|brand\/|favicon\.svg$)/.test(url.pathname);
 if(!asset||url.pathname.startsWith('/api/')||response.headers.get('content-type')?.includes('text/html')||response.headers.get('content-type')?.includes('text/x-component'))response.headers.set('Cache-Control','no-store');
 return response;
}
