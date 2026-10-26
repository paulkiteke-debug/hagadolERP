import {navigationGroups} from './erp-ui';
export function officeDisplayPath(company='Group',layout='Combined'){
 const entity=['Group','Hagadol','WMK'].includes(company)?company:'Group';
 return '/office-display?'+new URLSearchParams({company:entity,layout:layout==='Rotating'?'Rotating':'Combined'}).toString();
}
export function moduleSections(view:string):string[][]{
 const group=navigationGroups.find(g=>g.views.includes(view));
 if(!group||['Executive','EOS','Email','Marketing','Media','Administration','Office display','Bids and proposals'].includes(group.name))return [];
 if(group.name==='CRM')return [['Pipeline','CRM','Pipeline'],['Contacts','CRM','Contacts'],['Companies','CRM','Companies'],['Activities','CRM','Activities']];
 return group.views.map(v=>[v==='Finance'?'Overview':v==='Executive'?'Dashboard':v==='Overview'?'Financial overview':v==='Accounting'?'Accountant':v,v,'']);
}
