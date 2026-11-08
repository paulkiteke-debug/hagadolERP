'use client';
import React,{useEffect,useRef,useState} from 'react';
import Command from './erp-command';
import {State,day} from '@/lib/erp-primitives';
import {resolveLinkedState} from '@/lib/metric-links';
import {validLiveState} from '@/lib/erp-ui';
import {officeDisplayPath} from '@/lib/erp-navigation';
const empty:State={records:[],journal:[],audit:[]};
export default function OfficeScreen({initial}:{initial?:{company?:string;layout?:string;state?:State}}){
 const [company,setCompany]=useState(initial?.company||'Group'),[layout,setLayout]=useState(initial?.layout||'Combined'),[state,setState]=useState(initial?.state||empty),[loaded,setLoaded]=useState(!!initial?.state),[error,setError]=useState(''),[unauthorised,setUnauthorised]=useState(false),[companies,setCompanies]=useState(['WMK','Hagadol']);
 const inflight=useRef(false),mounted=useRef(true);
 async function refresh(){if(inflight.current)return;inflight.current=true;try{const res=await fetch('/api/office',{cache:'no-store'});const data:any=await res.json();if(!res.ok){if(mounted.current){setUnauthorised(res.status===401);if(res.status===401||res.status===403){setState(empty);setLoaded(false);}}throw Error(data.error||'Records could not be loaded');}if(!validLiveState(data))throw Error('Records could not be read');if(mounted.current){setState({records:data.records,journal:data.journal,audit:data.audit});setLoaded(true);setCompanies(data.companies);setCompany(current=>data.companies.length===2?current:data.companies[0]);setError('');setUnauthorised(false);}}catch(e){if(mounted.current)setError((e as Error).message);}finally{inflight.current=false;}}
 useEffect(()=>{mounted.current=true;const q=new URLSearchParams(location.search);setCompany(['Group','Hagadol','WMK'].includes(q.get('company')||'')?q.get('company')!:'Group');setLayout(q.get('layout')==='Rotating'?'Rotating':'Combined');void refresh();return()=>{mounted.current=false;};},[]);
 // Keep retrying even when the initial request fails before the board is mounted.
 useEffect(()=>{if(loaded)return;const timer=setInterval(()=>void refresh(),60000);return()=>clearInterval(timer)},[loaded]);
 return <main className="standalonescreen"><details className="screenmenu"><summary>Screen options</summary><a href="/">Return to ERP</a><label>Company<select value={company} onChange={e=>{setCompany(e.target.value);history.replaceState(null,'',officeDisplayPath(e.target.value,layout));}}>{(companies.length===2?['Group',...companies]:companies).map(c=><option key={c}>{c}</option>)}</select></label></details>{unauthorised&&<a className="secondary" target="_top" href={'/login?returnTo='+encodeURIComponent(officeDisplayPath(company,layout))}>Sign in to display records</a>}{!loaded?<div className="recordloading" role={error?'alert':'status'}>{error||'Loading office display…'}{error&&<button className="secondary" onClick={refresh}>Try again</button>}</div>:<Command view="Office display" state={state} company={company} sample={false} activeLayout={layout} onLayoutChange={v=>{setLayout(v);history.replaceState(null,'',officeDisplayPath(company,v));}} open={()=>{}} act={async()=>{}} go={()=>{}} refresh={refresh} busy={false} error={error}/> }</main>;
}
