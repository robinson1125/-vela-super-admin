import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Plus, DollarSign, TrendingUp, CheckCircle, Pause,
  XCircle, X, Copy, Download, Building2, Mail, Phone, Hash,
  ArrowUpRight, Clock, CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Affiliate {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  referral_code: string;
  commission_rate_pct: number;
  commission_type: 'one_time' | 'recurring';
  recurring_months: number | null;
  status: 'active' | 'paused' | 'terminated';
  payout_method: string;
  notes: string | null;
  total_earned: number;
  total_paid: number;
  total_referrals: number;
  total_converted: number;
  created_at: string;
}

interface Referral {
  id: string;
  affiliate_id: string;
  clinic_id: string | null;
  clinic_name: string;
  status: string;
  converted_at: string | null;
  plan: string | null;
  monthly_value: number | null;
  created_at: string;
}

interface Commission {
  id: string;
  referral_id: string;
  clinic_id: string | null;
  period_start: string;
  period_end: string;
  gross_revenue: number;
  commission_rate_pct: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  terminated: 'bg-red-100 text-red-700',
};

const PLAN_PRICES: Record<string, number> = { starter: 149, growth: 299, pro: 499 };

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'referrals' | 'commissions' | 'payouts'>('referrals');

  // Create form state
  const [form, setForm] = useState({
    full_name: '',
    company_name: '',
    email: '',
    phone: '',
    commission_rate_pct: '10',
    commission_type: 'recurring' as 'one_time' | 'recurring',
    recurring_months: '12',
    notes: '',
  });

  useEffect(() => { loadAffiliates(); }, []);

  async function loadAffiliates() {
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });
    setAffiliates(data || []);
    setLoading(false);
  }

  async function selectAffiliate(aff: Affiliate) {
    setSelected(aff);
    setTab('referrals');
    setDetailLoading(true);

    const [refRes, commRes] = await Promise.all([
      supabase.from('affiliate_referrals')
        .select('*')
        .eq('affiliate_id', aff.id)
        .order('created_at', { ascending: false }),
      supabase.from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', aff.id)
        .order('period_start', { ascending: false })
        .limit(50),
    ]);

    setReferrals(refRes.data || []);
    setCommissions(commRes.data || []);
    setDetailLoading(false);
  }

  function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  async function createAffiliate(e: React.FormEvent) {
    e.preventDefault();
    const referral_code = generateCode();

    const { error } = await supabase.from('affiliates').insert({
      full_name: form.full_name.trim(),
      company_name: form.company_name.trim() || null,
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      referral_code,
      commission_rate_pct: parseFloat(form.commission_rate_pct) || 10,
      commission_type: form.commission_type,
      recurring_months: form.commission_type === 'recurring' ? parseInt(form.recurring_months) || 12 : null,
      notes: form.notes.trim() || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Affiliate created with code ${referral_code}`);
    setShowCreate(false);
    setForm({ full_name: '', company_name: '', email: '', phone: '', commission_rate_pct: '10', commission_type: 'recurring', recurring_months: '12', notes: '' });
    loadAffiliates();
  }

  async function updateStatus(aff: Affiliate, status: 'active' | 'paused' | 'terminated') {
    await supabase.from('affiliates').update({ status }).eq('id', aff.id);
    toast.success(`Status updated to ${status}`);
    loadAffiliates();
    if (selected?.id === aff.id) setSelected({ ...aff, status });
  }

  async function addReferral() {
    if (!selected) return;
    const name = prompt('Clinic name for this referral:');
    if (!name?.trim()) return;

    const { error } = await supabase.from('affiliate_referrals').insert({
      affiliate_id: selected.id,
      clinic_name: name.trim(),
      status: 'pending',
    });

    if (error) { toast.error(error.message); return; }

    await supabase.from('affiliates').update({
      total_referrals: selected.total_referrals + 1,
    }).eq('id', selected.id);

    toast.success('Referral added');
    selectAffiliate({ ...selected, total_referrals: selected.total_referrals + 1 });
    loadAffiliates();
  }

  async function convertReferral(ref: Referral) {
    const plan = prompt('Which plan? (starter / growth / pro):')?.trim().toLowerCase();
    if (!plan || !PLAN_PRICES[plan]) { toast.error('Invalid plan'); return; }

    await supabase.from('affiliate_referrals').update({
      status: 'converted',
      converted_at: new Date().toISOString(),
      plan,
      monthly_value: PLAN_PRICES[plan],
    }).eq('id', ref.id);

    if (selected) {
      await supabase.from('affiliates').update({
        total_converted: selected.total_converted + 1,
      }).eq('id', selected.id);
      selectAffiliate({ ...selected, total_converted: selected.total_converted + 1 });
    }
    toast.success('Referral marked as converted');
    loadAffiliates();
  }

  async function generateMonthlyCommissions() {
    if (!selected) return;
    const converted = referrals.filter(r => r.status === 'converted' && r.monthly_value);
    if (converted.length === 0) { toast('No converted referrals to commission'); return; }

    const now = new Date();
    const periodStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
    const periodEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

    let totalNew = 0;
    for (const ref of converted) {
      // Check if commission already exists for this period
      const existing = commissions.find(c =>
        c.referral_id === ref.id && c.period_start === periodStart
      );
      if (existing) continue;

      const amount = (ref.monthly_value! * selected.commission_rate_pct) / 100;
      await supabase.from('affiliate_commissions').insert({
        affiliate_id: selected.id,
        referral_id: ref.id,
        clinic_id: ref.clinic_id,
        period_start: periodStart,
        period_end: periodEnd,
        gross_revenue: ref.monthly_value!,
        commission_rate_pct: selected.commission_rate_pct,
        commission_amount: amount,
        status: 'pending',
      });
      totalNew++;
    }

    if (totalNew > 0) {
      // Update totals
      const newEarned = converted.reduce((sum, r) => {
        const existing = commissions.find(c => c.referral_id === r.id && c.period_start === periodStart);
        if (existing) return sum;
        return sum + (r.monthly_value! * selected.commission_rate_pct) / 100;
      }, 0);

      await supabase.from('affiliates').update({
        total_earned: selected.total_earned + newEarned,
      }).eq('id', selected.id);

      toast.success(`Generated ${totalNew} commission(s) for ${format(now, 'MMMM yyyy')}`);
      selectAffiliate({ ...selected, total_earned: selected.total_earned + newEarned });
    } else {
      toast('Commissions already generated for this period');
    }
    loadAffiliates();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success('Referral code copied');
  }

  function exportCSV() {
    const rows = affiliates.map(a => [
      a.full_name, a.company_name || '', a.email, a.phone || '',
      a.referral_code, `${a.commission_rate_pct}%`, a.commission_type,
      a.status, a.total_referrals, a.total_converted,
      `$${a.total_earned.toFixed(2)}`, `$${a.total_paid.toFixed(2)}`,
      format(new Date(a.created_at), 'yyyy-MM-dd'),
    ]);
    const header = 'Name,Company,Email,Phone,Code,Rate,Type,Status,Referrals,Converted,Earned,Paid,Joined\n';
    const csv = header + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliates-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Aggregate stats
  const totalActive = affiliates.filter(a => a.status === 'active').length;
  const totalEarned = affiliates.reduce((s, a) => s + a.total_earned, 0);
  const totalPaid = affiliates.reduce((s, a) => s + a.total_paid, 0);
  const totalConverted = affiliates.reduce((s, a) => s + a.total_converted, 0);

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Affiliates & Resellers</h1>
          <p className="text-sm text-gray-500 mt-1">Track partner referrals and commission payouts</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add Affiliate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active Partners', value: totalActive, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Converted', value: totalConverted, icon: ArrowUpRight, color: 'text-green-600 bg-green-50' },
          { label: 'Total Earned', value: `$${totalEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
          { label: 'Total Paid Out', value: `$${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Affiliates table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Partner</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Rate</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Referrals</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Earned</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Paid</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map(aff => (
              <tr key={aff.id}
                className={`border-t border-gray-50 hover:bg-gray-50 cursor-pointer ${selected?.id === aff.id ? 'bg-gray-50' : ''}`}
                onClick={() => selectAffiliate(aff)}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{aff.full_name}</p>
                  {aff.company_name && <p className="text-xs text-gray-400">{aff.company_name}</p>}
                </td>
                <td className="px-4 py-3">
                  <button onClick={e => { e.stopPropagation(); copyCode(aff.referral_code); }}
                    className="flex items-center gap-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                    {aff.referral_code} <Copy className="w-3 h-3 text-gray-400" />
                  </button>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {aff.commission_rate_pct}% {aff.commission_type === 'recurring' ? `(${aff.recurring_months}mo)` : '(one-time)'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-gray-900 font-medium">{aff.total_converted}</span>
                  <span className="text-gray-400"> / {aff.total_referrals}</span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">${aff.total_earned.toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-600">${aff.total_paid.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[aff.status] || ''}`}>
                    {aff.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(aff.created_at), 'MMM d, yyyy')}</td>
              </tr>
            ))}
            {affiliates.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No affiliates yet — click "Add Affiliate" to create your first partner</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)}>
          <div className="absolute right-0 top-0 h-full w-[540px] bg-white border-l border-gray-200 shadow-xl overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">{selected.full_name}</h3>
                {selected.company_name && <p className="text-xs text-gray-500">{selected.company_name}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-gray-900">{selected.total_referrals}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Referrals</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{selected.total_converted}</p>
                  <p className="text-[10px] text-green-600 uppercase tracking-wider">Converted</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-purple-700">${selected.total_earned.toFixed(0)}</p>
                  <p className="text-[10px] text-purple-600 uppercase tracking-wider">Earned</p>
                </div>
              </div>

              {/* Status controls */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <div className="flex gap-1.5">
                  {(['active', 'paused', 'terminated'] as const).map(s => (
                    <button key={s} onClick={() => updateStatus(selected, s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selected.status === s
                          ? STATUS_STYLES[s] + ' ring-1 ring-current'
                          : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}>
                      {s === 'active' && <CheckCircle className="w-3 h-3" />}
                      {s === 'paused' && <Pause className="w-3 h-3" />}
                      {s === 'terminated' && <XCircle className="w-3 h-3" />}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
                <dl className="space-y-2 text-sm">
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
                  <div className="flex items-center gap-3">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <button onClick={() => copyCode(selected.referral_code)}
                      className="flex items-center gap-1 font-mono text-sm bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                      {selected.referral_code} <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{selected.commission_rate_pct}% — {selected.commission_type === 'recurring' ? `${selected.recurring_months} months` : 'one-time'}</span>
                  </div>
                </dl>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex gap-4">
                  {(['referrals', 'commissions'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                        tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {detailLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : (
                <>
                  {/* Referrals tab */}
                  {tab === 'referrals' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Referred Clinics</p>
                        <button onClick={addReferral}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {referrals.map(ref => (
                          <div key={ref.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{ref.clinic_name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {ref.status === 'converted'
                                  ? `${ref.plan} — $${ref.monthly_value}/mo · Converted ${ref.converted_at ? format(new Date(ref.converted_at), 'MMM d') : ''}`
                                  : `Added ${format(new Date(ref.created_at), 'MMM d, yyyy')}`
                                }
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                ref.status === 'converted' ? 'bg-green-100 text-green-700'
                                  : ref.status === 'churned' ? 'bg-red-100 text-red-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {ref.status}
                              </span>
                              {ref.status === 'pending' && (
                                <button onClick={() => convertReferral(ref)}
                                  className="text-xs font-medium text-green-600 hover:text-green-800">
                                  Convert
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        {referrals.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">No referrals yet</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Commissions tab */}
                  {tab === 'commissions' && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Commission Ledger</p>
                        <button onClick={generateMonthlyCommissions}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                          <CreditCard className="w-3 h-3" /> Generate This Month
                        </button>
                      </div>
                      <div className="space-y-2">
                        {commissions.map(comm => (
                          <div key={comm.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">${comm.commission_amount.toFixed(2)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {comm.commission_rate_pct}% of ${comm.gross_revenue.toFixed(2)} · {format(new Date(comm.period_start), 'MMM yyyy')}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              comm.status === 'paid' ? 'bg-green-100 text-green-700'
                                : comm.status === 'approved' ? 'bg-blue-100 text-blue-700'
                                : comm.status === 'voided' ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {comm.status}
                            </span>
                          </div>
                        ))}
                        {commissions.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">No commissions yet — convert a referral first</p>
                        )}
                      </div>

                      {/* Outstanding balance */}
                      {commissions.length > 0 && (
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Outstanding Balance</p>
                            <p className="text-lg font-bold text-purple-900 mt-0.5">
                              ${(selected.total_earned - selected.total_paid).toFixed(2)}
                            </p>
                          </div>
                          <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Notes */}
              {selected.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-gray-600">{selected.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timeline</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Joined {format(new Date(selected.created_at), 'MMMM d, yyyy')}</span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <a href={`mailto:${selected.email}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                  <Mail className="w-4 h-4" /> Email Partner
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create affiliate modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">New Affiliate</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={createAffiliate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" required value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                  <input type="text" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Commission %</label>
                  <input type="number" min="1" max="50" step="0.5" value={form.commission_rate_pct}
                    onChange={e => setForm({ ...form, commission_rate_pct: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.commission_type} onChange={e => setForm({ ...form, commission_type: e.target.value as 'one_time' | 'recurring' })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent">
                    <option value="recurring">Recurring</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>
                {form.commission_type === 'recurring' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Months</label>
                    <input type="number" min="1" max="60" value={form.recurring_months}
                      onChange={e => setForm({ ...form, recurring_months: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800">
                  Create Affiliate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
