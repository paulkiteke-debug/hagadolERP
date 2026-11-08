import type {RecordRow as R} from './erp-engine';
export const planningTypes=['budget','cash_plan'];
export const planFields={budget:['revenueTarget','costLimit'],cash_plan:['inflowTarget','outflowLimit','minimumCash']} as const;
export function validateFinancePlan(r:R,records:R[]){
 if(!planningTypes.includes(r.type))return r;
 const validDate=(v:any)=>{const s=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Choose valid plan dates.');return s;};
 r.periodStart=validDate(r.periodStart);r.periodEnd=validDate(r.periodEnd);
 const days=(Date.parse(r.periodEnd)-Date.parse(r.periodStart))/86400000+1;
 if(days<1||days>366)throw Error('Choose a plan period between 1 and 366 days.');
 r.owner=String(r.owner||'').trim().slice(0,500);if(!r.owner)throw Error('Give the plan an owner.');
 const keys=planFields[r.type as keyof typeof planFields];
 for(const key of keys){const value=r[key];const n=Number(value);if(value===undefined||value===null||value===''||!Number.isSafeInteger(n)||n<0||n>1e12)throw Error('Enter whole UGX targets between zero and 1 trillion.');r[key]=n;}
 if(!keys.some(key=>r[key]>0))throw Error('Set at least one target above zero.');
 if(records.some(p=>p.id!==r.id&&p.type===r.type&&p.company===r.company&&p.status!=='Archived'&&p.periodStart<=r.periodEnd&&p.periodEnd>=r.periodStart))throw Error('An active plan already covers these dates for '+r.company+'. Edit it or archive it first.');
 return r;
}
export function planPace(start:string,end:string,asAt:string){const duration=(Date.parse(end)-Date.parse(start))/86400000+1,elapsed=Math.max(0,Math.min(duration,(Date.parse(asAt)-Date.parse(start))/86400000+1));return {fraction:elapsed/duration,elapsed,duration,started:elapsed>0,ended:asAt>=end};}
