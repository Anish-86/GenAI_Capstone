import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, TrendingUp, TrendingDown, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { productService, inventoryService } from '../services/api'
import type { Product, InventoryTransaction } from '../types'
import { demoProducts, demoTransactions } from '../demoData'
import { format } from 'date-fns'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [pRes, tRes] = await Promise.all([
          productService.get(id),
          inventoryService.transactions({ product_id: id }),
        ])
        setProduct(pRes.data)
        setTransactions(tRes.data.length ? tRes.data : demoTransactions.filter(txn => txn.product_id === id))
      } catch {
        const demoProduct = demoProducts.find(product => product.id === id) || demoProducts[0]
        setProduct(demoProduct)
        setTransactions(demoTransactions.filter(txn => txn.product_id === demoProduct.id))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-6 w-32 bg-slate-100 rounded" />
      <div className="h-32 bg-white rounded-lg" />
    </div>
  )

  if (!product) return <div className="text-slate-500 text-center py-20">Product not found</div>

  const isLowStock = product.quantity <= 10

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">{product.product_name}</h1>
          <div className="text-xs font-mono text-slate-500 mt-0.5">SKU: {product.sku}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Product Details</h2>
          <dl className="space-y-3">
            {[
              { label: 'Category', value: product.category },
              { label: 'Brand', value: product.brand },
              { label: 'Supplier', value: product.supplier },
              { label: 'Warehouse', value: product.warehouse_location },
              { label: 'Price', value: `$${product.price.toFixed(2)}` },
              { label: 'Last Updated', value: format(new Date(product.updated_at), 'MMM d, yyyy') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="text-sm text-slate-800">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {product.description && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500 mb-1.5">Description</div>
              <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>

        {/* Stock */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Stock Status</h2>
          <div className={`rounded-lg p-5 border ${isLowStock ? 'bg-amber-400/5 border-amber-500/20' : 'bg-emerald-400/5 border-emerald-500/20'}`}>
            <div className={`text-4xl font-bold mb-1 ${isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
              {product.quantity}
            </div>
            <div className="text-sm text-slate-600">units available</div>
            {isLowStock && (
              <div className="flex items-center gap-1.5 mt-3 text-amber-400 text-xs">
                <AlertTriangle size={12} />
                Low stock — consider restocking
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-500 mb-2">Inventory Value</div>
            <div className="text-2xl font-semibold text-slate-950">${(product.price * product.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Transaction History</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No recent activity</div>
          ) : transactions.map(txn => {
            const typeIcon = { stock_in: TrendingUp, stock_out: TrendingDown, adjustment: SlidersHorizontal }
            const Icon = typeIcon[txn.transaction_type] || Package
            const colors = { stock_in: 'text-emerald-400', stock_out: 'text-red-400', adjustment: 'text-amber-400' }
            return (
              <div key={txn.id} className="flex items-center gap-4 px-5 py-3.5">
                <Icon size={15} className={colors[txn.transaction_type]} />
                <div className="flex-1">
                  <span className="text-sm text-slate-700 capitalize">{txn.transaction_type.replace('_', ' ')}</span>
                  {txn.notes && <span className="text-xs text-slate-400 ml-2">— {txn.notes}</span>}
                  <div className="text-xs text-slate-400 mt-0.5">
                    by {txn.updated_by_user?.name || 'user'} · {format(new Date(txn.timestamp), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${colors[txn.transaction_type]}`}>
                  {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '−' : '~'}{txn.quantity}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
