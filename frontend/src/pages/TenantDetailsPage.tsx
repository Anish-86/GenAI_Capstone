import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Building2, Package, MapPin, AlertTriangle, Activity, MessageSquare, Plus, Power, Trash2 } from 'lucide-react'
import { inventoryService, storeService, tenantService, userService } from '../services/api'
import type { Complaint, InventoryTransaction, LowStockAlert, Product, Store, StoreInventory, Tenant, User } from '../types'
import { format } from 'date-fns'
import Pagination from '../components/common/Pagination'
import { paginate } from '../utils/tableTools'
import { optionalPhone, requiredEmail, requiredNumber, requiredPassword, requiredText } from '../utils/validation'

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
  const [createPanel, setCreatePanel] = useState<'admin' | 'manager' | 'store' | null>(null)
  const [distributionPage, setDistributionPage] = useState(1)
  const [activityPage, setActivityPage] = useState(1)
  const [alertPage, setAlertPage] = useState(1)
  const [complaintPage, setComplaintPage] = useState(1)
  const [storePage, setStorePage] = useState(1)
  const [adminPage, setAdminPage] = useState(1)
  const [managerPage, setManagerPage] = useState(1)
  const adminForm = useForm<any>({ defaultValues: { role: 'retailer_admin' } })
  const managerForm = useForm<any>({ defaultValues: { role: 'inventory_manager' } })
  const storeForm = useForm<any>()
  const assignForm = useForm<any>()
  const assignProductId = assignForm.watch('product_id')
  const assignStoreId = assignForm.watch('store_id')
  const existingStoreStock = inventory.find(item => item.product_id === assignProductId && item.store_id === assignStoreId)

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
  useEffect(() => {
    if (existingStoreStock) assignForm.setValue('low_stock_threshold', existingStoreStock.low_stock_threshold)
  }, [assignForm, existingStoreStock])

  const tenantProducts = products

  const createStore = async (data: any) => {
    await storeService.create({ ...data, tenant_id: id })
    toast.success('Store created')
    storeForm.reset()
    setCreatePanel(null)
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
    setCreatePanel(null)
    load()
  }

  const assignStock = async (data: any) => {
    const existing = inventory.find(item => item.product_id === data.product_id && item.store_id === data.store_id)
    if (!existing && Number(data.low_stock_threshold) > Number(data.quantity)) {
      assignForm.setError('low_stock_threshold', { message: 'Threshold cannot be greater than assigned quantity' })
      return
    }
    const payload: Record<string, any> = {
      product_id: data.product_id,
      store_id: data.store_id,
      quantity: parseInt(data.quantity),
    }
    if (!existing) payload.low_stock_threshold = parseInt(data.low_stock_threshold)
    await inventoryService.assignStoreInventory(payload)
    toast.success('Store stock assigned')
    assignForm.reset()
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
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )

  const ErrorText = ({ form, name }: { form: any; name: string }) => (
    form.formState.errors[name] ? <p className="text-xs text-red-500 mt-1">{String(form.formState.errors[name]?.message || 'This field is mandatory')}</p> : null
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

  const distribution = paginate(inventory, distributionPage, 5)
  const activity = paginate(transactions, activityPage, 5)
  const alertRows = paginate(alerts, alertPage, 5)
  const complaintRows = paginate(complaints, complaintPage, 5)
  const storeRows = paginate(stores, storePage, 5)
  const adminRows = paginate(admins, adminPage, 2)
  const managerRows = paginate(managers, managerPage, 2)

  if (loading) return <div className="text-sm text-slate-500">Loading tenant...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/app/tenants" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-2"><ArrowLeft size={14} /> Tenants</Link>
          <h1 className="text-2xl font-semibold text-slate-950">{tenant?.company_name}</h1>
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

      {/* Stores + People — side by side, equal total height */}
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">

        {/* LEFT — Stores (stretches to match both right cards + gap) */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">Stores</h2>
              <span className="ml-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{stores.length}</span>
            </div>
            <button
              onClick={() => setCreatePanel(createPanel === 'store' ? null : 'store')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              <Plus size={13} />CREATE STORE
            </button>
          </div>

          {createPanel === 'store' && (
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
              <form onSubmit={storeForm.handleSubmit(createStore)} className="grid grid-cols-2 gap-3">
                <div><input {...storeForm.register('name', { required: 'Store name is mandatory' })} placeholder="Store name" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={storeForm} name="name" /></div>
                <div><input {...storeForm.register('location', { required: 'Location is mandatory' })} placeholder="Location" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={storeForm} name="location" /></div>
                <button className="col-span-2 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Create Store</button>
              </form>
            </div>
          )}

          {/* Store rows — simple list, no cards */}
          <div className="flex-1 divide-y divide-slate-100 px-5">
            {stores.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">No stores yet</div>
            )}
            {storeRows.pageItems.map((store, i) => (
              <div key={store.id} className="flex items-center gap-4 py-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {i + 1 + (storeRows.safePage - 1) * 5}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{store.name}</div>
                  <div className="text-xs text-slate-500 truncate">{store.location}</div>
                </div>
                <span className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                  store.status === 'active'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>{store.status}</span>
              </div>
            ))}
          </div>
          <Pagination page={storeRows.safePage} totalPages={storeRows.totalPages} totalItems={stores.length} pageSize={5} onPageChange={setStorePage} />
        </section>

        {/* RIGHT — Retailer Admins (top) + Inventory Managers (bottom) */}
        <div className="flex flex-col gap-5 h-full">

          {/* Retailer Admins card */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Retailer Admins</h2>
                <span className="ml-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{admins.length}</span>
              </div>
              <button
                onClick={() => setCreatePanel(createPanel === 'admin' ? null : 'admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
              >
                <Plus size={13} />CREATE ADMIN
              </button>
            </div>

            {createPanel === 'admin' && (
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <form onSubmit={adminForm.handleSubmit(data => createUser(data, 'retailer_admin'))} className="grid grid-cols-2 gap-3">
                  <div><input {...adminForm.register('name', requiredText('Name'))} placeholder="Full name" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={adminForm} name="name" /></div>
                  <div><input {...adminForm.register('email', requiredEmail)} placeholder="Email" type="email" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={adminForm} name="email" /></div>
                  <div><input {...adminForm.register('phone', optionalPhone)} placeholder="Phone" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={adminForm} name="phone" /></div>
                  <div><input {...adminForm.register('password', requiredPassword)} placeholder="Password" type="password" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={adminForm} name="password" /></div>
                  <button className="col-span-2 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">Create Retailer Admin</button>
                </form>
              </div>
            )}

            <div className="flex-1 divide-y divide-slate-100 px-5">
              {adminRows.pageItems.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">No retailer admins yet</div>
              )}
              <UserRows users={adminRows.pageItems} />
            </div>
            <Pagination page={adminRows.safePage} totalPages={adminRows.totalPages} totalItems={admins.length} pageSize={2} onPageChange={setAdminPage} />
          </section>

          {/* Inventory Managers card */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Inventory Managers</h2>
                <span className="ml-1 text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{managers.length}</span>
              </div>
              <button
                onClick={() => setCreatePanel(createPanel === 'manager' ? null : 'manager')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
              >
                <Plus size={13} />CREATE MANAGER
              </button>
            </div>

            {createPanel === 'manager' && (
              <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                <form onSubmit={managerForm.handleSubmit(data => createUser(data, 'inventory_manager'))} className="grid grid-cols-2 gap-3">
                  <div><input {...managerForm.register('name', requiredText('Name'))} placeholder="Manager name" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={managerForm} name="name" /></div>
                  <div><input {...managerForm.register('email', requiredEmail)} placeholder="Email" type="email" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={managerForm} name="email" /></div>
                  <div><input {...managerForm.register('phone', optionalPhone)} placeholder="Phone" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={managerForm} name="phone" /></div>
                  <div><input {...managerForm.register('password', requiredPassword)} placeholder="Password" type="password" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={managerForm} name="password" /></div>
                  <div className="col-span-2">
                    <select {...managerForm.register('store_id', { required: 'Store is mandatory' })} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                      <option value="">Select store location</option>
                      {stores.map(store => <option key={store.id} value={store.id}>{store.name} · {store.location}</option>)}
                    </select>
                    <ErrorText form={managerForm} name="store_id" />
                  </div>
                  <button className="col-span-2 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold">Create Inventory Manager</button>
                </form>
              </div>
            )}

            <div className="flex-1 divide-y divide-slate-100 px-5">
              {managerRows.pageItems.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-400">No inventory managers yet</div>
              )}
              <UserRows users={managerRows.pageItems} />
            </div>
            <Pagination page={managerRows.safePage} totalPages={managerRows.totalPages} totalItems={managers.length} pageSize={2} onPageChange={setManagerPage} />
          </section>

        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Products & Store Distribution" icon={Package}>
          <form onSubmit={assignForm.handleSubmit(assignStock)} className="grid grid-cols-2 gap-3 mb-4">
            <div><select {...assignForm.register('product_id', { required: 'Product is mandatory' })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Product</option>
              {tenantProducts.map(product => <option key={product.id} value={product.id}>{product.product_name}</option>)}
            </select><ErrorText form={assignForm} name="product_id" /></div>
            <div><select {...assignForm.register('store_id', { required: 'Store is mandatory' })} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Store</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.location}</option>)}
            </select><ErrorText form={assignForm} name="store_id" /></div>
            <div><input {...assignForm.register('quantity', requiredNumber('Quantity', 1))} type="number" min="1" placeholder="Quantity" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm" /><ErrorText form={assignForm} name="quantity" /></div>
            <div><input {...assignForm.register('low_stock_threshold', existingStoreStock ? {} : requiredNumber('Low stock threshold', 1))} type="number" min="1" placeholder={existingStoreStock ? 'Existing threshold' : 'Low stock threshold'} disabled={Boolean(existingStoreStock)} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:text-slate-500 disabled:cursor-not-allowed" /><ErrorText form={assignForm} name="low_stock_threshold" /></div>
            <button className="col-span-2 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">Assign Quantity to Store</button>
          </form>
          <div className="divide-y divide-slate-100">
            {distribution.pageItems.map(item => (
              <div key={item.id} className="py-3 flex justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.product?.product_name}</div>
                  <div className="text-xs text-slate-500">{item.store?.location}</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{item.quantity} units</div>
              </div>
            ))}
          </div>
          <Pagination page={distribution.safePage} totalPages={distribution.totalPages} totalItems={inventory.length} pageSize={5} onPageChange={setDistributionPage} />
        </Section>

        <Section title="Inventory Overview & Activity Logs" icon={Activity}>
          <div className="divide-y divide-slate-100">
            {activity.pageItems.map(txn => (
              <div key={txn.id} className="py-3">
                <div className="text-sm text-slate-900">{txn.product?.product_name || 'Product'} · {txn.store?.location || 'Store'}</div>
                <div className="text-xs text-slate-500">{txn.transaction_type} {txn.quantity} units by {txn.updated_by_user?.name || 'Manager'} · {format(new Date(txn.timestamp), 'MMM d, HH:mm')}</div>
              </div>
            ))}
            {transactions.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No recent activity</div>}
          </div>
          <Pagination page={activity.safePage} totalPages={activity.totalPages} totalItems={transactions.length} pageSize={5} onPageChange={setActivityPage} />
        </Section>

        <Section title="Low Stock Monitoring" icon={AlertTriangle}>
          <div className="divide-y divide-slate-100">
            {alertRows.pageItems.map(alert => (
              <div key={alert.id} className="py-3">
                <div className="text-sm font-medium text-slate-900">{alert.product?.product_name || 'Product'} · {alert.store?.location || 'Store'}</div>
                <div className="text-xs text-slate-500">Remaining {alert.remaining_quantity ?? '-'} · {alert.status}</div>
              </div>
            ))}
            {alerts.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No records</div>}
          </div>
          <Pagination page={alertRows.safePage} totalPages={alertRows.totalPages} totalItems={alerts.length} pageSize={5} onPageChange={setAlertPage} />
        </Section>

        <Section title="Complaints Raised by Stores" icon={MessageSquare}>
          <div className="divide-y divide-slate-100">
            {complaintRows.pageItems.map(complaint => (
              <div key={complaint.id} className="py-3">
                <div className="text-sm font-medium text-slate-900">{complaint.complaint_type} · {complaint.store?.location || 'Store'}</div>
                <div className="text-xs text-slate-500">{complaint.priority} priority · {complaint.status}</div>
                <div className="text-xs text-slate-600 mt-1">{complaint.description}</div>
              </div>
            ))}
            {complaints.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No records</div>}
          </div>
          <Pagination page={complaintRows.safePage} totalPages={complaintRows.totalPages} totalItems={complaints.length} pageSize={5} onPageChange={setComplaintPage} />
        </Section>
      </div>
    </div>
  )
}
