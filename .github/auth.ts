import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
export const {auth,handlers,signIn,signOut}=NextAuth({
 providers:[Google],
 session:{strategy:'jwt',maxAge:8*60*60},
 pages:{signIn:'/login'},
 callbacks:{
  async signIn({account,profile}){return account?.provider==='google'&&profile?.email_verified===true&&typeof profile.email==='string'},
  async jwt({token,account}){if(account)token.sub='google:'+account.providerAccountId;return token},
  async session({session,token}){if(session.user&&token.sub)session.user.id=token.sub;return session},
 },
});
