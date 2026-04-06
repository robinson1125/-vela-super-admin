import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, X } from 'lucide-react';
import { supabase, callFunction } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Clinic } from '../types';

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add clinic form
  const [newClinic, setNewClinic] = useState({ clinic_name: '', owner_full_name: '', owner_email: '', owner_password: '', owner_phone: '', plan: 'starter' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadClinics(); }, []);

  async function loadClinics() {
    const { data } = await supabase.from('clinics').select('*').order('created_at', { ascending: false });
    setClinics(data || []);
    setLoading(false);
  }

  async function handleCreateClinic(e: React.FormEvent) {
    e.preventDefault();
    if (!newClinic.clinic_name || !newClinic.owner_email || !newClinic.owner_password || !newClinic.owner_full_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreating(true);
    try {
      const result = await callFunction('create-clinic', newClinic);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${newClinic.clinic_name} created successfully!`);
        setShowAddModal(false);
        setNewClinic({ clinic_name: '', owner_full_name: '', owner_email: '', owner_password: '', owner_phone: '', plan: 'starter' });
        loadClinics();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to create clinic');
    }
    setCreating(false);
  }

  const filtered = clinics.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.support_email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter !== 'all' && c.plan !== planFilter) return false;
    if (statusFilter !== 'all' && c.plan_status !== statusFilter) return false;
    return true;
  });

  const planColors: Record<string, string> = { starter: 'bg-gray-100 text-gray-700', growth: 'bg-blue-100 text-blue-700', pro: 'bg-purple-100 text-purple-700' };
  const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', trial: 'bg-amber-100 text-amber-700', past_due: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500', suspended: 'bg-red-100 text-red-800' };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clinics</h1>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus className="w-4 h-4" /> Add Clinic
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search clinics..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="rounded-lg border-gray-300 text-sm">
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border-gray-300 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">Showing {filtered.length} of {clinics.length} clinics</p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Clinic</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Patients</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Onboarding</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(clinic => (
                <tr key={clinic.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link to={`/clinics/${clinic.id}`} className="font-medium text-gray-900 hover:underline">{clinic.name}</Link>
                    <p className="text-xs text-gray-400">{clinic.support_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[clinic.plan]}`}>{clinic.plan}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[clinic.plan_status]}`}>{clinic.plan_status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{clinic.patient_count}</td>
                  <td className="px-4 py-3">
                    {clinic.onboarding_completed ? (
                      <span className="text-green-600 text-xs font-medium">✓</span>
                    ) : (
                      <span className="text-amber-600 text-xs">{clinic.onboarding_step}/7</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(clinic.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No clinics found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Clinic Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Add New Clinic</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateClinic} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Name *</label>
                <input type="text" value={newClinic.clinic_name} onChange={e => setNewClinic(p => ({ ...p, clinic_name: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" placeholder="e.g. Radiant Skin Clinic" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Full Name *</label>
                <input type="text" value={newClinic.owner_full_name} onChange={e => setNewClinic(p => ({ ...p, owner_full_name: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email *</label>
                <input type="email" value={newClinic.owner_email} onChange={e => setNewClinic(p => ({ ...p, owner_email: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Password *</label>
                <input type="password" value={newClinic.owner_password} onChange={e => setNewClinic(p => ({ ...p, owner_password: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" placeholder="Min 8 characters" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="tel" value={newClinic.owner_phone} onChange={e => setNewClinic(p => ({ ...p, owner_phone: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={newClinic.plan} onChange={e => setNewClinic(p => ({ ...p, plan: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900">
                  <option value="starter">Starter — $149/mo</option>
                  <option value="growth">Growth — $299/mo</option>
                  <option value="pro">Pro — $499/mo</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
