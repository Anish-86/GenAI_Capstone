import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, TrendingUp, TrendingDown, SlidersHorizontal, Package, AlertTriangle } from 'lucide-react'
import { alertService, inventoryService, productService, storeService } from '../services/api'
import type { InventoryTransaction, Product, Store, StoreInventory } from '../types'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'

const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  stock_in: { label: 'Stock In', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20' },
  stock_out: { label: 'Stock Out', icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10 border-red-500/20' },
  adjustment: { label: 'Adjustment', icon: SlidersHorizontal, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-500/20' },
}

export default function InventoryPage() {
  const { user: currentUser } = useAuthStore()
  const isManager = currentUser?.role === 'inventory_manager'
  const isAdmin = currentUser?.role === 'retailer_admin'

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [storeInventory, setStoreInventory] = useState<StoreInventory[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>()

  const load = async () => {
    setLoading(true)
    try {
      const calls: Promise<any>[] = [
        inventoryService.transactions({ limit: 200 }),
        productService.list({ page_size: 200 }),
        inventoryService.storeInventory(),
      ]
      if (isAdmin) calls.push(storeService.list())
      const [txnRes, prodRes, stockRes, storeRes] = await Promise.all(calls)
      setTransactions(txnRes.data)
      setProducts(prodRes.data.items)
      setStoreInventory(stockRes.data)
      if (storeRes) setStores(storeRes.data)
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [currentUser?.role])

  const onSubmit = async (data: any) => {
    try {
      await inventoryService.createTransaction({
        ...data,
        quantity: parseInt(data.quantity),
      })
      toast.success('Transaction recorded')
      setShowModal(false)
      reset()
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error creating transaction')
    }
  }

  const raiseAlert = async (productId: string) => {
    try {
      await alertService.create({ product_id: productId })
      toast.success('Low stock alert raised — retailer admin notified')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to raise alert')
    }
  }

  const filtered = filterType === 'all' ? transactions : transactions.filter(t => t.transaction_type === filterType)

  // Inventory manager: show their store's stock
  if (isManager) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">My Store Inventory</h1>
            <p className="text-slate-500 text-sm mt-0.5">Products assigned to your store</p>
          </div>
          <button onClick={() => { reset(); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
            <Plus size={15} /> Record Transaction
          </button>
        </div>

        {/* Store stock table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Current Stock</h2>
            <span className="text-xs text-slate-400">{storeInventory.length} products</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Product', 'SKU', 'Qty in Store', 'Low Stock At', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                  ))
                ) : storeInventory.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">No products assigned to your store yet</td></tr>
                ) : storeInventory.map(item => {
                  const isLow = item.quantity <= item.low_stock_threshold
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center">
                            <Package size={13} className="text-teal-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-950">{item.product?.product_name}</div>
                            <div className="text-xs text-slate-400">{item.product?.brand || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{item.product?.sku}</span></td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.low_stock_threshold}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${isLow ? 'bg-red-50 text-red-500 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {isLow ? 'Low Stock' : 'OK'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLow && item.product && (
                          <button onClick={() => raiseAlert(item.product!.id)}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors">
                            <AlertTriangle size={11} /> Raise Alert
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-medium text-slate-700">Recent Transactions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 20).map(txn => {
              const cfg = typeConfig[txn.transaction_type]
              const Icon = cfg?.icon || SlidersHorizontal
              return (
                <div key={txn.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg?.bg}`}>
                    <Icon size={14} className={cfg?.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-950">{txn.product?.product_name || 'Product'}</div>
                    <div className="text-xs text-slate-500">{format(new Date(txn.timestamp), 'MMM d, yyyy HH:mm')}{txn.notes && ` · ${txn.notes}`}</div>
                  </div>
                  <div className={`text-sm font-semibold ${cfg?.color}`}>
                    {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '−' : '~'}{txn.quantity}
                  </div>
                </div>
              )
            })}
            {transactions.length === 0 && !loading && (
              <div className="py-10 text-center text-sm text-slate-400">No transactions yet</div>
            )}
          </div>
        </div>

        {showModal && <TransactionModal products={storeInventory.map(i => i.product!).filter(Boolean)} onClose={() => setShowModal(false)} onSubmit={onSubmit} register={register} handleSubmit={handleSubmit} isSubmitting={isSubmitting} showStore={false} stores={[]} />}
      </div>
    )
  }

  // Retailer admin view: warehouse stock + transactions
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Warehouse stock and all transactions</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={15} /> New Transaction
        </button>
      </div>

      {/* Warehouse stock */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Warehouse Stock</h2>
          <span className="text-xs text-slate-400">{products.length} products · qty = remaining in warehouse after store distribution</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Product', 'SKU', 'Warehouse Qty', 'Price', 'Category'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                ))
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-14 text-center text-sm text-slate-400">No products yet. Create products first.</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center">
                        <Package size={13} className="text-teal-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-950">{p.product_name}</div>
                        <div className="text-xs text-slate-400">{p.brand || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{p.sku}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${p.quantity <= 0 ? 'text-red-500' : p.quantity <= 50 ? 'text-amber-500' : 'text-slate-900'}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">${p.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.category || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(typeConfig).map(([type, cfg]) => {
          const count = transactions.filter(t => t.transaction_type === type).length
          const Icon = cfg.icon
          return (
            <button key={type} onClick={() => setFilterType(filterType === type ? 'all' : type)}
              className={`p-4 rounded-lg border transition-all text-left ${filterType === type ? `${cfg.bg} border-current` : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} className={cfg.color} />
                <span className={`text-2xl font-bold ${cfg.color}`}>{count}</span>
              </div>
              <div className="text-sm text-slate-600">{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Transactions list */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">{filterType === 'all' ? 'All Transactions' : typeConfig[filterType]?.label}</h2>
          {filterType !== 'all' && (
            <button onClick={() => setFilterType('all')} className="text-xs text-slate-500 hover:text-slate-950 flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                <div className="flex-1"><div className="h-3.5 w-48 bg-slate-100 rounded animate-pulse mb-1.5" /><div className="h-2.5 w-28 bg-slate-100/80 rounded animate-pulse" /></div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><SlidersHorizontal size={28} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No transactions</p></div>
          ) : filtered.map(txn => {
            const cfg = typeConfig[txn.transaction_type]
            const Icon = cfg?.icon || SlidersHorizontal
            return (
              <div key={txn.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg?.bg}`}>
                  <Icon size={15} className={cfg?.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-950 truncate">{txn.product?.product_name || 'Product'}</div>
                  <div className="text-xs text-slate-500">
                    by {txn.updated_by_user?.name || 'User'} · {txn.store ? txn.store.location : 'Warehouse'} · {format(new Date(txn.timestamp), 'MMM d, yyyy HH:mm')}
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
      </div>

      {showModal && <TransactionModal products={products} onClose={() => setShowModal(false)} onSubmit={onSubmit} register={register} handleSubmit={handleSubmit} isSubmitting={isSubmitting} showStore={isAdmin} stores={stores} />}
    </div>
  )
}

function TransactionModal({ products, onClose, onSubmit, register, handleSubmit, isSubmitting, showStore, stores }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">Record Transaction</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Product</label>
            <select {...register('product_id', { required: true })}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
              <option value="">Select product</option>
              {products.map((p: Product) => <option key={p.id} value={p.id}>{p.product_name} (SKU: {p.sku})</option>)}
            </select>
          </div>
          {showStore && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Store</label>
              <select {...register('store_id', { required: true })}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
                <option value="">Select store</option>
                {stores.map((s: Store) => <option key={s.id} value={s.id}>{s.name} · {s.location}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
            <select {...register('transaction_type', { required: true })}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
              <option value="stock_in">Stock In</option>
              <option value="stock_out">Stock Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity</label>
            <input {...register('quantity', { required: true, min: 1 })} type="number" min="1" placeholder="0"
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
            <textarea {...register('notes')} rows={2} placeholder="Add a note..."
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:text-slate-950">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium">
              {isSubmitting ? 'Saving...' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
