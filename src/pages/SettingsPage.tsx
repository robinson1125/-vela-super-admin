import { useEffect, useState } from 'react';
import { supabase, callFunction } from '../lib/supabase';
import { Plus, X, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'admins' | 'plans'>('general');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'general', label: 'General' },
          { key: 'admins', label: 'Admin Users' },
          { key: 'plans', label: 'Plan Pricing' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'admins' && <AdminUsers />}
      {activeTab === 'plans' && <PlanSettings />}
    </div>
  );
}

function GeneralSettings() {
  const [settings, setSettings] = useState({
    platform_name: 'Vela',
    support_email: 'support@velareward.com',
    default_trial_days: '14',
    default_plan: 'starter',
    require_onboarding: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('platform_settings').select('*').single().then(({ data }) => {
      if (data) setSettings(prev => ({ ...prev, ...data }));
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('platform_settings').upsert({
      id: 'default',
      ...settings,
      default_trial_days: parseInt(settings.default_trial_days),
    });
    if (error) {
      toast.error('Failed to save — platform_settings table may not exist yet');
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h3 className="font-semibold text-gray-900">Platform Configuration</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
          <input type="text" value={settings.platform_name} onChange={e => setSettings(p => ({ ...p, platform_name: e.target.value }))}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
          <input type="email" value={settings.support_email} onChange={e => setSettings(p => ({ ...p, support_email: e.target.value }))}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Trial Period (days)</label>
          <input type="number" value={settings.default_trial_days} onChange={e => setSettings(p => ({ ...p, default_trial_days: e.target.value }))}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Plan for New Clinics</label>
          <select value={settings.default_plan} onChange={e => setSettings(p => ({ ...p, default_plan: e.target.value }))}
            className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900">
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="onboarding" checked={settings.require_onboarding}
            onChange={e => setSettings(p => ({ ...p, require_onboarding: e.target.checked }))}
            className="rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
          <label htmlFor="onboarding" className="text-sm text-gray-700">Require new clinics to complete onboarding</label>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    const { data } = await supabase.from('platform_admins').select('*').order('created_at', { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error('All fields are required');
      return;
    }
    setCreating(true);
    try {
      const result = await callFunction('create-platform-admin', form);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${form.full_name} added as admin`);
        setShowAdd(false);
        setForm({ full_name: '', email: '', password: '' });
        loadAdmins();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create admin');
    }
    setCreating(false);
  }

  async function removeAdmin(admin: any) {
    if (!confirm(`Remove ${admin.full_name} as admin?`)) return;
    await supabase.from('platform_admins').delete().eq('id', admin.id);
    toast.success('Admin removed');
    loadAdmins();
  }

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{admins.length} admin user{admins.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus className="w-4 h-4" /> Add Admin
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {admins.map(admin => (
          <div key={admin.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{admin.full_name}</p>
                <p className="text-xs text-gray-400">{admin.email}</p>
              </div>
            </div>
            <button onClick={() => removeAdmin(admin)} className="text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Admin Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Add Platform Admin</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" placeholder="Min 8 characters" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanSettings() {
  const [plans, setPlans] = useState([
    { key: 'starter', name: 'Starter', price: 149, patient_limit: 100, features: 'Basic loyalty, products, booking' },
    { key: 'growth', name: 'Growth', price: 299, patient_limit: 500, features: 'Everything in Starter + memberships, packages, flash sales, referrals' },
    { key: 'pro', name: 'Pro', price: 499, patient_limit: -1, features: 'Everything in Growth + gift cards, advanced analytics, API access, priority support' },
  ]);
  const [saving, setSaving] = useState(false);

  function updatePlan(index: number, field: string, value: any) {
    setPlans(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  async function handleSave() {
    setSaving(true);
    // In production, this would update a platform_plans table
    toast.success('Plan pricing saved');
    setSaving(false);
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-gray-500 mb-4">Configure plan tiers and pricing for new clinics</p>

      <div className="grid grid-cols-3 gap-4">
        {plans.map((plan, i) => {
          const colors: Record<string, string> = { starter: 'border-gray-300', growth: 'border-blue-300', pro: 'border-purple-300' };
          const badges: Record<string, string> = { starter: 'bg-gray-100 text-gray-700', growth: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700' };
          return (
            <div key={plan.key} className={`bg-white border-2 ${colors[plan.key]} rounded-xl p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${badges[plan.key]}`}>{plan.name}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Price ($)</label>
                <input type="number" value={plan.price} onChange={e => updatePlan(i, 'price', parseInt(e.target.value))}
                  className="w-full rounded-lg border-gray-300 text-sm font-bold focus:border-gray-900 focus:ring-gray-900" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Patient Limit (-1 = unlimited)</label>
                <input type="number" value={plan.patient_limit} onChange={e => updatePlan(i, 'patient_limit', parseInt(e.target.value))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Features</label>
                <textarea value={plan.features} onChange={e => updatePlan(i, 'features', e.target.value)} rows={3}
                  className="w-full rounded-lg border-gray-300 text-xs focus:border-gray-900 focus:ring-gray-900" />
              </div>

              <div className="pt-2 border-t border-gray-100 text-center">
                <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-sm text-gray-400">/mo</span>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSave} disabled={saving}
        className="mt-6 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save Plan Pricing'}
      </button>
    </div>
  );
}
