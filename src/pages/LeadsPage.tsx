import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  UserPlus, Phone, Mail, Calendar,
  Building2, Clock, CheckCircle, XCircle, X, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type Status = 'new' | 'contacted' | 'demo_scheduled' | 'converted' | 'not_interested';

const STATUSES: { key: Status; label: string; color: string; icon: React.ElementType }[] = [
  { key: 'new', label: 'New', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: UserPlus },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Phone },
  { key: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Calendar },
  { key: 'converted', label: 'Converted', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  { key: 'not_interested', label: 'Not Interested', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle },
];

const SOFTWARE_LABELS: Record<string, string> = {
  repeatmd: 'RepeatMD', mindbody: 'Mindbody', other: 'Other', nothing: 'Nothing currently',
};

const SIZE_LABELS: Record<string, string> = {
  under_500: 'Under 500', '500_to_2000': '500-2,000', over_2000: 'Over 2,000',
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter $149', growth: 'Growth $299', pro: 'Pro $499', not_sure: 'Not sure yet',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  async function updateStatus(lead: any, status: Status) {
    await supabase.from('leads').update({ status }).eq('id', lead.id);
    toast.success(`Moved to ${STATUSES.find(s => s.key === status)?.label}`);
    load();
    if (selected?.id === lead.id) setSelected({ ...lead, status });
  }

  function exportCSV() {
    const rows = leads.map(l => [
      l.clinic_name, l.owner_name, l.email, l.phone || '',
      SOFTWARE_LABELS[l.current_software] || l.current_software || '',
      SIZE_LABELS[l.clinic_size] || l.clinic_size || '',
      PLAN_LABELS[l.plan_interest] || l.plan_interest || '',
      l.status, l.utm_source || '', l.utm_medium || '', l.utm_campaign || '',
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
    ]);
    const header = 'Clinic,Owner,Email,Phone,Software,Size,Plan,Status,UTM Source,UTM Medium,UTM Campaign,Date\n';
    const csv = header + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = leads.filter(l => l.status === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} total leads from velareward.com</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('pipeline')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === 'pipeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              Pipeline
            </button>
            <button onClick={() => setView('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${view === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              Table
            </button>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Pipeline view */}
      {view === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map(status => {
            const statusLeads = leads.filter(l => l.status === status.key);
            return (
              <div key={status.key} className="flex-1 min-w-[260px]">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border ${status.color}`}>
                  <status.icon className="w-4 h-4" />
                  <span className="text-sm font-semibold">{status.label}</span>
                  <span className="ml-auto text-xs font-bold opacity-70">{counts[status.key]}</span>
                </div>

                {/* Cards */}
                <div className="bg-gray-50 rounded-b-xl border border-t-0 border-gray-200 p-2 space-y-2 min-h-[200px]">
                  {statusLeads.map(lead => (
                    <button key={lead.id} onClick={() => setSelected(lead)}
                      className={`w-full text-left bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow ${
                        selected?.id === lead.id ? 'border-gray-900 shadow-sm' : 'border-gray-200'
                      }`}>
                      <p className="text-sm font-semibold text-gray-900 truncate">{lead.clinic_name}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.owner_name}</p>
                      <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {lead.current_software && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {SOFTWARE_LABELS[lead.current_software] || lead.current_software}
                          </span>
                        )}
                        {lead.plan_interest && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                            {PLAN_LABELS[lead.plan_interest] || lead.plan_interest}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2">{format(new Date(lead.created_at), 'MMM d, h:mm a')}</p>
                    </button>
                  ))}
                  {statusLeads.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">No leads</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Clinic</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Software</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Size</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const st = STATUSES.find(s => s.key === lead.status) || STATUSES[0];
                return (
                  <tr key={lead.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelected(lead)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{lead.clinic_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{lead.owner_name}</p>
                      <p className="text-xs text-gray-400">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {SOFTWARE_LABELS[lead.current_software] || lead.current_software || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {SIZE_LABELS[lead.clinic_size] || lead.clinic_size || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {PLAN_LABELS[lead.plan_interest] || lead.plan_interest || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(lead.created_at), 'MMM d, yyyy')}</td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No leads yet — they will appear here when someone submits the form on velareward.com</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-[440px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{selected.clinic_name}</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Pipeline Stage</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map(s => (
                    <button key={s.key} onClick={() => updateStatus(selected, s.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selected.status === s.key ? s.color + ' ring-1 ring-current' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}>
                      <s.icon className="w-3 h-3" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">{selected.clinic_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{selected.owner_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${selected.email}`} className="text-blue-600 hover:underline">{selected.email}</a>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <a href={`tel:${selected.phone}`} className="text-blue-600 hover:underline">{selected.phone}</a>
                    </div>
                  )}
                </dl>
              </div>

              {/* Details */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Software</span>
                    <span className="text-gray-900 font-medium">{SOFTWARE_LABELS[selected.current_software] || selected.current_software || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clinic Size</span>
                    <span className="text-gray-900 font-medium">{SIZE_LABELS[selected.clinic_size] || selected.clinic_size || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan Interest</span>
                    <span className="text-gray-900 font-medium">{PLAN_LABELS[selected.plan_interest] || selected.plan_interest || '—'}</span>
                  </div>
                </dl>
              </div>

              {/* UTM */}
              {(selected.utm_source || selected.utm_medium || selected.utm_campaign) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Attribution</p>
                  <dl className="space-y-1.5 text-sm">
                    {selected.utm_source && <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="text-gray-900 font-mono text-xs">{selected.utm_source}</span></div>}
                    {selected.utm_medium && <div className="flex justify-between"><span className="text-gray-500">Medium</span><span className="text-gray-900 font-mono text-xs">{selected.utm_medium}</span></div>}
                    {selected.utm_campaign && <div className="flex justify-between"><span className="text-gray-500">Campaign</span><span className="text-gray-900 font-mono text-xs">{selected.utm_campaign}</span></div>}
                  </dl>
                </div>
              )}

              {/* Timestamp */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timeline</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Submitted {format(new Date(selected.created_at), 'MMMM d, yyyy · h:mm a')}</span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <a href={`mailto:${selected.email}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                  <Mail className="w-4 h-4" /> Send Email
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
