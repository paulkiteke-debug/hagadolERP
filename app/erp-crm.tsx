'use client';

import React, {useState,useRef,useCallback} from 'react';
import {Search, Plus, SlidersHorizontal, ChevronDown, LayoutGrid, List, ArrowUpRight, Download, Upload, X} from 'lucide-react';
import type {RecordRow as R, State} from '@/lib/erp-primitives';
import {day} from '@/lib/erp-primitives';
import {dealStages} from '@/lib/company-profiles';
import {crmActivities, crmRecords, crmRelated, crmSources, crmStage, validateDealStageTransition} from '@/lib/crm';
import {toCSV} from '@/lib/erp-ui';
import {pipelineChoices, pipelineRows, type PipelineSort} from '@/lib/crm-pipeline';
import PipelineBoard from './crm-pipeline-board';
import CRMPriorities from './crm-priorities';
import CRMDrawer from './crm-drawer';
import {CRMForm} from './crm-record-form';
import CRMImportPreviewPanel from './crm-import-preview';
export {CRMForm} from './crm-record-form';

type Act = (input: Record<string, unknown>) => Promise<{id?: string} | false | undefined>;
type Props = {state: State; company: string; tab: string; busy: boolean; act: Act; onDirty: (v: boolean) => void; importContacts: () => void; initialDetail?: string; onTabChange?: (tab: string) => void};
type FormState = {type: string; record?: R; seed?: Partial<R>};
const money = (n: number) => new Intl.NumberFormat('en-UG', {maximumFractionDigits: 0}).format(n || 0);
const tabLabels = [['Pipeline', 'Pipeline'], ['Contacts', 'Contacts'], ['Companies', 'Companies'], ['Activities', 'Activities & Tasks']];
const typeLabel = (type: string) => type === 'deal' ? 'Deal' : type === 'crm_company' ? 'Company' : type === 'task' ? 'Activity' : 'Contact';
const sourceId = (r: R) => r.biginSaleId || r.biginCompanyId || r.biginContactId || r.biginTaskId || '';

export default function CRM({state, company, tab, busy, act, onDirty, importContacts, initialDetail = '', onTabChange}: Props) {
  const [selected, setSelected] = useState(initialDetail);
  const draftDirty=useRef(false);
  const updateDirty=useCallback((value:boolean)=>{draftDirty.current=value;onDirty(value);},[onDirty]);
  const [importReview,setImportReview]=useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [lossId, setLossId] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [lossError, setLossError] = useState('');
  const [blocked, setBlocked] = useState<{id: string; stage: string; errors: {field: string; message: string}[]} | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [owner, setOwner] = useState('All owners');
  const [source, setSource] = useState('All sources');
  const [relationship, setRelationship] = useState('All records');
  const [scope, setScope] = useState('Open');
  const [pipeline, setPipeline] = useState('');
  const [sort, setSort] = useState<PipelineSort>('Recent');
  const [layout, setLayout] = useState('Board');
  const [page, setPage] = useState(0);
  const rs = crmRecords(state.records, company);
  const record = rs.find(r => r.id === selected);
  const loss = rs.find(r => r.id === lossId);
  const account = (r: R) => r.crmCompanyId ? rs.find(x => x.id === r.crmCompanyId)?.name || '' : '';
  const contact = (r: R) => r.contactId ? rs.find(x => x.id === r.contactId)?.name || '' : '';
  const customer = (r: R) => account(r) || r.customer || contact(r) || r.biginCompanyName || '';
  const owners = [...new Set(rs.filter(r => ['deal', 'contact', 'crm_company', 'task'].includes(r.type) && r.owner).map(r => String(r.owner)))].sort();
  const activityRows = crmActivities(rs);
  const activityIds = new Set(activityRows.map(r => r.id));
  const actionType = tab === 'Contacts' ? 'contact' : tab === 'Companies' ? 'crm_company' : tab === 'Activities' ? 'task' : 'deal';
  const relevant = rs.filter(r => actionType === 'task' ? activityIds.has(r.id) : r.type === actionType);
  const choices = pipelineChoices(rs);
  const selectedPipeline = choices.find(choice => choice.id === pipeline);
  const matchesSearch = (r: R) => [r.name, sourceId(r), r.person, r.customer, r.email, r.phone, r.mobile, r.owner, r.nextAction, r.notes, account(r), contact(r)].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  const searchMatches = query.trim() ? rs.filter(r => ['deal', 'contact', 'crm_company'].includes(r.type) || activityIds.has(r.id)).filter(matchesSearch) : [];
  const visible = (tab === 'Pipeline' ? pipelineRows(relevant, selectedPipeline?.id || '', sort) : relevant).filter(r =>
    (owner === 'All owners' || r.owner === owner) && (source === 'All sources' || r.source === source) && matchesSearch(r) &&
    (relationship === 'All records' || r.role === 'Supplier')
  ).filter(r => tab === 'Pipeline' ? scope === 'All' || (scope === 'Closed' ? ['Won', 'Lost'].includes(crmStage(r)) : !['Won', 'Lost'].includes(crmStage(r))) : tab === 'Activities' ? scope === 'All' || (scope === 'Closed' ? r.status === 'Done' : scope === 'Due today' ? r.status !== 'Done' && r.due === day() : scope === 'Overdue' ? r.status !== 'Done' && !!r.due && r.due < day() : scope === 'Upcoming' ? r.status !== 'Done' && !!r.due && r.due > day() : r.status !== 'Done') : true);
  const filtersActive = owner !== 'All owners' || source !== 'All sources' || relationship !== 'All records' || (['Pipeline', 'Activities'].includes(tab) && scope !== 'Open');
  const openForm = (type: string, row?: R, seed: Partial<R> = {}) => setForm({type, record: row, seed});
  const openRecord = (id: string) => {setSelected(id); setSearchOpen(false);};
  const addActivity = (r: R) => openForm('task', undefined, {company: r.company, owner: r.owner || '', ...(r.type === 'deal' ? {dealId: r.id} : r.type === 'contact' ? {contactId: r.id, crmCompanyId: r.crmCompanyId || ''} : {crmCompanyId: r.id})});
  const clearFilters = () => {setOwner('All owners'); setSource('All sources'); setRelationship('All records'); setScope('Open'); setQuery(''); setPage(0);};
  const moveStage = async (r: R, stage: string) => {
    if (stage === 'Lost') {setLossId(r.id); setLossReason(r.lostReason || ''); setFollowUp(''); setLossError(''); return false;}
    const validation = validateDealStageTransition(r, stage, day(), rs);
    if (!validation.ok) {setBlocked({id: r.id, stage, errors: validation.errors}); return false;}
    return act({action: 'stage', id: r.id, expectedVersion: r.version, status: stage});
  };
  const complete = (r: R) => act({action: 'stage', id: r.id, expectedVersion: r.version, status: r.status === 'Done' ? 'Open' : 'Done'});
  const stageControl = (r: R) => <label className="crmstage">Stage<select disabled={busy} value={crmStage(r)} onChange={e => void moveStage(r, e.target.value)}>{dealStages(r.company).map(s => <option key={s}>{s}</option>)}</select></label>;
  const exportView = () => {
    const csv = toCSV(visible.map(r => ({recordId: r.id, version: r.version ?? '', ourBusiness: r.company, name: r.name, customer: customer(r), contact: contact(r), owner: r.owner || '', stage: r.type === 'deal' ? crmStage(r) : r.status, valueUGX: r.amount, email: r.email || '', phone: r.phone || '', mobile: r.mobile || '', source: r.source || '', due: r.due || '', nextAction: r.nextAction || '', notes: r.notes || '', activityType: r.activityKind || '', priority: r.priority || '', completedDate: r.completedDate || '', biginSaleId: r.biginSaleId || '', biginCompanyId: r.biginCompanyId || '', biginContactId: r.biginContactId || '', biginTaskId: r.biginTaskId || '', biginPipeline: r.biginPipeline || '', biginSubPipeline: r.biginSubPipeline || '', biginStage: r.biginStage || '', biginRelatedId: r.biginRelatedId || '', biginRelatedName: r.biginRelatedName || '', sourceCompany: r.biginCompanyName || '', createdTime: r.biginCreatedTime || r.date, storedStatus: r.status, quoteValue: r.quoteValue ?? '', officePhone: r.officePhone || '', emailOptOut: r.emailOptOut ?? '', doNotWhatsApp: r.doNotWhatsApp ?? '', importReview: r.importReviewFlags?.join(' ') || ''})));
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'CRM_' + tab + '.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const table = (rows: R[], kind: string) => <div className="crm-directory tablebox"><table className="technicaltable"><thead><tr>
    <th>{kind === 'deal' ? 'Deal' : kind === 'task' ? 'Activity' : 'Name'}</th><th>{kind === 'crm_company' ? 'Location' : 'Customer company'}</th><th>Owner</th><th>{kind === 'deal' ? 'Value · UGX' : kind === 'task' ? 'Due date' : 'Contact details'}</th><th>{kind === 'deal' ? 'Stage' : kind === 'task' ? 'Status' : 'Relationship'}</th>
  </tr></thead><tbody>{rows.map(r => <tr key={r.id}>
    <td><div className="crm-directory-name">{kind === 'task' ? <button className="crm-task-check" type="button" disabled={busy} aria-label={(r.status === 'Done' ? 'Reopen ' : 'Complete ') + r.name} aria-pressed={r.status === 'Done'} onClick={() => void complete(r)}>{r.status === 'Done' ? '✓' : ''}</button> : <span className="crm-avatar" aria-hidden="true">{r.name.slice(0, 1).toUpperCase()}</span>}<div><button type="button" className="rowlink" onClick={() => openRecord(r.id)}>{r.name}</button><small>{kind === 'task' ? r.activityKind || 'Task' : sourceId(r) || r.person || r.nextAction || 'No source ID'}{r.importReviewFlags?.length ? ' · Needs review' : ''}</small></div></div></td>
    <td>{kind === 'crm_company' ? r.location || r.billingAddress || '—' : customer(r) || 'Not linked'}<small>{r.company}</small></td><td>{r.owner || 'Unassigned'}</td>
    <td>{kind === 'deal' ? <strong className="crm-money">{money(r.amount)}</strong> : kind === 'task' ? <><time dateTime={r.due || undefined}>{r.due || 'Not set'}</time><small>{r.activityTime || ''}{r.status !== 'Done' && r.due && r.due < day() ? ' · Overdue' : ''}</small></> : <>{r.email || 'No email'}<small>{r.phone || r.mobile || 'No phone'}</small></>}</td>
    <td>{kind === 'deal' ? stageControl(r) : <span className="crm-tag">{kind === 'task' ? r.status : r.role || 'Prospect'}</span>}</td>
  </tr>)}</tbody></table>{!rows.length && <div className="crm-empty"><h3>{query || filtersActive ? 'No matches found' : 'Nothing here yet'}</h3><p>{query || filtersActive ? 'Try another search or clear your filters.' : 'Add your first ' + typeLabel(kind).toLowerCase() + ' to get started.'}</p>{query || filtersActive ? <button className="secondary" onClick={clearFilters}>Clear search and filters</button> : <button className="primary" disabled={busy} onClick={() => openForm(kind)}>New {typeLabel(kind).toLowerCase()}</button>}</div>}</div>;
  const related = record ? crmRelated(rs, record) : [];
  const activities = crmActivities(related);
  const timeline = record ? [
    ...(record.biginStageHistory || []).map((h: R) => ({id: 'bigin-history-' + h.id, date: h.modifiedTime || '', title: 'Bigin stage · ' + h.stage + (h.movedTo ? ' → ' + h.movedTo : ''), text: (h.amount === undefined ? '' : 'Historical value UGX ' + money(h.amount)) + (h.durationDays === undefined ? '' : ' · ' + h.durationDays + ' days'), owner: h.modifiedBy})),
    ...activities.map(r => ({id: r.id, date: r.completedDate || r.due || r.date || '', title: (r.activityKind || 'Task') + ' · ' + r.name, text: r.notes || r.status, owner: r.owner})),
    ...state.audit.filter(a => a.record === record.id && a.company === record.company).map(a => ({id: a.id, date: a.date || '', title: a.action, text: 'Saved change', owner: a.actor}))
  ].sort((a, b) => b.date.localeCompare(a.date)) : [];
  const metadata = record ? [
    ['Owner', record.owner], ['Status', record.type === 'deal' ? crmStage(record) : record.status], ['Company', account(record)], ['Contact', contact(record)], ['Customer', record.customer], ['Email', record.email], ['Phone', record.phone], ['Mobile', record.mobile], ['Office phone', record.officePhone], ['Home phone', record.homePhone], ['Job title', record.jobTitle], ['Source company', record.biginCompanyName], ['Preferred channel', record.preferredChannel], ['Email opt out', record.emailOptOut === undefined ? '' : record.emailOptOut ? 'Yes' : 'No'], ['Do not WhatsApp', record.doNotWhatsApp === undefined ? '' : record.doNotWhatsApp ? 'Yes' : 'No'], ['Activity type', record.type === 'task' ? record.activityKind || 'Task' : ''], ['Time, Kampala', record.activityTime], ['Bigin task ID', record.biginTaskId], ['Original task status', record.type === 'task' ? record.biginStatus : ''], ['Original related record', record.biginRelatedName], ['Original related ID', record.biginRelatedId], ['Priority', record.priority], ['Original reminder', record.biginReminder], ['Original completion time', record.biginClosedTime], ['Bigin sale ID', record.biginSaleId], ['Bigin pipeline', record.biginPipeline], ['Bigin sub pipeline', record.biginSubPipeline], ['Original Bigin stage', record.biginStage], ['Services needed', record.servicesNeeded], ['Quote value UGX', record.quoteValue === undefined ? '' : money(record.quoteValue)], ['Site visit required', record.type === 'deal' && record.siteVisitRequired !== undefined ? record.siteVisitRequired ? 'Yes' : 'No' : ''], ['Site visit date', record.siteVisitDate], ['Contact outcome', record.contactOutcome], ['Recommended solution', record.recommendedSolution], ['Bigin company ID', record.biginCompanyId], ['Company type', record.customerType], ['Billing address', record.billingAddress], ['Tax PIN or TIN', record.taxReference], ['Location', record.location], ['Bigin contact ID', record.biginContactId], ['Import review', record.importReviewFlags?.join(' ')], ['Possible duplicate Bigin IDs', record.biginDuplicateSourceIds?.join(', ')], ['Possible existing duplicate contacts', record.existingDuplicateContactIds?.join(', ')], ['Website', record.website], ['Source', record.source], ['Next action', record.nextAction], ['Next follow up', record.due], ['Expected close', record.closingDate], ['Reason lost', record.lostReason]
  ].filter(([, v]) => v) : [];
  const pageIndex = Math.min(page, Math.max(0, Math.ceil(visible.length / 100) - 1));
  return <section className="crmworkspace crm-v2">
    <div className="crm-navigation-bar"><nav aria-label="CRM navigation">{tabLabels.map(([key, label]) => <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} onClick={() => onTabChange?.(key)}>{label}</button>)}</nav>
      <div className="crm-navigation-tools"><div className="crm-global-search" onBlur={e => {if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSearchOpen(false);}}><label><Search size={17} aria-hidden="true"/><span className="sr-only">Search CRM</span><input type="search" value={query} placeholder="Search CRM or Bigin ID" onChange={e => {setQuery(e.target.value); setSearchOpen(true); setPage(0);}} onFocus={() => setSearchOpen(true)} onKeyDown={e => {if (e.key === 'Escape') setSearchOpen(false);}}/></label>{searchOpen && query.trim() && <section className="crm-search-results" aria-label="CRM search results"><p>{searchMatches.length} matching records</p>{searchMatches.slice(0, 8).map(r => <button key={r.id} type="button" onClick={() => openRecord(r.id)}><span>{r.name}<small>{typeLabel(r.type)} · {r.company}{sourceId(r) ? ' · ' + sourceId(r) : ''}</small></span><ArrowUpRight size={15} aria-hidden="true"/></button>)}{searchMatches.length > 8 && <small>Showing the first 8 matches. Refine your search for more.</small>}</section>}</div>
        <details className="moremenu crm-actions-menu"><summary>Actions <ChevronDown size={14} aria-hidden="true"/></summary><div><button type="button" disabled={busy || company==='Group'} onClick={e=>{setImportReview(true);e.currentTarget.closest('details')?.removeAttribute('open');}}><Upload size={16} aria-hidden="true"/>Bigin import review</button><button type="button" disabled={busy} onClick={e => {importContacts(); e.currentTarget.closest('details')?.removeAttribute('open');}}><Upload size={16} aria-hidden="true"/>Import contacts</button><button type="button" disabled={!visible.length} onClick={exportView}><Download size={16} aria-hidden="true"/>Export current view</button></div></details>
      </div>
    </div>
    <div className="crm-content">
      {tab === 'Pipeline' && <CRMPriorities records={rs} busy={busy} onOpen={openRecord} onComplete={row => act({action: 'stage', id: row.id, expectedVersion: row.version, status: 'Done'})}/>}
      <header className="crm-view-heading"><div><p className="crm-eyebrow">{company === 'Group' ? 'Authorised group view' : company === 'WMK' ? 'WMK Architects' : 'Hagadol Limited'} · CRM</p><h1>{tab === 'Pipeline' ? company === 'WMK' ? 'Design & project pipeline' : company === 'Group' ? 'Group sales pipeline' : 'Sales pipeline' : tab === 'Activities' ? 'Activities & tasks' : tab}</h1><p>{tab === 'Pipeline' ? 'Keep every opportunity moving, one clear next step at a time.' : tab === 'Contacts' ? 'Your customer contacts and their shared history.' : tab === 'Companies' ? 'Customer organisations, partners and suppliers.' : 'Calls, meetings and follow ups in one place.'}</p></div><button className="primary crm-create-button" type="button" disabled={busy} onClick={() => openForm(actionType)}><Plus size={17} aria-hidden="true"/>{tab === 'Pipeline' ? 'New deal' : 'New ' + typeLabel(actionType).toLowerCase()}</button></header>
      <div className="crm-workspace-surface"><div className="crm-view-controls">
        <div className="crm-view-filters">{tab === 'Pipeline' ? <label className="crm-pipeline-picker"><span className="sr-only">Team pipeline</span><select aria-label="Team pipeline" value={selectedPipeline?.id || ''} onChange={e => {setPipeline(e.target.value); setPage(0);}}><option value="">All pipelines</option>{choices.map(c => <option key={c.id} value={c.id}>{company === 'Group' ? c.company + ' · ' : ''}{c.name} ({c.count})</option>)}</select></label> : ['Contacts', 'Companies'].includes(tab) ? <label><span className="sr-only">Relationship view</span><select aria-label="Relationship view" value={relationship} onChange={e => {setRelationship(e.target.value); setPage(0);}}><option>All records</option><option>Suppliers</option></select></label> : null}
          {['Pipeline', 'Activities'].includes(tab) && <label><span className="sr-only">Record status</span><select aria-label="Record status" value={scope} onChange={e => {setScope(e.target.value); setPage(0);}}>{(tab === 'Activities' ? ['Open', 'Due today', 'Overdue', 'Upcoming', 'Closed', 'All'] : ['Open', 'Closed', 'All']).map(v => <option key={v}>{v}</option>)}</select></label>}
          <details className="moremenu crmfilters"><summary><SlidersHorizontal size={15} aria-hidden="true"/>Filters{filtersActive && <span className="crm-filter-dot" aria-label="Active filters"/>}</summary><div><label>Owner<select value={owner} onChange={e => {setOwner(e.target.value); setPage(0);}}><option>All owners</option>{owners.map(v => <option key={v}>{v}</option>)}</select></label>{tab !== 'Companies' && tab !== 'Activities' && <label>Source<select value={source} onChange={e => {setSource(e.target.value); setPage(0);}}><option>All sources</option>{[...new Set([...crmSources, ...rs.map(r => r.source).filter(Boolean)])].sort().map(v => <option key={v}>{v}</option>)}</select></label>}<button className="secondary" type="button" onClick={clearFilters}>Clear filters</button></div></details>
          <span className="crm-record-count" role="status">{visible.length} {visible.length === 1 ? typeLabel(actionType).toLowerCase() : actionType === 'crm_company' ? 'companies' : typeLabel(actionType).toLowerCase() + 's'}</span>
        </div>
        <div className="crm-view-options">{tab === 'Pipeline' && <><label><span className="sr-only">Sort by</span><select aria-label="Sort by" value={sort} onChange={e => setSort(e.target.value as PipelineSort)}><option value="Recent">Newest first</option><option value="Value">Highest value</option><option value="Follow up">Follow up date</option></select></label><div className="crm-view-toggle" aria-label="Pipeline view"><button type="button" aria-label="Board view" aria-pressed={layout === 'Board'} onClick={() => setLayout('Board')}><LayoutGrid size={17}/></button><button type="button" aria-label="List view" aria-pressed={layout === 'List'} onClick={() => setLayout('List')}><List size={18}/></button></div></>}</div>
      </div>
      {(query || filtersActive) && <div className="crm-active-filters"><span>{query ? 'Search: ' + query : 'Filtered view'}</span><button type="button" onClick={clearFilters}>Clear filters <X size={13} aria-hidden="true"/></button></div>}
      {tab === 'Pipeline' && layout === 'Board' ? <PipelineBoard records={visible} stages={dealStages(selectedPipeline?.company || company).filter(s => scope === 'All' || (scope === 'Closed' ? ['Won', 'Lost'].includes(s) : !['Won', 'Lost'].includes(s)))} busy={busy} customer={customer} onOpen={openRecord} onCreate={() => openForm('deal')} onActivity={addActivity} onMove={moveStage}/> : table(visible.slice(pageIndex * 100, pageIndex * 100 + 100), actionType)}
      <footer className="crm-view-footer"><span>{tab === 'Pipeline' && layout === 'Board' ? 'Drag a deal to move it, or use its stage menu.' : 'Select a record to view its details and customer history.'}</span>{visible.length > 100 && (tab !== 'Pipeline' || layout === 'List') && <nav aria-label="CRM pages"><button className="secondary" disabled={pageIndex === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</button><span>{pageIndex + 1} of {Math.ceil(visible.length / 100)}</span><button className="secondary" disabled={pageIndex >= Math.ceil(visible.length / 100) - 1} onClick={() => setPage(p => p + 1)}>Next</button></nav>}{tab === 'Pipeline' && <span className="crm-view-total">Visible pipeline · <strong>UGX {money(visible.reduce((sum, r) => sum + r.amount, 0))}</strong></span>}</footer>
      </div>
    </div>
    {record && !form && !loss && !blocked && !importReview && <CRMDrawer label={typeLabel(record.type) + ' details'} busy={busy} onClose={() => setSelected('')}><section className="crmdetail crm-v2-detail">
      <header className="crm-detail-heading"><p className="crm-eyebrow">{record.company} · {sourceId(record) || typeLabel(record.type)}</p><h2>{record.name}</h2><p>{customer(record) || record.email || record.role || ''}</p><div className="sectiontoolbar"><button className="primary" disabled={busy} onClick={() => openForm(record.type, record)}>Edit {typeLabel(record.type).toLowerCase()}</button>{record.type !== 'task' && <button className="secondary" disabled={busy} onClick={() => addActivity(record)}>Add activity</button>}{record.type === 'task' && <button className="secondary" disabled={busy} onClick={() => void complete(record)}>{record.status === 'Done' ? 'Reopen activity' : 'Mark activity done'}</button>}</div></header>
      {record.type === 'deal' && <section className="crm-deal-summary"><div><small>Deal value</small><strong>UGX {money(record.amount)}</strong></div><div><small>Owner</small><span>{record.owner || 'Unassigned'}</span></div>{stageControl(record)}<div><small>Next action</small><span>{record.nextAction || 'Not set'}</span><small>Follow up · {record.due || 'Not set'}</small></div></section>}
      {record.notes && <section className="crm-detail-section"><h3>Notes</h3><p className="crmnotes">{record.notes}</p></section>}
      <details className="crmdetailmetadata crm-detail-section"><summary>Customer and source details</summary><dl>{metadata.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl></details>
      {['contact', 'crm_company'].includes(record.type) && <div className="sectiontoolbar"><button className="secondary" disabled={busy} onClick={() => openForm('deal', undefined, {company: record.company, ...(record.type === 'contact' ? {contactId: record.id, crmCompanyId: record.crmCompanyId || ''} : {crmCompanyId: record.id}), customer: customer(record) || record.name, owner: record.owner || ''})}>New linked deal</button>{record.type === 'crm_company' && <button className="secondary" disabled={busy} onClick={() => openForm('contact', undefined, {company: record.company, crmCompanyId: record.id})}>New linked contact</button>}</div>}
      <section className="crm-detail-section"><h3>Activities and history <span>{timeline.length}</span></h3>{timeline.map(t => <article className="crmtimeline" key={t.id}><small>{t.date.slice(0, 10)} · {t.owner || 'Unassigned'}</small><strong>{t.title}</strong><p>{t.text}</p></article>)}{!timeline.length && <p>No activity recorded yet. Add a call, meeting or task to start the history.</p>}</section>
      {(['contact', 'deal', 'task'] as const).map(kind => {const rows = kind === 'task' ? activities : related.filter(r => r.type === kind); return rows.length ? <details className="crm-detail-section" key={kind}><summary>{kind === 'contact' ? 'Linked contacts' : kind === 'deal' ? 'Linked deals' : 'Linked activities'} ({rows.length})</summary><ul className="crm-linked-records">{rows.map(r => <li key={r.id}><button type="button" className="rowlink" onClick={() => setSelected(r.id)}>{r.name}</button><small>{kind === 'deal' ? 'UGX ' + money(r.amount) : r.due || r.email || r.owner} · {r.status}</small></li>)}</ul></details> : null;})}
    </section></CRMDrawer>}
    {importReview&&<CRMDrawer label="Bigin import review" onClose={()=>setImportReview(false)}><CRMImportPreviewPanel company={company} records={rs}/></CRMDrawer>}
    {form && <CRMDrawer label={(form.record ? 'Edit ' : 'New ') + typeLabel(form.type).toLowerCase()} busy={busy} onClose={() => {if (draftDirty.current&&!window.confirm('Discard unsaved changes?')) return; updateDirty(false); setForm(null);}}><CRMForm embedded key={form.type + (form.record?.id || 'new')} {...form} company={company} records={state.records} act={act} busy={busy} onDirty={updateDirty} onClose={() => setForm(null)} onSaved={id => {setForm(null); setSelected(id);}}/></CRMDrawer>}
    {loss && !form && <CRMDrawer mode="modal" label="Record deal loss" busy={busy} onClose={() => {if ((lossReason || followUp) && !window.confirm('Discard these loss details?')) return; setLossId('');}}><form className="crmlossform" onSubmit={async e => {e.preventDefault(); setLossError(''); const saved = await act({action: 'stage', id: loss.id, expectedVersion: loss.version, status: 'Lost', lostReason: lossReason, followUpDate: followUp}); if (saved && saved.id) {setLossId('');} else setLossError('Not saved. Review the workspace error and try again.');}}><div><h2>Mark deal as lost</h2><p>{loss.name}</p></div><label>Reason lost<textarea required maxLength={2000} value={lossReason} onChange={e => setLossReason(e.target.value)}/></label><label>Follow up date, optional<input type="date" min={day()} value={followUp} onChange={e => setFollowUp(e.target.value)}/></label><p>{followUp ? 'A follow up task will be added for ' + (loss.owner || 'the deal owner') + '.' : 'Add a date if you would like to revisit this opportunity.'}</p>{lossError && <p role="alert">{lossError}</p>}<button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save loss' + (followUp ? ' and follow up' : '')}</button></form></CRMDrawer>}
    {blocked && !form && <CRMDrawer mode="modal" label="Stage change needs information" busy={busy} onClose={() => setBlocked(null)}><section className="crm-stage-restriction"><h2>Before moving to {blocked.stage}</h2><p>Complete these details, then try the stage change again.</p><ul>{blocked.errors.map((issue, i) => <li key={issue.field + i}>{issue.message}</li>)}</ul><button className="primary" disabled={busy} onClick={() => {const row = rs.find(r => r.id === blocked.id); setBlocked(null); if (row) openForm('deal', row);}}>Edit deal details</button></section></CRMDrawer>}
  </section>;
}
