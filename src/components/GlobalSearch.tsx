import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ clinics: any[]; patients: any[] }>({ clinics: [], patients: [] });
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults({ clinics: [], patients: [] }); return; }

    const timeout = setTimeout(async () => {
      setSearching(true);
      const q = query.toLowerCase();

      const [{ data: clinics }, { data: patients }] = await Promise.all([
        supabase.from('clinics').select('id, name, slug, plan, plan_status, support_email').ilike('name', `%${q}%`).limit(5),
        supabase.from('profiles').select('id, full_name, email, clinic_id').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
      ]);

      setResults({ clinics: clinics || [], patients: patients || [] });
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function goTo(path: string) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  const planColors: Record<string, string> = { starter: 'bg-gray-100 text-gray-600', growth: 'bg-blue-100 text-blue-600', pro: 'bg-purple-100 text-purple-600' };
  const hasResults = results.clinics.length > 0 || results.patients.length > 0;

  return (
    <>
      {/* Search trigger button */}
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-500 transition-colors w-72">
        <Search className="w-4 h-4" />
        <span className="flex-1 text-left">Search clinics, patients...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-xs text-gray-400 border border-gray-200 font-mono">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]" onClick={() => { setOpen(false); setQuery(''); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search clinics, patients, emails..."
                className="flex-1 text-sm outline-none border-none focus:ring-0 p-0"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {searching && (
                <div className="p-4 text-center text-sm text-gray-400">Searching...</div>
              )}

              {!searching && query && !hasResults && (
                <div className="p-6 text-center text-sm text-gray-400">No results for "{query}"</div>
              )}

              {!searching && results.clinics.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">Clinics</div>
                  {results.clinics.map(c => (
                    <button key={c.id} onClick={() => goTo(`/clinics/${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{c.support_email || c.slug}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${planColors[c.plan]}`}>{c.plan}</span>
                    </button>
                  ))}
                </div>
              )}

              {!searching && results.patients.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">Patients</div>
                  {results.patients.map(p => (
                    <button key={p.id} onClick={() => goTo(`/clinics/${p.clinic_id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.full_name || 'No name'}</p>
                        <p className="text-xs text-gray-400 truncate">{p.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!query && (
                <div className="p-6 text-center text-sm text-gray-400">
                  Type to search across all clinics and patients
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
