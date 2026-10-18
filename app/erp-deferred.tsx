'use client';
import React,{lazy,Suspense} from 'react';
function waiting(){return <div className="moduleloading" role="status">Opening workspace…</div>}
class ModuleBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="notice" role="alert"><p>This workspace could not open. Refresh the page to try again.</p><button className="secondary" onClick={()=>window.location.reload()}>Refresh page</button></div>:this.props.children;}
}
function deferred<P extends object>(load:()=>Promise<{default:React.ComponentType<P>}>) {
 const Component=lazy(load) as React.ComponentType<P>;
 return function Deferred(props:P){return <ModuleBoundary><Suspense fallback={waiting()}><Component {...props}/></Suspense></ModuleBoundary>};
}
export const Command=deferred(()=>import('./erp-command'));
export const ContentCalendar=deferred(()=>import('./erp-calendar'));
export const Governance=deferred(()=>import('./erp-governance'));
export const GovernanceFields=deferred<React.ComponentProps<typeof import('./erp-governance').GovernanceFields>>(()=>import('./erp-governance').then(m=>({default:m.GovernanceFields})));
export const EOS=deferred(()=>import('./erp-eos'));
export const CRM=deferred(()=>import('./erp-crm'));
export const Finance=deferred(()=>import('./erp-finance'));
export const ReleaseReadiness=deferred(()=>import('./erp-release'));
export const TechnicalProjects=deferred(()=>import('./erp-projects'));
export const UserAccess=deferred(()=>import('./erp-access'));
export const IndustryFields=deferred<React.ComponentProps<typeof import('./erp-industry').IndustryFields>>(()=>import('./erp-industry').then(m=>({default:m.IndustryFields})));
export const IndustryProfile=deferred<React.ComponentProps<typeof import('./erp-industry').IndustryProfile>>(()=>import('./erp-industry').then(m=>({default:m.IndustryProfile})));
export const IndustryAnalysis=deferred<React.ComponentProps<typeof import('./erp-industry').IndustryAnalysis>>(()=>import('./erp-industry').then(m=>({default:m.IndustryAnalysis})));
