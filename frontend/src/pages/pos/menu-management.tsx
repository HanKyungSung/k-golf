import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  listMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  type MenuItem 
} from '@/services/pos-api';

// ---------------- Types ----------------
type Category = 'food' | 'drinks' | 'appetizers' | 'desserts' | 'hours';

interface DraftItem { 
  name: string; 
  description: string; 
  price: string; 
  category: Category; 
  available: boolean;
}

const emptyDraft: DraftItem = { 
  name: '', 
  description: '', 
  price: '', 
  category: 'food', 
  available: true 
};

const categories: { key: Category; label: string }[] = [
  { key: 'food', label: 'Food' },
  { key: 'drinks', label: 'Drinks' },
  { key: 'appetizers', label: 'Appetizers' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'hours', label: 'Hours' },
];

interface POSMenuManagementProps {
  onBack: () => void;
}

export default function POSMenuManagement({ onBack }: POSMenuManagementProps) {
  // Data state
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [search, setSearch] = useState('');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftItem>(emptyDraft);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load menu items on mount
  useEffect(() => {
    loadMenuItems();
  }, []);

  async function loadMenuItems() {
    try {
      setLoading(true);
      const menuItems = await listMenuItems();
      setItems(menuItems);
      console.log('[Menu Management] Loaded', menuItems.length, 'menu items');
    } catch (err) {
      console.error('[Menu Management] Failed to load menu items:', err);
      alert(`Failed to load menu: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  // Filtered items
  const filtered = useMemo(() => 
    items.filter(i => 
      (filterCategory === 'all' || i.category === filterCategory) && 
      (search.trim() === '' || 
        i.name.toLowerCase().includes(search.toLowerCase()) || 
        i.description?.toLowerCase().includes(search.toLowerCase()))
    ), 
    [items, filterCategory, search]
  );

  // Form handlers
  const startCreate = () => { 
    setEditingId(null); 
    setDraft(emptyDraft); 
    setShowForm(true); 
  };
  
  const startEdit = (id: string) => {
    const item = items.find(i => i.id === id); 
    if (!item) return; 
    setEditingId(id); 
    setDraft({ 
      name: item.name, 
      description: item.description || '', 
      price: String(item.price), 
      category: item.category as Category, 
      available: item.available 
    }); 
    setShowForm(true);
  };
  
  const cancelForm = () => { 
    setShowForm(false); 
    setEditingId(null); 
  };
  
  const commitForm = async () => {
    const priceNum = parseFloat(draft.price); 
    
    // Validation
    if (!draft.name.trim()) {
      alert('Please enter an item name');
      return;
    }
    if (Number.isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      
      if (editingId) {
        // Update existing item
        await updateMenuItem(editingId, {
          name: draft.name.trim(),
          description: draft.description.trim(),
          price: priceNum,
          category: draft.category,
          available: draft.available,
        });
      } else {
        // Create new item
        await createMenuItem({
          name: draft.name.trim(),
          description: draft.description.trim(),
          price: priceNum,
          category: draft.category,
          available: draft.available,
        });
      }
      
      // Reload menu items
      await loadMenuItems();
      
      // Close form
      setShowForm(false); 
      setEditingId(null);
    } catch (err) {
      console.error('[Menu Management] Failed to save item:', err);
      alert(`Failed to save item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };
  
  const toggleAvailability = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    try {
      await updateMenuItem(id, { available: !item.available });
      await loadMenuItems();
    } catch (err) {
      console.error('[Menu Management] Failed to toggle availability:', err);
      alert(`Failed to update item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  const confirmDelete = (id: string) => setConfirmDeleteId(id);
  
  const performDelete = async () => { 
    if (!confirmDeleteId) return;
    
    try {
      setDeleting(true);
      await deleteMenuItem(confirmDeleteId);
      await loadMenuItems();
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('[Menu Management] Failed to delete item:', err);
      alert(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div className="text-white text-xl">Loading menu...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <main className="flex-1 px-6 py-8 space-y-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              Menu Management
            </h1>
            <p className="text-slate-400 text-sm">Add, edit, and organize menu items</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline" className="bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600">
              Back
            </Button>
            <Button onClick={startCreate} className="bg-amber-500 text-black hover:bg-amber-600 font-semibold">
              Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left: Filters & Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Filters</CardTitle>
                <CardDescription className="text-slate-400">Search & category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button 
                    onClick={() => setFilterCategory('all')} 
                    className={`px-3 py-1 rounded border border-slate-600 ${
                      filterCategory === 'all' 
                        ? 'bg-amber-500 text-black border-amber-500' 
                        : 'bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    All
                  </button>
                  {categories.map(c => (
                    <button 
                      key={c.key} 
                      onClick={() => setFilterCategory(c.key)} 
                      className={`px-3 py-1 rounded border capitalize border-slate-600 ${
                        filterCategory === c.key 
                          ? 'bg-amber-500 text-black border-amber-500' 
                          : 'bg-slate-700/40 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search items..." 
                  className="w-full text-sm px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400" 
                />
              </CardContent>
            </Card>

            {/* Items List Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Items</CardTitle>
                <CardDescription className="text-slate-400">
                  {filtered.length} item{filtered.length !== 1 && 's'} shown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filtered.map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-md border border-slate-700 bg-slate-800/40 hover:bg-slate-700/40 transition-colors text-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate flex items-center gap-2">
                          {item.name} 
                          {!item.available && (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                              Unavailable
                            </Badge>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {item.description || 'No description'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-amber-400 font-semibold text-xs">
                          ${item.price.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {item.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button 
                        onClick={() => toggleAvailability(item.id)} 
                        className={`px-2 py-1 rounded border font-medium ${
                          item.available 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30' 
                            : 'bg-slate-600/40 text-slate-200 border-slate-600 hover:bg-slate-600/60'
                        }`}
                      >
                        {item.available ? 'Available' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => startEdit(item.id)} 
                        className="px-2 py-1 rounded border border-slate-600 bg-slate-700/40 text-slate-200 hover:bg-slate-600/60"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => confirmDelete(item.id)} 
                        className="px-2 py-1 rounded border border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-xs text-slate-500 py-10 text-center">
                    No items match filters
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Form / Meta */}
          <div className="space-y-6">
            {/* Form Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingId ? 'Edit Item' : 'Create Item'}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {editingId ? 'Modify existing menu entry' : 'Add a new menu item'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!showForm && (
                  <div className="text-xs text-slate-500">
                    Click <span className="text-amber-400 font-medium">Add Item</span> or Edit on an existing row to begin.
                  </div>
                )}
                {showForm && (
                  <form 
                    onSubmit={e => { e.preventDefault(); commitForm(); }} 
                    className="space-y-3 text-sm"
                  >
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-slate-400">
                        Name
                      </label>
                      <input 
                        value={draft.name} 
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} 
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wide text-slate-400">
                        Description
                      </label>
                      <textarea 
                        value={draft.description} 
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} 
                        rows={3} 
                        className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400" 
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400">
                          Price
                        </label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          value={draft.price} 
                          onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} 
                          className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400" 
                          required 
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] uppercase tracking-wide text-slate-400">
                          Category
                        </label>
                        <select 
                          value={draft.category} 
                          onChange={e => setDraft(d => ({ ...d, category: e.target.value as Category }))} 
                          className="w-full px-3 py-2 rounded bg-slate-700/50 border border-slate-600 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                        >
                          {categories.map(c => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        id="available" 
                        type="checkbox" 
                        checked={draft.available} 
                        onChange={e => setDraft(d => ({ ...d, available: e.target.checked }))} 
                        className="h-4 w-4" 
                      />
                      <label htmlFor="available" className="text-xs text-slate-300">
                        Available
                      </label>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        type="submit" 
                        className="flex-1 bg-amber-500 text-black hover:bg-amber-600 font-semibold"
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Item')}
                      </Button>
                      <Button 
                        type="button" 
                        onClick={cancelForm} 
                        variant="outline"
                        className="bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Insights Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Insights</CardTitle>
                <CardDescription className="text-slate-400">Simple stats</CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Items</span>
                  <span className="text-slate-200">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available</span>
                  <span className="text-emerald-300">{items.filter(i => i.available).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unavailable</span>
                  <span className="text-red-300">{items.filter(i => !i.available).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Avg Price</span>
                  <span className="text-slate-200">
                    ${items.length > 0 ? (items.reduce((s, i) => s + i.price, 0) / items.length).toFixed(2) : '0.00'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to permanently delete this menu item? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDeleteId(null)} 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={performDelete} 
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
