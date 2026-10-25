'use client';
import {useEffect,useRef,type ReactNode} from 'react';

export default function CRMDrawer({label,onClose,busy=false,children,mode='drawer'}:{label:string;onClose:()=>void;busy?:boolean;children:ReactNode;mode?:'drawer'|'modal'}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current,previous=document.activeElement as HTMLElement|null;
    if(dialog&&!dialog.open)dialog.showModal();
    return ()=>{dialog?.close();if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={ref} className={'crmdrawer crm-dialog '+(mode==='modal'?'crm-dialog-modal':'crm-dialog-side')} aria-label={label} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="crmdrawerbar"><span>{label}</span><button type="button" className="secondary" disabled={busy} onClick={onClose}>Close</button></div>
    {children}
  </dialog>;
}
