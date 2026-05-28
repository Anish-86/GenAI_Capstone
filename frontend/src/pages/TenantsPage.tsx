import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Building2, Plus, X, Trash2, CheckCircle2, XCircle, Clock, Power, RotateCcw } from 'lucide-react'
import { tenantService } from '../services/api'
import { Link } from 'react-router-dom'
import type { Tenant, TenantOverview } from '../types'
import { format } from 'date-fns'
import { requiredEmail, requiredPassword, requiredText } from '../utils/validation'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20', icon: CheckCircle2 },
  inactive: { label: 'Inactive', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: Clock },
  suspended: { label: 'Suspended', color: 'text-red-400 bg-red-400/10 border-red-500/20', icon: XCircle },
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<any>()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await tenantService.overview()
      setTenants(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load tenants:', error)
      toast.error('Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onCreate = async (data: any) => {
    try {
      const response = await tenantService.create({
        company_name: data.company_name,
        contact_email: data.contact_email,
        initial_user_name: data.initial_user_name || undefined,
        initial_user_email: data.initial_user_email || undefined,
        initial_user_password: data.initial_user_password || undefined,
        initial_user_role: data.initial_user_role || 'retailer_admin',
      })
      console.log('Tenant created:', response)
      
      // Immediately add the new tenant to the state with default stats
      const newTenant: TenantOverview = {
        id: response.data.id,
        company_name: response.data.company_name,
        contact_email: response.data.contact_email,
        status: response.data.status || 'active',
        created_at: response.data.created_at,
        stores: 0,
        retailer_admins: data.initial_user_role === 'retailer_admin' && data.initial_user_email ? 1 : 0,
        inventory_managers: data.initial_user_role === 'inventory_manager' && data.initial_user_email ? 1 : 0,
        products: 0,
        low_stock: 0,
      }
      setTenants(prev => [newTenant, ...prev])
      
      toast.success('Tenant created')
      setShowModal(false)
      reset()
      
      load()
    } catch (err: any) {
      console.error('Tenant creation error:', err)
      toast.error(err.response?.data?.detail || 'Error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tenant permanently? All inventory managers, retailer admins, products, transactions, alerts, and notifications under this tenant will be deleted. This cannot be undone.')) return
    try {
      await tenantService.delete(id)
      toast.success('Tenant deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const updateStatus = async (tenant: Tenant, status: string) => {
    if (status !== 'active' && !confirm('Deactivate this tenant? All inventory managers under this tenant will lose access, and all products and inventory actions for this tenant will be on hold until it is reactivated.')) return
    if (status === 'active' && !confirm('Reactivate this tenant? Users under this tenant will regain access to their inventory workspace.')) return
    try {
      await tenantService.update(tenant.id, { status })
      toast.success(`Tenant ${status}`)
      load()
    } catch {
      toast.error('Failed to update tenant')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Tenants</h1>
          <p className="text-slate-500 text-sm mt-0.5">{tenants.length} organizations</p>
        </div>
        <button onClick={() => { reset(); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={15} /> New Tenant
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="h-5 w-36 bg-slate-100 rounded animate-pulse mb-2" />
              <div className="h-3.5 w-48 bg-slate-100/80 rounded animate-pulse" />
            </div>
          ))
        ) : tenants.map(tenant => {
          const scfg = statusConfig[tenant.status]
          const SIcon = scfg?.icon || CheckCircle2
          const initial = tenant.company_name[0].toUpperCase()
          return (
            <div key={tenant.id} className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors group">
              <div className="flex items-start justify-between mb-4">
                <Link to={`/tenants/${tenant.id}`} className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-teal-500/20 flex items-center justify-center text-sm font-bold text-teal-600">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-950">{tenant.company_name}</div>
                    <div className="text-xs text-slate-500">{tenant.contact_email}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => updateStatus(tenant, tenant.status === 'active' ? 'inactive' : 'active')}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-all"
                    title={tenant.status === 'active' ? 'Deactivate tenant' : 'Reactivate tenant'}>
                    {tenant.status === 'active' ? <Power size={13} /> : <RotateCcw size={13} />}
                  </button>
                  <button onClick={() => handleDelete(tenant.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-all"
                    title="Delete tenant">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  ['Retailer Admins', tenant.retailer_admins ?? 0],
                  ['Managers', tenant.inventory_managers ?? 0],
                  ['Products', tenant.products ?? 0],
                  ['Low Stock', tenant.low_stock ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-50 rounded-lg px-2 py-2">
                    <div className="text-sm font-semibold text-slate-900">{value}</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${scfg?.color}`}>
                  <SIcon size={10} />{scfg?.label}
                </span>
                <span className="text-xs text-slate-400">Since {format(new Date(tenant.created_at), 'MMM yyyy')}</span>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">Create Tenant</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Company Name</label>
                <input {...register('company_name', { required: 'Company name is mandatory' })} placeholder="Acme Corp"
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
                {errors.company_name && <p className="text-xs text-red-500 mt-1">{String(errors.company_name.message)}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Contact Email</label>
                <input {...register('contact_email', requiredEmail)} type="email" placeholder="admin@acme.com"
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
                {errors.contact_email && <p className="text-xs text-red-500 mt-1">{String(errors.contact_email.message)}</p>}
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Create Initial User</label>
                  <select {...register('initial_user_role')} defaultValue="retailer_admin"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500 transition-colors">
                    <option value="retailer_admin">Retailer Admin</option>
                    <option value="inventory_manager">Inventory Manager</option>
                  </select>
                </div>
                <div>
                  <input {...register('initial_user_name', requiredText('Name'))} placeholder="User full name"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
                  {errors.initial_user_name && <p className="text-xs text-red-500 mt-1">{String(errors.initial_user_name.message)}</p>}
                </div>
                <div>
                  <input {...register('initial_user_email', requiredEmail)} type="email" placeholder="user@company.com"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
                  {errors.initial_user_email && <p className="text-xs text-red-500 mt-1">{String(errors.initial_user_email.message)}</p>}
                </div>
                <div>
                  <input {...register('initial_user_password', requiredPassword)} type="password" placeholder="Temporary password"
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
                  {errors.initial_user_password && <p className="text-xs text-red-500 mt-1">{String(errors.initial_user_password.message)}</p>}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:text-slate-950 transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {isSubmitting ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
