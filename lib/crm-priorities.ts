import type {RecordRow} from './erp-primitives';
import {crmActivities} from './crm';

// Input is already permission scoped by the ERP server. Never load a wider dataset.
export function crmPriorities(records:RecordRow[],today:string){
  const pending=crmActivities(records).filter(row=>row.status!=='Done');
  const sorted=pending.slice().sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999'))||a.id.localeCompare(b.id));
  return {
    overdue:sorted.filter(row=>row.due&&row.due<today),
    today:sorted.filter(row=>row.due===today),
    upcoming:sorted.filter(row=>row.due&&row.due>today),
    undated:sorted.filter(row=>!row.due),
  };
}
