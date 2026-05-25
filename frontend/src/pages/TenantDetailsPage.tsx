import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Building2, Package, MapPin, AlertTriangle, Activity, MessageSquare, Plus, Power, Trash2 } from 'lucide-react'
import { inventoryService, storeService, tenantService, userService } from '../services/api'
import type { Complaint, InventoryTransaction, LowStockAlert, Product, Store, StoreInventory, Tenant, User } from '../types'
import { format } from 'date-fns'

export default function TenantDetailsPage() {
  const { id } = useParams()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [admins, setAdmins] = useState<User[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [inventory, setInventory] = useState<StoreInventory[]>([])
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const adminForm = useForm<any>({ defaultValues: { role: 'retailer_admin' } })
  const managerForm = useForm<any>({ defaultValues: { role: 'inventory_manager' } })
  const storeForm = useForm<any>()
  const assignForm = useForm<any>({ defaultValues: { low_stock_threshold: 10 } })

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detailsRes, storeRes, stockRes, txnRes] = await Promise.all([
        tenantService.details(id),
        storeService.list({ tenant_id: id }),
        inventoryService.storeInventory({ tenant_id: id }),
        inventoryService.transactions({ limit: 100 }),
      ])
      const details = detailsRes.data
      setTenant(details.tenant)
      setAdmins(details.retailer_admins || [])
      setManagers(details.inventory_managers || [])
      setProducts(details.products || [])
      setAlerts(details.alerts || [])
      setComplaints(details.complaints || [])
      setStores(storeRes.data)
      setInventory(stockRes.data)
      setTransactions(txnRes.data.filter((txn: InventoryTransaction) => txn.tenant_id === id))
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load tenant')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const tenantProducts = products

  const createStore = async (data: any) => {
    await storeService.create({ ...data, tenant_id: id })
    toast.success('Store created')
    storeForm.reset()
    load()
  }

  const createUser = async (data: any, role: 'retailer_admin' | 'inventory_manager') => {
    await userService.create({
      ...data,
      role,
      tenant_id: id,
      store_id: role === 'inventory_manager' ? data.store_id : undefined,
    })
    toast.success(role === 'retailer_admin' ? 'Retailer admin created' : 'Inventory manager created')
    adminForm.reset({ role: 'retailer_admin' })
    managerForm.reset({ role: 'inventory_manager' })
    load()
  }

  const assignStock = async (data: any) => {
    await inventoryService.assignStoreInventory({
      product_id: data.product_id,
      store_id: data.store_id,
      quantity: parseInt(data.quantity),
      low_stock_threshold: parseInt(data.low_stock_threshold || '10'),
    })
    toast.success('Store stock assigned')
    assignForm.reset({ low_stock_threshold: 10 })
    load()
  }

  const toggleUser = async (user: User) => {
    await userService.update(user.id, { is_active: !user.is_active })
    toast.success(user.is_active ? 'User deactivated' : 'User activated')
    load()
  }

  const deleteUser = async (user: User) => {
    if (!confirm('Delete this user? Their related store activity records will be cleaned up.')) return
    await userService.delete(user.id)
    toast.success('User deleted')
    load()
  }

  const Section = ({ title, icon: Icon, children }: any) => (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Icon size={16} className="text-teal-600" />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )

  const UserRows = ({ users }: { users: User[] }) => (
    <div className="divide-y divide-slate-100">
      {users.map(user => (
        <div key={user.id} className="py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{user.name}</div>
            <div className="text-xs text-slate-500">{user.email} · {user.phone || 'No phone'} · Last login {user.last_login ? format(new Date(user.last_login), 'MMM d, HH:mm') : 'never'}</div>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
          <button onClick={() => toggleUser(user)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><Power size={14} /></button>
          <button onClick={() => deleteUser(user)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
        </div>
      ))}
      {users.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No records</div>}
    </div>
  )

  if (loading) return <div className="text-sm text-slate-500">Loading tenant...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/tenants" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-2"><ArrowLeft size={14} /> Tenants</Link>
          <h1 className="text-xl font-semibold text-slate-950">{tenant?.company_name}</h1>
          <p className="text-sm text-slate-500">{tenant?.contact_email}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{tenant?.status}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Stores', stores.length],
          ['Retailer Admins', admins.length],
          ['Inventory Managers', managers.length],
          ['Products', tenantProducts.length],
          ['Low Stock', alerts.filter(alert => alert.status === 'open').length],
          ['Complaints', complaints.filter(c => c.status === 'open').length],
        ].map(([label, value]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Retailer Admins" icon={Building2}>
          <form onSubmit={adminForm.handleSubmit(data => createUser(data, 'retailer_admin'))} className="grid grid-cols-2 gap-3 mb-4">
            <input {...adminForm.register('name', { required: true })} placeholder="Full name" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...adminForm.register('email', { required: true })} placeholder="Email" type="email" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...adminForm.register('phone')} placeholder="Phone" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...adminForm.register('password', { required: true })} placeholder="Password" type="password" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <button className="col-span-2 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"><Plus size={14} className="inline mr-1" />Create Retailer Admin</button>
          </form>
          <UserRows users={admins} />
        </Section>

        <Section title="Stores & Inventory Managers" icon={MapPin}>
          <form onSubmit={storeForm.handleSubmit(createStore)} className="grid grid-cols-2 gap-3 mb-4">
            <input {...storeForm.register('name', { required: true })} placeholder="Store name" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...storeForm.register('location', { required: true })} placeholder="Location" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <button className="col-span-2 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">Create Store</button>
          </form>
          <form onSubmit={managerForm.handleSubmit(data => createUser(data, 'inventory_manager'))} className="grid grid-cols-2 gap-3 mb-4">
            <input {...managerForm.register('name', { required: true })} placeholder="Manager name" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...managerForm.register('email', { required: true })} placeholder="Email" type="email" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...managerForm.register('phone')} placeholder="Phone" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...managerForm.register('password', { required: true })} placeholder="Password" type="password" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <select {...managerForm.register('store_id', { required: true })} className="col-span-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Select store location</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.name} · {store.location}</option>)}
            </select>
            <button className="col-span-2 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">Create Inventory Manager</button>
          </form>
          <UserRows users={managers} />
        </Section>

        <Section title="Products & Store Distribution" icon={Package}>
          <form onSubmit={assignForm.handleSubmit(assignStock)} className="grid grid-cols-2 gap-3 mb-4">
            <select {...assignForm.register('product_id', { required: true })} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Product</option>
              {tenantProducts.map(product => <option key={product.id} value={product.id}>{product.product_name}</option>)}
            </select>
            <select {...assignForm.register('store_id', { required: true })} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Store</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.location}</option>)}
            </select>
            <input {...assignForm.register('quantity', { required: true })} type="number" placeholder="Quantity" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input {...assignForm.register('low_stock_threshold')} type="number" placeholder="Low stock threshold" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <button className="col-span-2 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">Assign Quantity to Store</button>
          </form>
          <div className="divide-y divide-slate-100">
            {inventory.map(item => (
              <div key={item.id} className="py-3 flex justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.product?.product_name}</div>
                  <div className="text-xs text-slate-500">{item.store?.location}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{item.quantity} units</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Inventory Overview & Activity Logs" icon={Activity}>
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 12).map(txn => (
              <div key={txn.id} className="py-3">
                <div className="text-sm text-slate-900">{txn.product?.product_name || 'Product'} · {txn.store?.location || 'Store'}</div>
                <div className="text-xs text-slate-500">{txn.transaction_type} {txn.quantity} units by {txn.updated_by_user?.name || 'Manager'} · {format(new Date(txn.timestamp), 'MMM d, HH:mm')}</div>
              </div>
            ))}
            {transactions.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No activity yet</div>}
          </div>
        </Section>

        <Section title="Low Stock Monitoring" icon={AlertTriangle}>
          <div className="divide-y divide-slate-100">
            {alerts.map(alert => (
              <div key={alert.id} className="py-3">
                <div className="text-sm font-medium text-slate-900">{alert.product?.product_name || 'Product'} · {alert.store?.location || 'Store'}</div>
                <div className="text-xs text-slate-500">Remaining {alert.remaining_quantity ?? '-'} · {alert.status}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Complaints Raised by Stores" icon={MessageSquare}>
          <div className="divide-y divide-slate-100">
            {complaints.map(complaint => (
              <div key={complaint.id} className="py-3">
                <div className="text-sm font-medium text-slate-900">{complaint.complaint_type} · {complaint.store?.location || 'Store'}</div>
                <div className="text-xs text-slate-500">{complaint.priority} priority · {complaint.status}</div>
                <div className="text-xs text-slate-600 mt-1">{complaint.description}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
