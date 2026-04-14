import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, Users, DollarSign, ShoppingBag, CreditCard, Edit2, Save, X, Copy } from 'lucide-react';
import { supabase, callFunction } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Clinic } from '../types';

export default function ClinicDetailPage() {
  const { clinicId } = useParams();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'orders'>('overview');
  const [patients, setPatients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [allClinics, setAllClinics] = useState<any[]>([]);
  const [cloneTargetId, setCloneTargetId] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<any>(null);

  useEffect(() => { if (clinicId) loadClinic(); }, [clinicId]);

  async function loadClinic() {
    const [{ data: c }, { data: s }] = await Promise.all([
      supabase.from('clinics').select('*').eq('id', clinicId).single(),
      supabase.from('clinic_staff').select('*').eq('clinic_id', clinicId),
    ]);
    setClinic(c);
    setStaff(s || []);
    if (c) setEditForm({ name: c.name, support_email: c.support_email, plan: c.plan, plan_status: c.plan_status });

    const [patientsRes, ordersRes, membershipsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, created_at, phone').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, total, status, created_at').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(50),
      supabase.from('patient_memberships').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'active'),
    ]);

    setPatients(patientsRes.data || []);
    setOrders(ordersRes.data || []);

    const totalRevenue = (ordersRes.data || []).filter((o: any) => o.status === 'paid').reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);

    setStats({
      patients: patientsRes.data?.length || 0,
      totalRevenue,
      orders: ordersRes.data?.length || 0,
      activeMemberships: membershipsRes.count || 0,
    });
    setLoading(false);
  }

  async function handleSaveEdit() {
    if (!clinic) return;
    setSaving(true);
    const { error } = await supabase.from('clinics').update({
      name: editForm.name,
      support_email: editForm.support_email,
      plan: editForm.plan,
      plan_status: editForm.plan_status,
    }).eq('id', clinic.id);

    if (error) {
      toast.error('Failed to update clinic');
    } else {
      toast.success('Clinic updated');
      setEditing(false);
      loadClinic();
    }
    setSaving(false);
  }

  function handleImpersonate() {
    if (!clinic) return;
    setImpersonating(true);
    // Open the clinic's app in a new window with the clinic slug
    // In production this would use a special admin token
    toast.success(`Viewing ${clinic.name} as admin — check the new tab`);
    window.open(`https://${clinic.slug}.velareward.com`, '_blank');
    setTimeout(() => setImpersonating(false), 1000);
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;
  if (!clinic) return <div className="p-8 text-gray-500">Clinic not found</div>;

  const planColors: Record<string, string> = { starter: 'bg-gray-100 text-gray-700', growth: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700' };
  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', trial: 'bg-amber-100 text-amber-700', past_due: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500', suspended: 'bg-red-100 text-red-800' };

  return (
    <div className="p-8">
      <Link to="/clinics" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Clinics
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            {clinic.logo_url ? (
              <img src={clinic.logo_url} className="w-12 h-12 rounded-lg object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                {clinic.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[clinic.plan]}`}>{clinic.plan}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[clinic.plan_status]}`}>{clinic.plan_status}</span>
                <span className="text-xs text-gray-400">slug: {clinic.slug}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={handleImpersonate} disabled={impersonating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg font-medium hover:bg-amber-200 disabled:opacity-50">
            <Eye className="w-3.5 h-3.5" /> {impersonating ? 'Opening...' : 'Impersonate'}
          </button>
          <button onClick={async () => {
            const { data } = await supabase.from('clinics').select('id, name').neq('id', clinicId).order('name');
            setAllClinics(data || []);
            setCloneTargetId('');
            setCloneResult(null);
            setShowCloneModal(true);
          }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200">
            <Copy className="w-3.5 h-3.5" /> Clone Setup
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-amber-800">Edit Clinic</h3>
            <button onClick={() => setEditing(false)} className="text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Clinic Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border-amber-300 text-sm focus:border-amber-500 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Support Email</label>
              <input type="email" value={editForm.support_email || ''} onChange={e => setEditForm((p: any) => ({ ...p, support_email: e.target.value }))}
                className="w-full rounded-lg border-amber-300 text-sm focus:border-amber-500 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Plan</label>
              <select value={editForm.plan} onChange={e => setEditForm((p: any) => ({ ...p, plan: e.target.value }))}
                className="w-full rounded-lg border-amber-300 text-sm focus:border-amber-500 focus:ring-amber-500">
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 mb-1">Status</label>
              <select value={editForm.plan_status} onChange={e => setEditForm((p: any) => ({ ...p, plan_status: e.target.value }))}
                className="w-full rounded-lg border-amber-300 text-sm focus:border-amber-500 focus:ring-amber-500">
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <button onClick={handleSaveEdit} disabled={saving}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard icon={Users} label="Patients" value={stats?.patients} />
        <MetricCard icon={DollarSign} label="Total Revenue" value={`$${stats?.totalRevenue.toLocaleString()}`} />
        <MetricCard icon={ShoppingBag} label="Orders" value={stats?.orders} />
        <MetricCard icon={CreditCard} label="Active Memberships" value={stats?.activeMemberships} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'patients', label: `Patients (${patients.length})` },
          { key: 'orders', label: `Orders (${orders.length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${activeTab === tab.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Clinic Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Slug</dt><dd className="text-gray-900 font-mono">{clinic.slug}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">App Name</dt><dd className="text-gray-900">{clinic.app_name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd className="text-gray-900">{clinic.support_email || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd className="text-gray-900">{clinic.address ? `${clinic.address}, ${clinic.city} ${clinic.state} ${clinic.zip}` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Primary Color</dt><dd className="flex items-center gap-2"><div className="w-4 h-4 rounded" style={{ backgroundColor: clinic.primary_color }} /><span className="text-gray-900 font-mono text-xs">{clinic.primary_color}</span></dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="text-gray-900">{new Date(clinic.created_at).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Onboarding</dt><dd className="text-gray-900">{clinic.onboarding_completed ? 'Complete' : `Step ${clinic.onboarding_step}/7`}</dd></div>
            </dl>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Staff ({staff.length})</h3>
            <div className="space-y-3">
              {staff.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-900 font-medium">{s.full_name}</p>
                    <p className="text-gray-400 text-xs">{s.email}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{s.role}</span>
                </div>
              ))}
              {staff.length === 0 && <p className="text-sm text-gray-400">No staff members found</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.email}</td>
                  <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No patients yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Order ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-medium text-gray-900">${parseFloat(o.total).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Clone modal */}
      {showCloneModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clone Clinic Setup</h3>
                <p className="text-xs text-gray-500 mt-0.5">Copy all configuration from <strong>{clinic.name}</strong> to another clinic</p>
              </div>
              <button onClick={() => setShowCloneModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            {!cloneResult ? (
              <>
                <div className="p-5 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-900 font-medium mb-1">What gets cloned:</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Services, products, membership tiers, offers, form templates, automation workflows (inactive),
                      smart phrases, marketing forms, clinic settings, branding colors.
                    </p>
                    <p className="text-[11px] text-blue-600 mt-1.5 font-medium">
                      NOT cloned: patients, staff, appointments, orders, inventory, conversations.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Clone to which clinic?</label>
                    <select value={cloneTargetId} onChange={e => setCloneTargetId(e.target.value)}
                      className="w-full rounded-lg border-gray-300 text-sm py-2.5">
                      <option value="">Select target clinic...</option>
                      {allClinics.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {cloneTargetId && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <span className="text-amber-600 text-lg">⚠️</span>
                      <p className="text-xs text-amber-800">
                        This will add configuration to <strong>{allClinics.find(c => c.id === cloneTargetId)?.name}</strong>.
                        Existing data on the target clinic will NOT be deleted — new items will be added alongside anything already there.
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-gray-200 flex gap-2">
                  <button onClick={() => setShowCloneModal(false)}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button
                    disabled={!cloneTargetId || cloning}
                    onClick={async () => {
                      if (!confirm(`Clone ${clinic.name}'s setup to ${allClinics.find(c => c.id === cloneTargetId)?.name}? This cannot be undone.`)) return;
                      setCloning(true);
                      const result = await callFunction('clone-clinic', {
                        source_clinic_id: clinicId,
                        target_clinic_id: cloneTargetId,
                      });
                      setCloning(false);
                      if (result.error) { toast.error(result.error); return; }
                      setCloneResult(result);
                      toast.success('Clone complete!');
                    }}
                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> {cloning ? 'Cloning...' : 'Clone Now'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">✓</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Clone complete</p>
                      <p className="text-xs text-gray-500">{cloneResult.source?.name} → {cloneResult.target?.name}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                    {Object.entries(cloneResult.cloned || {}).map(([key, count]: [string, any]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3 border-t border-gray-200">
                  <button onClick={() => setShowCloneModal(false)}
                    className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
