'use client';
import {useEffect,useRef,type ReactNode} from 'react';

export default function CRMDrawer({label,onClose,busy=false,children}:{label:string;onClose:()=>void;busy?:boolean;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current,previous=document.activeElement as HTMLElement|null;
    if(dialog&&!dialog.open)dialog.showModal();
    return ()=>{dialog?.close();if(previous?.isConnected)previous.focus();};
  },[]);
  return <dialog ref={ref} className="crmdrawer" aria-label={label} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="crmdrawerbar"><span>{label}</span><button type="button" className="secondary" disabled={busy} onClick={onClose}>Close</button></div>
    {children}
  </dialog>;
}
