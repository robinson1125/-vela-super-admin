import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const PLAN_PRICES: Record<string, number> = { starter: 149, growth: 299, pro: 499 };

export default function RevenuePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'6mo' | '12mo'>('6mo');

  useEffect(() => { loadRevenue(); }, []);

  async function loadRevenue() {
    const [clinicsRes, ordersRes, membershipsRes] = await Promise.all([
      supabase.from('clinics').select('id, name, plan, plan_status, created_at'),
      supabase.from('orders').select('total, status, created_at, clinic_id').eq('status', 'paid'),
      supabase.from('patient_memberships').select('id, status, plan_type, created_at, cancelled_at, clinic_id'),
    ]);

    const clinics = clinicsRes.data || [];
    const orders = ordersRes.data || [];
    const memberships = membershipsRes.data || [];
    const active = clinics.filter(c => c.plan_status === 'active' || c.plan_status === 'trial');

    // Current MRR
    const mrr = active.reduce((sum, c) => sum + (PLAN_PRICES[c.plan] || 0), 0);

    // Build monthly data for the last 12 months
    const months: { label: string; date: Date; mrr: number; gmv: number; newClinics: number; churned: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      // Clinics active by end of that month
      const activeThen = clinics.filter(c => new Date(c.created_at) <= endOfMonth);
      const monthMrr = activeThen.reduce((sum, c) => sum + (PLAN_PRICES[c.plan] || 0), 0);

      // GMV for that month
      const monthOrders = orders.filter(o => {
        const od = new Date(o.created_at);
        return od >= d && od <= endOfMonth;
      });
      const gmv = monthOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);

      // New clinics that month
      const newClinics = clinics.filter(c => {
        const cd = new Date(c.created_at);
        return cd >= d && cd <= endOfMonth;
      }).length;

      // Churned memberships
      const churned = memberships.filter(m => {
        if (!m.cancelled_at) return false;
        const cd = new Date(m.cancelled_at);
        return cd >= d && cd <= endOfMonth;
      }).length;

      months.push({ label, date: d, mrr: monthMrr, gmv, newClinics, churned });
    }

    // Calculate growth
    const lastMonth = months[months.length - 2];
    const thisMonth = months[months.length - 1];
    const mrrGrowth = lastMonth?.mrr > 0 ? ((thisMonth.mrr - lastMonth.mrr) / lastMonth.mrr) * 100 : 0;
    const gmvGrowth = lastMonth?.gmv > 0 ? ((thisMonth.gmv - lastMonth.gmv) / lastMonth.gmv) * 100 : 0;

    // Revenue by clinic (top 10)
    const clinicRevenue = clinics.map(c => {
      const clinicOrders = orders.filter(o => o.clinic_id === c.id);
      const revenue = clinicOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
      return { ...c, revenue, orderCount: clinicOrders.length };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Plan breakdown
    const planBreakdown = ['starter', 'growth', 'pro'].map(plan => ({
      plan,
      count: active.filter(c => c.plan === plan).length,
      mrr: active.filter(c => c.plan === plan).length * (PLAN_PRICES[plan] || 0),
    }));

    // Recent payments (simulated from orders)
    const recentPayments = orders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(o => {
        const clinic = clinics.find(c => c.id === o.clinic_id);
        return { ...o, clinicName: clinic?.name || 'Unknown' };
      });

    setData({
      mrr, arr: mrr * 12, mrrGrowth, gmvGrowth,
      thisMonthGmv: thisMonth.gmv,
      totalGmv: orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0),
      months, planBreakdown, clinicRevenue, recentPayments,
      totalClinics: active.length,
    });
    setLoading(false);
  }

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;

  const displayMonths = timeRange === '6mo' ? data.months.slice(-6) : data.months;
  const maxMrr = Math.max(...displayMonths.map((m: any) => m.mrr), 1);
  const maxGmv = Math.max(...displayMonths.map((m: any) => m.gmv), 1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setTimeRange('6mo')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${timeRange === '6mo' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>6 Months</button>
          <button onClick={() => setTimeRange('12mo')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${timeRange === '12mo' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>12 Months</button>
        </div>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard label="MRR" value={`$${data.mrr.toLocaleString()}`} change={data.mrrGrowth} icon={DollarSign} />
        <MetricCard label="ARR" value={`$${data.arr.toLocaleString()}`} change={data.mrrGrowth} icon={TrendingUp} />
        <MetricCard label="GMV This Month" value={`$${data.thisMonthGmv.toLocaleString()}`} change={data.gmvGrowth} icon={DollarSign} />
        <MetricCard label="All-Time GMV" value={`$${data.totalGmv.toLocaleString()}`} sub={`${data.totalClinics} active clinics`} icon={TrendingUp} />
      </div>

      {/* MRR Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">MRR Over Time</h3>
        <div className="flex items-end gap-2 h-48">
          {displayMonths.map((m: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">${m.mrr.toLocaleString()}</span>
              <div className="w-full bg-gray-900 rounded-t-md transition-all" style={{ height: `${(m.mrr / maxMrr) * 160}px` }} />
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* GMV Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Platform GMV (Clinic Sales)</h3>
        <div className="flex items-end gap-2 h-48">
          {displayMonths.map((m: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500 font-medium">${m.gmv.toLocaleString()}</span>
              <div className="w-full bg-green-500 rounded-t-md transition-all" style={{ height: `${maxGmv > 0 ? (m.gmv / maxGmv) * 160 : 0}px` }} />
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Plan breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">MRR by Plan</h3>
          <div className="space-y-4">
            {data.planBreakdown.map((p: any) => {
              const pct = data.mrr > 0 ? (p.mrr / data.mrr) * 100 : 0;
              const colors: Record<string, string> = { starter: 'bg-gray-400', growth: 'bg-blue-500', pro: 'bg-purple-500' };
              return (
                <div key={p.plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 capitalize">{p.plan}</span>
                    <span className="text-gray-500">{p.count} clinics · ${p.mrr.toLocaleString()}/mo</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full">
                    <div className={`h-3 rounded-full ${colors[p.plan]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm font-semibold">
            <span className="text-gray-700">Total MRR</span>
            <span className="text-gray-900">${data.mrr.toLocaleString()}/mo</span>
          </div>
        </div>

        {/* Top clinics by revenue */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Top Clinics by GMV</h3>
          <div className="space-y-3">
            {data.clinicRevenue.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-5">{i + 1}.</span>
                  <span className="font-medium text-gray-900">{c.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-900 font-medium">${c.revenue.toLocaleString()}</span>
                  <span className="text-gray-400 text-xs ml-2">{c.orderCount} orders</span>
                </div>
              </div>
            ))}
            {data.clinicRevenue.length === 0 && <p className="text-gray-400 text-sm">No revenue data yet</p>}
          </div>
        </div>
      </div>

      {/* Recent payments */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Payments</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Clinic</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Amount</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentPayments.map((p: any, i: number) => (
              <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.clinicName}</td>
                <td className="px-4 py-3 text-gray-900">${parseFloat(p.total).toLocaleString()}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{p.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {data.recentPayments.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No payments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value, change, sub, icon: Icon }: any) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
          <Icon className="w-5 h-5" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}
