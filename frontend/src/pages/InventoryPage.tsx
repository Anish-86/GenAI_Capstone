import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, TrendingUp, TrendingDown, SlidersHorizontal, Package, ChevronRight, Users } from 'lucide-react'
import { inventoryService, productService, userService } from '../services/api'
import type { InventoryTransaction, Product, User } from '../types'
import { demoProducts, demoTransactions, demoUsers } from '../demoData'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'

const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  stock_in: { label: 'Stock In', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20' },
  stock_out: { label: 'Stock Out', icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-400/10 border-red-500/20' },
  adjustment: { label: 'Adjustment', icon: SlidersHorizontal, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-500/20' },
}

export default function InventoryPage() {
  const { user: currentUser } = useAuthStore()
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [retailerAdmins, setRetailerAdmins] = useState<User[]>([])
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>()

  const load = async () => {
    setLoading(true)
    try {
      if (currentUser?.role === 'super_admin') {
        const [userRes, prodRes] = await Promise.all([
          userService.list(),
          productService.list({ page_size: 100 }),
        ])
        setRetailerAdmins(userRes.data.filter((user: User) => user.role === 'retailer_admin'))
        setProducts(prodRes.data.items)
        setTransactions([])
        return
      }

      const [txnRes, prodRes] = await Promise.all([
        inventoryService.transactions(),
        productService.list({ page_size: 100 }),
      ])
      setTransactions(txnRes.data.length ? txnRes.data : demoTransactions)
      setProducts(prodRes.data.items.length ? prodRes.data.items : demoProducts)
    } catch {
      if (currentUser?.role === 'super_admin') {
        setRetailerAdmins(demoUsers.filter(user => user.role === 'retailer_admin'))
        setProducts(demoProducts)
        setTransactions([])
      } else {
        setTransactions(demoTransactions)
        setProducts(demoProducts)
      }
    } finally {
      setLoading(false)
    }
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

  const filtered = filterType === 'all' ? transactions : transactions.filter(t => t.transaction_type === filterType)
  const selectedAdmin = retailerAdmins.find(admin => admin.id === selectedAdminId) || null
  const productsForAdmin = selectedAdmin
    ? products.filter(product => product.tenant_id === selectedAdmin.tenant_id)
    : []
  const productCountForAdmin = (admin: User) => products.filter(product => product.tenant_id === admin.tenant_id).length
  const totalQuantityForAdmin = (admin: User) => products
    .filter(product => product.tenant_id === admin.tenant_id)
    .reduce((sum, product) => sum + product.quantity, 0)

  if (currentUser?.role === 'super_admin') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Retailer admins and their products</p>
        </div>

        {!selectedAdmin ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-medium text-slate-700">Retailer Admins</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-44 bg-slate-100 rounded animate-pulse mb-2" />
                      <div className="h-3 w-28 bg-slate-100/80 rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : retailerAdmins.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Users size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No retailer admins found</p>
                </div>
              ) : retailerAdmins.map(admin => (
                <button
                  key={admin.id}
                  onClick={() => setSelectedAdminId(admin.id)}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-sm font-semibold text-teal-700">
                    {admin.name.split(' ').map(name => name[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-950">{admin.name}</div>
                    <div className="text-xs text-slate-500 truncate">{admin.email}</div>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-right">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{productCountForAdmin(admin)}</div>
                      <div className="text-xs text-slate-400">products</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{totalQuantityForAdmin(admin)}</div>
                      <div className="text-xs text-slate-400">units</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedAdminId(null)} className="text-sm text-slate-600 hover:text-slate-950">
                Back to retailer admins
              </button>
              <div className="text-sm text-slate-500">{productsForAdmin.length} products</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <h2 className="text-sm font-medium text-slate-800">{selectedAdmin.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAdmin.email}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {['Product', 'SKU', 'Category', 'Stock', 'Price', 'Location'].map(header => (
                        <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productsForAdmin.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">No products found for this retailer admin</td>
                      </tr>
                    ) : productsForAdmin.map(product => (
                      <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center">
                              <Package size={14} className="text-teal-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-950">{product.product_name}</div>
                              <div className="text-xs text-slate-400">{product.brand || 'No brand'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{product.sku}</span></td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{product.category || '-'}</td>
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-800">{product.quantity} units</td>
                        <td className="px-4 py-3.5 text-sm text-slate-700">${product.price.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">{product.warehouse_location || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Inventory Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track all stock movements and adjustments</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={15} /> New Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(typeConfig).map(([type, cfg]) => {
          const count = transactions.filter(t => t.transaction_type === type).length
          const Icon = cfg.icon
          return (
            <button
              key={type}
              onClick={() => setFilterType(filterType === type ? 'all' : type)}
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
          <h2 className="text-sm font-medium text-slate-700">
            {filterType === 'all' ? 'All Transactions' : typeConfig[filterType]?.label}
          </h2>
          {filterType !== 'all' && (
            <button onClick={() => setFilterType('all')} className="text-xs text-slate-500 hover:text-slate-950 flex items-center gap-1 transition-colors">
              <X size={12} /> Clear filter
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3.5 w-48 bg-slate-100 rounded animate-pulse mb-1.5" />
                  <div className="h-2.5 w-28 bg-slate-100/80 rounded animate-pulse" />
                </div>
                <div className="h-3.5 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <SlidersHorizontal size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No transactions found</p>
            </div>
          ) : (
            filtered.map(txn => {
              const cfg = typeConfig[txn.transaction_type]
              const Icon = cfg?.icon || SlidersHorizontal
              return (
                <div key={txn.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${cfg?.bg || 'bg-slate-100'}`}>
                    <Icon size={15} className={cfg?.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-950 truncate">
                      {txn.product?.product_name || 'Product'}
                    </div>
                    <div className="text-xs text-slate-500">
                      by {txn.updated_by_user?.name || 'User'} · {format(new Date(txn.timestamp), 'MMM d, yyyy HH:mm')}
                      {txn.notes && <span className="text-slate-400"> · {txn.notes}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-semibold ${cfg?.color}`}>
                      {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '−' : '~'}{txn.quantity}
                    </div>
                    <div className="text-xs text-slate-400">units</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border hidden sm:inline ${cfg?.bg} ${cfg?.color}`}>
                    {cfg?.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">Record Transaction</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Product</label>
                <select {...register('product_id', { required: true })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500 transition-colors">
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.product_name} (SKU: {p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Transaction Type</label>
                <select {...register('transaction_type', { required: true })}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500 transition-colors">
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity</label>
                <input {...register('quantity', { required: true, min: 1 })} type="number" min="1" placeholder="0"
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
                <textarea {...register('notes')} rows={2} placeholder="Add a note..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:text-slate-950 transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {isSubmitting ? 'Saving...' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
