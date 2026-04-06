import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, DollarSign, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    // Load platform-wide stats directly (platform admin bypasses clinic RLS via platform_admin policy)
    const [clinicsRes, patientsRes, ordersRes, trialRes] = await Promise.all([
      supabase.from('clinics').select('id, name, plan, plan_status, trial_ends_at, patient_count, created_at, onboarding_completed'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total, status, created_at').eq('status', 'paid'),
      supabase.from('clinics').select('id, name, trial_ends_at').eq('plan_status', 'trial'),
    ]);

    const clinics = clinicsRes.data || [];
    const active = clinics.filter(c => c.plan_status === 'active' || c.plan_status === 'trial');
    const pastDue = clinics.filter(c => c.plan_status === 'past_due');
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
    const newThisMonth = clinics.filter(c => new Date(c.created_at) >= thisMonth);

    // Calculate MRR (placeholder — in production this comes from Stripe)
    const planPrices: Record<string, number> = { starter: 149, growth: 299, pro: 499 };
    const mrr = active.reduce((sum, c) => sum + (planPrices[c.plan] || 0), 0);

    // Trial expiring in 7 days
    const sevenDays = new Date(Date.now() + 7 * 86400000);
    const expiringTrials = (trialRes.data || []).filter(c =>
      c.trial_ends_at && new Date(c.trial_ends_at) <= sevenDays
    );

    // Orders this month
    const monthOrders = (ordersRes.data || []).filter(o => new Date(o.created_at) >= thisMonth);
    const monthRevenue = monthOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);

    // Recent signups
    const recent = [...clinics].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    setStats({
      totalClinics: clinics.length, activeClinics: active.length, pastDueClinics: pastDue,
      newThisMonth: newThisMonth.length, mrr, arr: mrr * 12,
      totalPatients: patientsRes.count || 0,
      monthRevenue, monthOrders: monthOrders.length,
      expiringTrials, recentSignups: recent,
      planBreakdown: {
        starter: active.filter(c => c.plan === 'starter').length,
        growth: active.filter(c => c.plan === 'growth').length,
        pro: active.filter(c => c.plan === 'pro').length,
      },
    });
    setLoading(false);
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Platform Dashboard</h1>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard icon={DollarSign} label="Monthly Recurring Revenue" value={`$${stats.mrr.toLocaleString()}`} sub={`ARR: $${stats.arr.toLocaleString()}`} color="text-green-600" />
        <MetricCard icon={Building2} label="Active Clinics" value={stats.activeClinics} sub={`+${stats.newThisMonth} this month`} color="text-blue-600" />
        <MetricCard icon={Users} label="Total Patients" value={stats.totalPatients.toLocaleString()} sub="across all clinics" color="text-purple-600" />
        <MetricCard icon={TrendingDown} label="Past Due" value={stats.pastDueClinics.length} sub={stats.pastDueClinics.length > 0 ? 'action required' : 'all payments current'} color={stats.pastDueClinics.length > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>

      {/* Plan breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <PlanCard plan="Starter" count={stats.planBreakdown.starter} price={149} color="bg-gray-100 text-gray-700" />
        <PlanCard plan="Growth" count={stats.planBreakdown.growth} price={299} color="bg-blue-50 text-blue-700" />
        <PlanCard plan="Pro" count={stats.planBreakdown.pro} price={499} color="bg-purple-50 text-purple-700" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="col-span-2 space-y-4">
          {stats.pastDueClinics.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-800">Past Due Clinics</h3>
              </div>
              {stats.pastDueClinics.map((c: any) => (
                <Link key={c.id} to={`/clinics/${c.id}`} className="block text-sm text-red-700 hover:underline py-1">
                  {c.name} — {c.plan} plan
                </Link>
              ))}
            </div>
          )}

          {stats.expiringTrials.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">Trials Expiring Soon</h3>
              </div>
              {stats.expiringTrials.map((c: any) => (
                <Link key={c.id} to={`/clinics/${c.id}`} className="block text-sm text-amber-700 hover:underline py-1">
                  {c.name} — expires {new Date(c.trial_ends_at).toLocaleDateString()}
                </Link>
              ))}
            </div>
          )}

          {/* Recent signups */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Signups</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Clinic</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Plan</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Signed Up</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Onboarding</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSignups.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/clinics/${c.id}`} className="text-gray-900 font-medium hover:underline">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.plan === 'pro' ? 'bg-purple-100 text-purple-700' : c.plan === 'growth' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {c.onboarding_completed ? (
                        <span className="text-green-600 text-xs font-medium">Complete</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full">
                            <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(c.onboarding_step / 7) * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{c.onboarding_step}/7</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GMV this month */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Platform GMV This Month</h3>
            <p className="text-2xl font-bold text-gray-900">${stats.monthRevenue.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.monthOrders} orders across all clinics</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Revenue Per Clinic</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.activeClinics > 0 ? Math.round(stats.mrr / stats.activeClinics).toLocaleString() : 0}
            </p>
            <p className="text-xs text-gray-400 mt-1">monthly subscription value</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function PlanCard({ plan, count, price, color }: any) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-lg font-bold">{plan}</p>
      <p className="text-3xl font-bold mt-1">{count}</p>
      <p className="text-sm opacity-75 mt-1">clinics · ${(count * price).toLocaleString()}/mo</p>
    </div>
  );
}
