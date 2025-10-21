import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../app/authState';
import { AppHeader } from '../components/layout/AppHeader';

// Shared UI primitives
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '../components/ui/primitives';

// ---------------- Types ----------------
export interface MenuItem { id: string; name: string; description: string; price: number; category: Category; available: boolean }
type Category = 'food' | 'drinks' | 'appetizers' | 'desserts';

// Seed data (dup of BookingDetailPage mockMenu – unify later via context)
const initialItems: MenuItem[] = [
  { id:'1', name:'Club Sandwich', description:'Triple-decker with turkey, bacon, lettuce, tomato', price:12.99, category:'food', available:true },
  { id:'2', name:'Korean Fried Chicken', description:'Crispy chicken w/ sweet & spicy sauce', price:15.99, category:'food', available:true },
  { id:'5', name:'Soju', description:'Original / Peach / Grape', price:8.99, category:'drinks', available:true },
  { id:'6', name:'Beer', description:'Domestic & imported', price:6.99, category:'drinks', available:true },
  { id:'9', name:'Chicken Wings', description:'6pc choice of sauce', price:10.99, category:'appetizers', available:true },
  { id:'12', name:'Ice Cream', description:'Vanilla / Choc / Strawberry', price:5.99, category:'desserts', available:true },
];

interface DraftItem { name: string; description: string; price: string; category: Category; available: boolean }
const emptyDraft: DraftItem = { name:'', description:'', price:'', category:'food', available:true };

const categories: { key: Category; label: string }[] = [
  { key:'food', label:'Food' },
  { key:'drinks', label:'Drinks' },
  { key:'appetizers', label:'Appetizers' },
  { key:'desserts', label:'Desserts' },
];

const MenuManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { forceSync } = useAuth();
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Safe back navigation handler
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const filtered = useMemo(()=> items.filter(i => (filterCategory==='all' || i.category===filterCategory) && (search.trim()==='' || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase()))), [items, filterCategory, search]);

  const startCreate = () => { setEditingId(null); setDraft(emptyDraft); setShowForm(true); };
  const startEdit = (id: string) => {
    const item = items.find(i=>i.id===id); if(!item) return; setEditingId(id); setDraft({ name:item.name, description:item.description, price:String(item.price), category:item.category, available:item.available }); setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditingId(null); };
  const commitForm = () => {
    const priceNum = parseFloat(draft.price); if(!draft.name.trim()) return; if(Number.isNaN(priceNum) || priceNum < 0) return;
    if (editingId) {
      setItems(curr => curr.map(i => i.id===editingId ? { ...i, name:draft.name.trim(), description:draft.description.trim(), price:priceNum, category:draft.category, available:draft.available } : i));
    } else {
      const newItem: MenuItem = { id: crypto.randomUUID(), name: draft.name.trim(), description: draft.description.trim(), price: priceNum, category: draft.category, available: draft.available };
      setItems(curr => [...curr, newItem]);
    }
    setShowForm(false); setEditingId(null);
  };
  const toggleAvailability = (id: string) => setItems(curr => curr.map(i => i.id===id?{...i, available:!i.available}:i));
  const confirmDelete = (id: string) => setConfirmDeleteId(id);
  const performDelete = () => { if(confirmDeleteId) setItems(curr => curr.filter(i=>i.id!==confirmDeleteId)); setConfirmDeleteId(null); };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <AppHeader onTest={()=>{}} onSync={forceSync} />
      <main className="flex-1 px-6 py-8 space-y-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Menu Management</h1>
            <p className="text-slate-400 text-sm">Add, edit, and organize items (local mock)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleGoBack} className="px-3 py-2 rounded bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600 border border-slate-600">Back</button>
            <button onClick={startCreate} className="px-4 py-2 rounded bg-amber-500 text-black text-xs font-semibold hover:bg-amber-600">Add Item</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Filters & Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Search & category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button onClick={()=>setFilterCategory('all')} className={`px-3 py-1 rounded border border-slate-600 ${filterCategory==='all'?'bg-amber-500 text-black border-amber-500':'bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'}`}>All</button>
                  {categories.map(c => (
                    <button key={c.key} onClick={()=>setFilterCategory(c.key)} className={`px-3 py-1 rounded border capitalize border-slate-600 ${filterCategory===c.key?'bg-amber-500 text-black border-amber-500':'bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'}`}>{c.label}</button>
                  ))}
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items..." className="w-full text-sm px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
                <CardDescription>{filtered.length} item{filtered.length!==1 && 's'} shown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filtered.map(item => (
                  <div key={item.id} className="p-3 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-700/40 transition-colors text-sm space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate flex items-center gap-2">{item.name} {!item.available && <Badge className="bg-red-500/20 text-red-300">Unavailable</Badge>}</p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-amber-400 font-semibold text-xs">${item.price.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button onClick={()=>toggleAvailability(item.id)} className={`px-2 py-1 rounded border font-medium ${item.available?'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30':'bg-slate-600/40 text-slate-200 border-slate-600 hover:bg-slate-600/60'}`}>{item.available?'Available':'Enable'}</button>
                      <button onClick={()=>startEdit(item.id)} className="px-2 py-1 rounded border border-slate-600 bg-slate-700/40 text-slate-200 hover:bg-slate-600/60">Edit</button>
                      <button onClick={()=>confirmDelete(item.id)} className="px-2 py-1 rounded border border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30">Delete</button>
                    </div>
                  </div>
                ))}
                {filtered.length===0 && <div className="text-xs text-slate-500 py-10 text-center">No items match filters</div>}
              </CardContent>
            </Card>
          </div>

          {/* Right: Form / Meta */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? 'Edit Item' : 'Create Item'}</CardTitle>
                <CardDescription>{editingId? 'Modify existing menu entry':'Add a new menu item'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!showForm && (
                  <div className="text-xs text-slate-500">
                    Click <span className="text-amber-400 font-medium">Add Item</span> or Edit on an existing row to begin.
                  </div>
                )}
                {showForm && (
                  <form onSubmit={e=>{e.preventDefault(); commitForm();}} className="space-y-3 text-sm">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-slate-400">Name</label>
                      <input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-slate-400">Description</label>
                      <textarea value={draft.description} onChange={e=>setDraft(d=>({...d,description:e.target.value}))} rows={3} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400">Price</label>
                        <input type="number" step="0.01" min="0" value={draft.price} onChange={e=>setDraft(d=>({...d,price:e.target.value}))} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400" required />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400">Category</label>
                        <select value={draft.category} onChange={e=>setDraft(d=>({...d,category:e.target.value as Category}))} className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400">
                          {categories.map(c=> <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="available" type="checkbox" checked={draft.available} onChange={e=>setDraft(d=>({...d,available:e.target.checked}))} className="h-4 w-4" />
                      <label htmlFor="available" className="text-xs text-slate-300">Available</label>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="flex-1 px-4 py-2 rounded bg-amber-500 text-black text-xs font-semibold hover:bg-amber-600">{editingId? 'Save Changes':'Create Item'}</button>
                      <button type="button" onClick={cancelForm} className="px-4 py-2 rounded bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600 border border-slate-600">Cancel</button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
                <CardDescription>Simple stats</CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between"><span className="text-slate-400">Total Items</span><span className="text-slate-200">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Available</span><span className="text-emerald-300">{items.filter(i=>i.available).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Unavailable</span><span className="text-red-300">{items.filter(i=>!i.available).length}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Avg Price</span><span className="text-slate-200">${(items.reduce((s,i)=>s+i.price,0)/items.length).toFixed(2)}</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Simple delete confirmation overlay */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-800/90 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Delete Item</h3>
            <p className="text-sm text-slate-300">Are you sure you want to permanently delete this menu item? This cannot be undone.</p>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setConfirmDeleteId(null)} className="flex-1 px-4 py-2 rounded bg-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-600 border border-slate-600">Cancel</button>
              <button onClick={performDelete} className="flex-1 px-4 py-2 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementPage;

// TODO (UI Primitive Unification): Extract Card/Badge primitives to shared module and replace duplicates across Dashboard, BookingDetail, Menu pages.
// TODO (Persistence): Introduce a MenuProvider or use bookingContext extension; persist via IPC/SQLite once schema defined.
// TODO (Advanced Features): Bulk price updates, drag to reorder items, category CRUD, cost-of-goods metrics, export/print menu.
