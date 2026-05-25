import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, MapPin, ArrowLeft, Package, Users, Activity, TrendingUp, TrendingDown, SlidersHorizontal, X } from 'lucide-react'
import { inventoryService, productService, storeService } from '../services/api'
import type { InventoryTransaction, Product, Store, StoreInventory, User } from '../types'
import { format } from 'date-fns'

const txnIcon: Record<string, any> = {
  stock_in: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Stock In' },
  stock_out: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', label: 'Stock Out' },
  adjustment: { icon: SlidersHorizontal, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', label: 'Adjustment' },
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [selected, setSelected] = useState<Store | null>(null)
  const [managers, setManagers] = useState<User[]>([])
  const [inventory, setInventory] = useState<StoreInventory[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab, setTab] = useState<'inventory' | 'history'>('inventory')
  const storeForm = useForm<any>()
  const assignForm = useForm<any>({ defaultValues: { low_stock_threshold: 50 } })
  const assignProductId = assignForm.watch('product_id')
  const existingAssignedStock = inventory.find(item => item.product_id === assignProductId)

  const loadStores = async () => {
    setLoading(true)
    try {
      const storeRes = await storeService.list()
      setStores(storeRes.data)
      const prodRes = await productService.list({ page_size: 200 })
      setProducts(prodRes.data.items || [])
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const loadStoreDetail = async (store: Store) => {
    setSelected(store)
    setDetailLoading(true)
    try {
      const { data } = await storeService.details(store.id)
      setManagers(data.managers || [])
      setInventory(data.inventory || [])
      setTransactions(data.transactions || [])
    } catch { toast.error('Failed to load store details') }
    finally { setDetailLoading(false) }
  }

  useEffect(() => { loadStores() }, [])

  useEffect(() => {
    if (existingAssignedStock) {
      assignForm.setValue('low_stock_threshold', existingAssignedStock.low_stock_threshold)
    }
  }, [assignForm, existingAssignedStock])

  const createStore = async (data: any) => {
    try {
      await storeService.create(data)
      toast.success('Store created')
      storeForm.reset()
      loadStores()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const assignStock = async (data: any) => {
    try {
      const existing = inventory.find(item => item.product_id === data.product_id)
      const payload: Record<string, any> = {
        product_id: data.product_id,
        store_id: selected!.id,
        quantity: parseInt(data.quantity),
      }
      if (!existing && data.low_stock_threshold) {
        payload.low_stock_threshold = parseInt(data.low_stock_threshold)
      }
      await inventoryService.assignStoreInventory(payload)
      toast.success(`+${data.quantity} units sent to store — warehouse updated`)
      assignForm.reset()
      const [detailRes, prodRes] = await Promise.all([
        storeService.details(selected!.id),
        productService.list({ page_size: 200 }),
      ])
      setManagers(detailRes.data.managers || [])
      setInventory(detailRes.data.inventory || [])
      setTransactions(detailRes.data.transactions || [])
      setProducts(prodRes.data.items || [])
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const totalStoreValue = inventory.reduce((sum, item) => sum + item.quantity * (item.product?.price || 0), 0)

  if (selected) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-950 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-950">{selected.name}</h1>
            <p className="text-sm text-slate-500">{selected.location}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${selected.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {selected.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Products', inventory.length, Package],
            ['Managers', managers.length, Users],
            ['Total Units', inventory.reduce((s, i) => s + i.quantity, 0), Activity],
            ['Stock Value', `$${totalStoreValue.toLocaleString()}`, TrendingUp],
          ].map(([label, value, Icon]: any) => (
            <div key={label} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-teal-600" />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Assign stock */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Send Stock from Warehouse to Store</h2>
          <p className="text-xs text-slate-400 mb-3">Quantity is additive — adds to existing store stock. Warehouse qty decreases accordingly.</p>
          <form onSubmit={assignForm.handleSubmit(assignStock)} className="grid sm:grid-cols-4 gap-3">
            <select {...assignForm.register('product_id', { required: true })}
              className="sm:col-span-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
              <option value="">Select product</option>
              {products.map(p => {
                const existing = inventory.find(i => i.product_id === p.id)
                return (
                  <option key={p.id} value={p.id}>
                    {p.product_name} — {p.quantity} in warehouse{existing ? ` (${existing.quantity} already in store)` : ''}
                  </option>
                )
              })}
            </select>
            <input {...assignForm.register('quantity', { required: true, min: 1 })} type="number" min="1" placeholder="Qty to send"
              className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
            <div className="relative">
              <input
                {...assignForm.register('low_stock_threshold')}
                type="number"
                placeholder={existingAssignedStock ? 'Existing threshold' : 'Alert threshold'}
                disabled={Boolean(existingAssignedStock)}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <button className="sm:col-span-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
              Send to Store
            </button>
          </form>
        </div>

        {/* Managers */}
        {managers.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Users size={15} className="text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-900">Inventory Managers ({managers.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {managers.map(m => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.email}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs: Inventory / History */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex border-b border-slate-200">
            {(['inventory', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium transition-colors capitalize ${tab === t ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-900'}`}>
                {t === 'inventory' ? `Current Stock (${inventory.length})` : `History (${transactions.length})`}
              </button>
            ))}
          </div>

          {detailLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
          ) : tab === 'inventory' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Product', 'SKU', 'Store Qty', 'Low Stock At', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">No stock assigned to this store yet</td></tr>
                  ) : inventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{item.product?.product_name}</div>
                        <div className="text-xs text-slate-400">{item.product?.brand || ''}</div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{item.product?.sku}</span></td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.low_stock_threshold}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.quantity <= item.low_stock_threshold ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                          {item.quantity <= item.low_stock_threshold ? 'Low Stock' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">No history yet</div>
              ) : transactions.map(txn => {
                const cfg = txnIcon[txn.transaction_type]
                const Icon = cfg?.icon || Activity
                return (
                  <div key={txn.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg?.bg}`}>
                      <Icon size={14} className={cfg?.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{txn.product?.product_name || 'Product'}</div>
                      <div className="text-xs text-slate-500">
                        {cfg?.label} · by {txn.updated_by_user?.name || 'System'} · {format(new Date(txn.timestamp), 'MMM d, yyyy HH:mm')}
                        {txn.notes && <span className="text-slate-400"> · {txn.notes}</span>}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${cfg?.color}`}>
                      {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '−' : '~'}{txn.quantity}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Stores</h1>
          <p className="text-slate-500 text-sm mt-0.5">{stores.length} store locations</p>
        </div>
      </div>

      {/* Create store */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Create New Store</h2>
        <form onSubmit={storeForm.handleSubmit(createStore)} className="grid sm:grid-cols-3 gap-3">
          <input {...storeForm.register('name', { required: true })} placeholder="Store name"
            className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
          <input {...storeForm.register('location', { required: true })} placeholder="Location (e.g. Bangalore)"
            className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
          <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
            <Plus size={14} /> Create Store
          </button>
        </form>
      </div>

      {/* Store grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="h-5 w-36 bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3.5 w-24 bg-slate-100/80 rounded animate-pulse" />
            </div>
          ))
        ) : stores.length === 0 ? (
          <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-12 text-center">
            <MapPin size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No stores yet. Create your first store above.</p>
          </div>
        ) : stores.map(store => (
          <button key={store.id} onClick={() => loadStoreDetail(store)}
            className="bg-white border border-slate-200 rounded-lg p-5 text-left hover:border-teal-400 hover:shadow-sm transition-all group">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-950 group-hover:text-teal-700 transition-colors">{store.name}</div>
                <div className="text-xs text-slate-500">{store.location}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${store.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {store.status}
              </span>
            </div>
            <div className="text-xs text-slate-400">Created {format(new Date(store.created_at), 'MMM d, yyyy')} · Click to view details</div>
          </button>
        ))}
      </div>
    </div>
  )
}
