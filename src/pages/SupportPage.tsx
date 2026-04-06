import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, X, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ticket {
  id: string;
  clinic_id: string;
  clinic_name: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  notes: { text: string; author: string; created_at: string }[];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newNote, setNewNote] = useState('');

  // Create form
  const [form, setForm] = useState({ clinic_id: '', subject: '', description: '', priority: 'medium' as string });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: ticketData }, { data: clinicData }] = await Promise.all([
      supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('clinics').select('id, name'),
    ]);

    // If support_tickets table doesn't exist yet, use empty array
    setTickets((ticketData || []).map((t: any) => ({
      ...t,
      clinic_name: clinicData?.find(c => c.id === t.clinic_id)?.name || 'Unknown',
      notes: t.notes || [],
    })));
    setClinics(clinicData || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject) { toast.error('Subject is required'); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        clinic_id: form.clinic_id || null,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        status: 'open',
        notes: [],
      });
      if (error) throw error;
      toast.success('Ticket created');
      setShowCreate(false);
      setForm({ clinic_id: '', subject: '', description: '', priority: 'medium' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create ticket');
    }
    setCreating(false);
  }

  async function updateStatus(ticket: Ticket, status: string) {
    await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticket.id);
    toast.success(`Ticket ${status === 'resolved' ? 'resolved' : 'updated'}`);
    loadData();
    if (selectedTicket?.id === ticket.id) setSelectedTicket({ ...ticket, status: status as any });
  }

  async function addNote(ticket: Ticket) {
    if (!newNote.trim()) return;
    const notes = [...(ticket.notes || []), { text: newNote, author: 'Admin', created_at: new Date().toISOString() }];
    await supabase.from('support_tickets').update({ notes, updated_at: new Date().toISOString() }).eq('id', ticket.id);
    setNewNote('');
    toast.success('Note added');
    loadData();
  }

  const filtered = tickets.filter(t => filter === 'all' || t.status === filter);

  const statusIcon: Record<string, any> = {
    open: <AlertCircle className="w-4 h-4 text-red-500" />,
    in_progress: <Clock className="w-4 h-4 text-amber-500" />,
    resolved: <CheckCircle className="w-4 h-4 text-green-500" />,
    closed: <CheckCircle className="w-4 h-4 text-gray-400" />,
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    open: 'bg-red-100 text-red-700',
    in_progress: 'bg-amber-100 text-amber-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { key: 'all', label: 'Total', icon: MessageSquare, color: 'text-gray-600' },
          { key: 'open', label: 'Open', icon: AlertCircle, color: 'text-red-600' },
          { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-amber-600' },
          { key: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-600' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key as any)}
            className={`bg-white border rounded-xl p-4 text-left transition-colors ${filter === s.key ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-300'}`}>
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{counts[s.key as keyof typeof counts]}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Ticket list */}
        <div className="flex-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No tickets {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : 'yet'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(ticket => (
                  <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-gray-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {statusIcon[ticket.status]}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{ticket.subject}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{ticket.clinic_name} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    {ticket.description && <p className="text-xs text-gray-500 mt-2 ml-7 line-clamp-2">{ticket.description}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket detail panel */}
        {selectedTicket && (
          <div className="w-96 bg-white border border-gray-200 rounded-xl p-5 h-fit sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Ticket Detail</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>

            <h4 className="font-medium text-gray-900 mb-1">{selectedTicket.subject}</h4>
            <p className="text-xs text-gray-400 mb-3">{selectedTicket.clinic_name} · {new Date(selectedTicket.created_at).toLocaleString()}</p>

            {selectedTicket.description && <p className="text-sm text-gray-600 mb-4">{selectedTicket.description}</p>}

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[selectedTicket.status]}`}>{selectedTicket.status.replace('_', ' ')}</span>
            </div>

            {/* Status actions */}
            <div className="flex gap-2 mb-4">
              {selectedTicket.status === 'open' && (
                <button onClick={() => updateStatus(selectedTicket, 'in_progress')} className="flex-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200">Start Working</button>
              )}
              {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                <button onClick={() => updateStatus(selectedTicket, 'resolved')} className="flex-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200">Resolve</button>
              )}
              {selectedTicket.status === 'resolved' && (
                <button onClick={() => updateStatus(selectedTicket, 'closed')} className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">Close</button>
              )}
            </div>

            {/* Notes */}
            <div className="border-t border-gray-100 pt-4">
              <h5 className="text-xs font-medium text-gray-500 mb-3">Notes</h5>
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {(selectedTicket.notes || []).map((note, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{note.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{note.author} · {new Date(note.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {(!selectedTicket.notes || selectedTicket.notes.length === 0) && <p className="text-xs text-gray-400">No notes yet</p>}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..."
                  className="flex-1 rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900"
                  onKeyDown={e => e.key === 'Enter' && addNote(selectedTicket)} />
                <button onClick={() => addNote(selectedTicket)} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">New Support Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinic (optional)</label>
                <select value={form.clinic_id} onChange={e => setForm(p => ({ ...p, clinic_id: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900">
                  <option value="">No specific clinic</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-gray-900 focus:ring-gray-900">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
