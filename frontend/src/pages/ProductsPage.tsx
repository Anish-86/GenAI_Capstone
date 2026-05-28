import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Package, Pencil, Trash2, X, AlertTriangle, PackagePlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { alertService, inventoryService, productService, storeService } from '../services/api'
import type { Product, PaginatedProducts, Store, StoreInventory } from '../types'
import { useAuthStore } from '../store/authStore'
import { useDebounce } from '../hooks/useDebounce'
import { requiredNumber } from '../utils/validation'

export default function ProductsPage() {
  const { user } = useAuthStore()
  const [data, setData] = useState<PaginatedProducts | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const debouncedSearch = useDebounce(search, 350)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [addStockProduct, setAddStockProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [stores, setStores] = useState<Store[]>([])
  const [storeInventory, setStoreInventory] = useState<StoreInventory[]>([])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>()
  const assignForm = useForm<any>()
  const addStockForm = useForm<{ quantity: number }>()
  const assignProductId = assignForm.watch('product_id')
  const assignStoreId = assignForm.watch('store_id')
  const existingStoreStock = storeInventory.find(item => item.product_id === assignProductId && item.store_id === assignStoreId)

  const load = async (pg = page, q = search, selectedCategory = category) => {
    setLoading(true)
    try {
      const { data: res } = await productService.list({ page: pg, search: q || undefined, category: selectedCategory || undefined, page_size: 10 })
      setData(res)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page, debouncedSearch, category) }, [page, debouncedSearch, category])
  useEffect(() => {
    productService.list({ page_size: 500 })
      .then(({ data }) => setCategories(Array.from(new Set((data.items || []).map((p: Product) => p.category).filter(Boolean))) as string[]))
      .catch(() => setCategories([]))
  }, [])
  useEffect(() => {
    if (user?.role === 'retailer_admin') {
      storeService.list().then(({ data }) => setStores(data)).catch(() => setStores([]))
      inventoryService.storeInventory().then(({ data }) => setStoreInventory(data)).catch(() => setStoreInventory([]))
    }
  }, [user?.role])

  useEffect(() => {
    if (existingStoreStock) {
      assignForm.setValue('low_stock_threshold', existingStoreStock.low_stock_threshold)
    }
  }, [assignForm, existingStoreStock])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(1, search, category)
  }

  const openCreate = () => { reset({}); setEditProduct(null); setShowModal(true) }
  const openEdit = (p: Product) => {
    reset(user?.role === 'inventory_manager' ? { quantity: p.quantity, warehouse_location: p.warehouse_location } : p)
    setEditProduct(p)
    setShowModal(true)
  }

  const onSubmit = async (formData: any) => {
    try {
      if (editProduct) {
        const payload = user?.role === 'inventory_manager'
          ? { quantity: parseInt(formData.quantity), warehouse_location: formData.warehouse_location }
          : formData
        await productService.update(editProduct.id, payload)
        toast.success('Product updated')
      } else {
        await productService.create(formData)
        toast.success('Product created')
      }
      setShowModal(false)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Error saving product')
    }
  }

  const raiseLowStockAlert = async (product: Product) => {
    try {
      await alertService.create({
        product_id: product.id,
        message: `${product.product_name} is low on stock at ${product.quantity} units.`,
      })
      toast.success('Low stock alert raised')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to raise alert')
    }
  }

  const assignStock = async (data: any) => {
    try {
      const existing = storeInventory.find(item => item.product_id === data.product_id && item.store_id === data.store_id)
      if (!existing && Number(data.low_stock_threshold) > Number(data.quantity)) {
        assignForm.setError('low_stock_threshold', { message: 'Threshold cannot be greater than assigned quantity' })
        return
      }
      const payload: Record<string, any> = {
        product_id: data.product_id,
        store_id: data.store_id,
        quantity: parseInt(data.quantity),
      }
      if (!existing && data.low_stock_threshold) {
        payload.low_stock_threshold = parseInt(data.low_stock_threshold)
      }
      await inventoryService.assignStoreInventory(payload)
      toast.success('Stock assigned to store — warehouse qty updated')
      assignForm.reset()
      const [{ data: inventoryData }] = await Promise.all([
        inventoryService.storeInventory(),
        load(),
      ])
      setStoreInventory(inventoryData)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to assign stock')
    }
  }

  const handleAddStock = async (data: { quantity: number }) => {
    if (!addStockProduct) return
    try {
      await inventoryService.addWarehouseStock(addStockProduct.id, Number(data.quantity))
      toast.success(`Added ${data.quantity} units to warehouse — new total updated`)
      setAddStockProduct(null)
      addStockForm.reset()
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add stock')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    setDeleting(id)
    try {
      await productService.delete(id)
      toast.success('Product deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const stockBadge = (qty: number) => {
    if (qty === 0) return 'bg-red-500/10 text-red-400 border border-red-500/20'
    if (qty <= 10) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Products</h1>
          <p className="text-slate-500 text-sm mt-0.5">{data?.total ?? 0} products in inventory</p>
        </div>
        {user?.role === 'retailer_admin' && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
            <Plus size={15} /> Add Product
          </button>
        )}
      </div>

      {/* Filters */}
      {user?.role === 'retailer_admin' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-900 mb-3">Assign Product Quantity to Store</div>
          <form onSubmit={assignForm.handleSubmit(assignStock)} className="grid md:grid-cols-5 gap-3">
            <div>
              <select {...assignForm.register('product_id', { required: 'Product is mandatory' })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Product</option>
                {data?.items.map(product => <option key={product.id} value={product.id}>{product.product_name}</option>)}
              </select>
              {assignForm.formState.errors.product_id && <p className="text-xs text-red-500 mt-1">{String(assignForm.formState.errors.product_id.message)}</p>}
            </div>
            <div>
              <select {...assignForm.register('store_id', { required: 'Store is mandatory' })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Store</option>
                {stores.map(store => <option key={store.id} value={store.id}>{store.name} · {store.location}</option>)}
              </select>
              {assignForm.formState.errors.store_id && <p className="text-xs text-red-500 mt-1">{String(assignForm.formState.errors.store_id.message)}</p>}
            </div>
            <div>
              <input {...assignForm.register('quantity', requiredNumber('Quantity', 1))} type="number" min="1" placeholder="Quantity" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              {assignForm.formState.errors.quantity && <p className="text-xs text-red-500 mt-1">{String(assignForm.formState.errors.quantity.message)}</p>}
            </div>
            <div>
              <input
                {...assignForm.register('low_stock_threshold', existingStoreStock ? {} : requiredNumber('Threshold', 1))}
                type="number"
                min="1"
                placeholder={existingStoreStock ? 'Existing threshold' : 'Threshold'}
                disabled={Boolean(existingStoreStock)}
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:text-slate-500 disabled:cursor-not-allowed"
              />
              {assignForm.formState.errors.low_stock_threshold && <p className="text-xs text-red-500 mt-1">{String(assignForm.formState.errors.low_stock_threshold.message)}</p>}
            </div>
            <button className="rounded-lg bg-teal-600 text-white text-sm font-medium">Assign</button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex-1 relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </form>
        <div className="relative w-full sm:w-56">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500 transition-colors"
          >
            <option value="">All categories</option>
            {categories.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              {['Product', 'SKU', 'Category', 'Stock', 'Price', 'Location', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-400">No products found</td></tr>
            ) : data?.items.map(product => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-teal-600" />
                    </div>
                    <div>
                      <Link to={`/products/${product.id}`} className="text-sm font-medium text-slate-950 hover:text-teal-600 transition-colors">
                        {product.product_name}
                      </Link>
                      <div className="text-xs text-slate-400">{product.brand || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5"><span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{product.sku}</span></td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{product.category || '—'}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stockBadge(product.quantity)}`}>
                    {product.quantity} units
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-700 font-medium">${product.price.toFixed(2)}</td>
                <td className="px-4 py-3.5 text-sm text-slate-500">{product.warehouse_location || '—'}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user?.role === 'retailer_admin' && (
                      <button onClick={() => { addStockForm.reset(); setAddStockProduct(product) }}
                        className="p-1.5 hover:bg-teal-500/10 rounded-md text-slate-600 hover:text-teal-600 transition-colors"
                        title="Add stock to warehouse">
                        <PackagePlus size={13} />
                      </button>
                    )}
                    {user?.role !== 'super_admin' && (
                      <button onClick={() => openEdit(product)}
                        className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-950 transition-colors">
                        <Pencil size={13} />
                      </button>
                    )}
                    {user?.role === 'inventory_manager' && product.quantity <= 10 && (
                      <button onClick={() => raiseLowStockAlert(product)}
                        className="p-1.5 hover:bg-amber-500/10 rounded-md text-slate-600 hover:text-amber-500 transition-colors"
                        title="Raise low stock alert">
                        <AlertTriangle size={13} />
                      </button>
                    )}
                    {user?.role === 'retailer_admin' && (
                      <button onClick={() => handleDelete(product.id)} disabled={deleting === product.id}
                        className="p-1.5 hover:bg-red-500/10 rounded-md text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">Page {data.page} of {data.total_pages} · {data.total} results</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <button disabled={page >= data.total_pages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">{editProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {(user?.role === 'inventory_manager' ? [
                  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
                  { name: 'warehouse_location', label: 'Warehouse Location' },
                ] : [
                  { name: 'product_name', label: 'Product Name', required: true },
                  { name: 'sku', label: 'SKU', required: true },
                  { name: 'category', label: 'Category' },
                  { name: 'brand', label: 'Brand' },
                  { name: 'price', label: 'Price', type: 'number', required: true },
                  { name: 'quantity', label: 'Quantity', type: 'number', required: true },
                  { name: 'supplier', label: 'Supplier' },
                  { name: 'warehouse_location', label: 'Warehouse Location' },
                ]).map(field => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">{field.label}</label>
                    <input
                      {...register(field.name as any, field.type === 'number' ? requiredNumber(field.label, field.name === 'quantity' ? 0 : 1) : { required: field.required ? `${field.label} is mandatory` : false })}
                      type={field.type || 'text'}
                      step={field.type === 'number' ? '0.01' : undefined}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                    {(errors as any)[field.name] && <p className="text-red-400 text-xs mt-1">{(errors as any)[field.name]?.message}</p>}
                  </div>
                ))}
              </div>
              {user?.role !== 'inventory_manager' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                  <textarea {...register('description')} rows={3}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors resize-none" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:text-slate-950 hover:border-slate-300 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {isSubmitting ? 'Saving...' : (editProduct ? 'Update' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Stock Modal */}
      {addStockProduct && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Add Stock to Warehouse</h2>
                <p className="text-xs text-slate-500 mt-0.5">{addStockProduct.product_name}</p>
              </div>
              <button onClick={() => setAddStockProduct(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={addStockForm.handleSubmit(handleAddStock)} className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                <span className="text-sm text-slate-600">Current warehouse stock</span>
                <span className="text-sm font-bold text-slate-900">{addStockProduct.quantity} units</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity to Add</label>
                <input
                  {...addStockForm.register('quantity', { required: true, min: 1 })}
                  type="number" min="1" placeholder="e.g. 500"
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                />
                {addStockForm.formState.errors.quantity && <p className="text-xs text-red-500 mt-1">Quantity is mandatory</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setAddStockProduct(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:text-slate-950">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
                  Add to Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
