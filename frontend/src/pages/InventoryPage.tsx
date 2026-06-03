import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, X, TrendingUp, TrendingDown, SlidersHorizontal, Package, AlertTriangle, Download } from 'lucide-react'
import { alertService, inventoryService, productService, storeService } from '../services/api'
import type { InventoryTransaction, Product, Store, StoreInventory } from '../types'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'
import Pagination from '../components/common/Pagination'
import { downloadCurrentStockListPdf, downloadPdf, isBetweenDates, isWithinLastHours, paginate } from '../utils/tableTools'
import { requiredNumber } from '../utils/validation'

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
  const [downloadModal, setDownloadModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [txnPage, setTxnPage] = useState(1)
  const [stockPage, setStockPage] = useState(1)
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<any>()
  const downloadForm = useForm<{ start: string; end: string }>()

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
      // For inventory managers, always attach their store_id from their store inventory
      // This handles cases where store_id may not be on the user JWT profile
      const storeId = isManager && storeInventory.length > 0
        ? storeInventory[0].store_id
        : data.store_id

      await inventoryService.createTransaction({
        ...data,
        quantity: parseInt(data.quantity),
        store_id: storeId || data.store_id,
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

  const recent24 = transactions.filter(t => isWithinLastHours(t.timestamp, 24))
  const filtered = filterType === 'all' ? recent24 : recent24.filter(t => t.transaction_type === filterType)
  const pagedTransactions = paginate(filtered, txnPage, 10)
  const pagedManagerStock = paginate(storeInventory, stockPage, 6)
  const pagedWarehouseProducts = paginate(products, stockPage, 5)

  const exportTransactions = ({ start, end }: { start: string; end: string }) => {
    const rows = transactions.filter(txn => isBetweenDates(txn.timestamp, start, end))
    downloadPdf('transactions', rows, [
      { label: 'Date', value: row => format(new Date(row.timestamp), 'yyyy-MM-dd HH:mm') },
      { label: 'Product', value: row => row.product?.product_name },
      { label: 'SKU', value: row => row.product?.sku },
      { label: 'Store', value: row => row.store ? `${row.store.name} - ${row.store.location}` : 'Warehouse' },
      { label: 'Type', value: row => row.transaction_type },
      { label: 'Quantity', value: row => row.quantity },
      { label: 'Updated By', value: row => row.updated_by_user?.name },
      { label: 'Notes', value: row => row.notes },
    ], 'Inventory Transactions')
    setDownloadModal(false)
    downloadForm.reset()
  }

  const exportStock = () => {
    const rows = isAdmin ? storeInventory : storeInventory
    downloadCurrentStockListPdf('current-stock-list', rows.map(row => ({
      product: {
        product_name: row.product?.product_name,
        sku: row.product?.sku,
      },
      store: {
        name: row.store?.name,
        location: row.store?.location,
      },
      quantity: Number(row.quantity ?? 0),
      low_stock_threshold: Number(row.low_stock_threshold ?? 0),
      status: row.quantity <= row.low_stock_threshold ? 'Low Stock' : 'OK',
    })), 'Current Stock List')
  }

  // Inventory manager: show their store's stock
  if (isManager) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">My Store Inventory</h1>
            <p className="text-slate-500 text-sm mt-0.5">Products assigned to your store</p>
          </div>
          <button onClick={() => { reset(); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
            <Plus size={15} /> Record Transaction
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {Object.entries(typeConfig).map(([type, cfg]) => {
            const count = recent24.filter(t => t.transaction_type === type).length
            const Icon = cfg.icon
            return (
              <button key={type} onClick={() => { setFilterType(filterType === type ? 'all' : type); setTxnPage(1) }}
                className={`p-5 rounded-lg border transition-all text-left ${filterType === type ? `${cfg.bg} border-current` : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon size={18} className={cfg.color} />
                  <span className={`text-3xl font-bold ${cfg.color}`}>{count}</span>
                </div>
                <div className="text-sm text-slate-600">{cfg.label}</div>
              </button>
            )
          })}
        </div>

        {/* Store stock table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Current Stock</h2>
            <button onClick={exportStock} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-950">
              <Download size={13} /> Download Stock
            </button>
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
                ) : pagedManagerStock.pageItems.map(item => {
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
          <Pagination page={pagedManagerStock.safePage} totalPages={pagedManagerStock.totalPages} totalItems={storeInventory.length} pageSize={6} onPageChange={setStockPage} />
        </div>

        {/* Recent transactions */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Recent Transactions · Last 24 Hours</h2>
            <button onClick={() => setDownloadModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-950">
              <Download size={13} /> Download
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {pagedTransactions.pageItems.map(txn => {
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
            {filtered.length === 0 && !loading && (
              <div className="py-10 text-center text-sm text-slate-400">No recent activity</div>
            )}
          </div>
          <Pagination page={pagedTransactions.safePage} totalPages={pagedTransactions.totalPages} totalItems={filtered.length} pageSize={10} onPageChange={setTxnPage} />
        </div>

        {showModal && <TransactionModal
          products={storeInventory.map(i => i.product!).filter(Boolean)}
          storeInventory={storeInventory}
          onClose={() => setShowModal(false)}
          onSubmit={onSubmit}
          register={register}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          showStore={false}
          stores={[]}
        />}
        {downloadModal && <DownloadModal form={downloadForm} onClose={() => setDownloadModal(false)} onSubmit={exportTransactions} />}
      </div>
    )
  }

  // Retailer admin view: warehouse stock + transactions
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Warehouse stock and all transactions</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={15} /> New Transaction
        </button>
      </div>

      {/* Transaction summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(typeConfig).map(([type, cfg]) => {
          const count = transactions.filter(t => t.transaction_type === type).length
          const Icon = cfg.icon
          return (
            <button key={type} onClick={() => { setFilterType(filterType === type ? 'all' : type); setTxnPage(1) }}
              className={`p-5 rounded-lg border transition-all text-left ${filterType === type ? `${cfg.bg} border-current` : 'bg-white border-slate-200 hover:border-slate-300'}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon size={16} className={cfg.color} />
                <span className={`text-3xl font-bold ${cfg.color}`}>{count}</span>
              </div>
              <div className="text-sm text-slate-600">{cfg.label}</div>
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Warehouse stock */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Warehouse Stock</h2>
              <p className="text-xs text-slate-400">First 5 products · qty remaining in warehouse</p>
            </div>
            <button onClick={exportStock} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-950">
              <Download size={13} /> Download Stock
            </button>
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
                ) : pagedWarehouseProducts.pageItems.map(p => (
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
                    <td className="px-4 py-3"><span className={`text-sm font-semibold ${p.quantity <= 0 ? 'text-red-500' : p.quantity <= 50 ? 'text-amber-500' : 'text-slate-900'}`}>{p.quantity}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-700">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.category || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagedWarehouseProducts.safePage} totalPages={pagedWarehouseProducts.totalPages} totalItems={products.length} pageSize={5} onPageChange={setStockPage} />
        </div>

      {/* Transactions list */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">{filterType === 'all' ? 'Transactions · Last 24 Hours' : `${typeConfig[filterType]?.label} · Last 24 Hours`}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setDownloadModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-950">
              <Download size={13} /> Download
            </button>
            {filterType !== 'all' && (
              <button onClick={() => setFilterType('all')} className="text-xs text-slate-500 hover:text-slate-950 flex items-center gap-1">
                <X size={12} /> Clear
              </button>
            )}
          </div>
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
            <div className="text-center py-16 text-slate-400"><SlidersHorizontal size={28} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No recent activity</p></div>
          ) : pagedTransactions.pageItems.map(txn => {
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
        <Pagination page={pagedTransactions.safePage} totalPages={pagedTransactions.totalPages} totalItems={filtered.length} pageSize={10} onPageChange={setTxnPage} />
      </div>
      </div>

      {showModal && <TransactionModal products={products} onClose={() => setShowModal(false)} onSubmit={onSubmit} register={register} handleSubmit={handleSubmit} isSubmitting={isSubmitting} errors={errors} showStore={isAdmin} stores={stores} />}
      {downloadModal && <DownloadModal form={downloadForm} onClose={() => setDownloadModal(false)} onSubmit={exportTransactions} />}
    </div>
  )
}

function TransactionModal({ products, storeInventory = [], onClose, onSubmit, register, handleSubmit, isSubmitting, showStore, stores, errors, watch }: any) {
  const ErrorText = ({ name }: { name: string }) => errors?.[name] ? <p className="text-xs text-red-500 mt-1">{String(errors[name]?.message || 'This field is mandatory')}</p> : null

  // Build a map of product_id → current store quantity for live feedback
  const stockMap: Record<string, number> = {}
  storeInventory.forEach((item: any) => {
    if (item.product?.id) stockMap[item.product.id] = item.quantity
  })

  return (
    <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">Record Transaction</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Product</label>
            <select {...register('product_id', { required: 'Product is mandatory' })}
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
              <option value="">Select product</option>
              {products.map((p: Product) => {
                const qty = stockMap[p.id]
                return (
                  <option key={p.id} value={p.id}>
                    {p.product_name} (SKU: {p.sku}){qty !== undefined ? ` — ${qty} in store` : ''}
                  </option>
                )
              })}
            </select>
            <ErrorText name="product_id" />
          </div>
          {showStore && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Store</label>
              <select {...register('store_id', { required: 'Store is mandatory' })}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
                <option value="">Select store</option>
                {stores.map((s: Store) => <option key={s.id} value={s.id}>{s.name} · {s.location}</option>)}
              </select>
              <ErrorText name="store_id" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Transaction Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'stock_in', label: 'Stock In', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
                { value: 'stock_out', label: 'Stock Out', color: 'border-red-400 bg-red-50 text-red-700' },
                { value: 'adjustment', label: 'Adjustment', color: 'border-amber-400 bg-amber-50 text-amber-700' },
              ].map(opt => (
                <label key={opt.value} className="cursor-pointer">
                  <input type="radio" value={opt.value} {...register('transaction_type', { required: true })} className="sr-only peer" />
                  <div className={`text-center text-xs font-semibold py-2 rounded-lg border-2 border-slate-200 bg-slate-50 text-slate-500 peer-checked:${opt.color} transition-all`}>
                    {opt.label}
                  </div>
                </label>
              ))}
            </div>
            <ErrorText name="transaction_type" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity</label>
            <input {...register('quantity', requiredNumber('Quantity', 1))} type="number" min="1" placeholder="0"
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
            <ErrorText name="quantity" />
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

function DownloadModal({ form, onClose, onSubmit }: any) {
  return (
    <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-950">Download Transactions</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Start date</label>
            <input {...form.register('start', { required: 'Start date is mandatory' })} type="date" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            {form.formState.errors.start && <p className="text-xs text-red-500 mt-1">{String(form.formState.errors.start.message)}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">End date</label>
            <input {...form.register('end', { required: 'End date is mandatory' })} type="date" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            {form.formState.errors.end && <p className="text-xs text-red-500 mt-1">{String(form.formState.errors.end.message)}</p>}
          </div>
          <button className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium">Download PDF</button>
        </form>
      </div>
    </div>
  )
}
