import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, DollarSign, Headset, Settings, LogOut, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import GlobalSearch from '../components/GlobalSearch';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clinics', label: 'Clinics', icon: Building2 },
  { to: '/leads', label: 'Leads', icon: UserPlus },
  { to: '/affiliates', label: 'Affiliates', icon: Users },
  { to: '/revenue', label: 'Revenue', icon: DollarSign },
  { to: '/support', label: 'Support', icon: Headset },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('platform_admins').select('full_name').eq('user_id', user.id).single()
          .then(({ data }) => setAdminName(data?.full_name || user.email || ''));
      }
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold">Vela</h1>
          <p className="text-xs text-gray-400 mt-1">Super Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{adminName}</p>
              <p className="text-xs text-gray-500">Platform Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3 flex items-center justify-between">
          <GlobalSearch />
          <div className="text-xs text-gray-400">Vela Platform Admin</div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
