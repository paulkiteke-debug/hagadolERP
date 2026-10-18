import type {NextConfig} from 'next';
import {securityHeaders} from './lib/security-headers';
const nextConfig:NextConfig={
 poweredByHeader:false,
 serverExternalPackages:['@libsql/client','libsql'],
 async headers(){return [{source:'/:path*',headers:securityHeaders(process.env.NODE_ENV==='development')}]},
};
export default nextConfig;
