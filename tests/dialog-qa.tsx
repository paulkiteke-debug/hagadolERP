import React from 'react';
// Presentation wrapper makes portal content inspectable in server rendering.
// This does not test the real dialog's focus, Escape or pointer behaviour.
export function Dialog({open,children}:any){return open?<section data-qa-dialog>{children}</section>:null}
export function DialogContent({children,className}:any){return <section className={className}>{children}</section>}
export function DialogTitle({children}:any){return <h2>{children}</h2>}
export function DialogDescription({children}:any){return <p>{children}</p>}
