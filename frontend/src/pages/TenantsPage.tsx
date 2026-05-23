import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Building2, Plus, X, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { tenantService } from '../services/api'
import type { Tenant } from '../types'
import { demoTenants } from '../demoData'
import { format } from 'date-fns'

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: 'Active', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20', icon: CheckCircle2 },
  inactive: { label: 'Inactive', color: 'text-slate-600 bg-slate-100 border-slate-200', icon: Clock },
  suspended: { label: 'Suspended', color: 'text-red-400 bg-red-400/10 border-red-500/20', icon: XCircle },
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<any>()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await tenantService.list()
      setTenants(data.length ? data : demoTenants)
    } catch { setTenants(demoTenants) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const onCreate = async (data: any) => {
    try {
      await tenantService.create(data)
      toast.success('Tenant created')
      setShowModal(false)
      reset()
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tenant? This will remove all associated data.')) return
    try {
      await tenantService.delete(id)
      toast.success('Tenant deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const updateStatus = async (tenant: Tenant, status: string) => {
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-teal-500/20 flex items-center justify-center text-sm font-bold text-teal-600">
                    {initial}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{tenant.company_name}</div>
                    <div className="text-xs text-slate-500">{tenant.contact_email}</div>
                  </div>
                </div>
                <button onClick={() => handleDelete(tenant.id)}
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${scfg?.color}`}>
                  <SIcon size={10} />{scfg?.label}
                </span>
                <select
                  value={tenant.status}
                  onChange={(event) => updateStatus(tenant, event.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
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
                <input {...register('company_name', { required: true })} placeholder="Acme Corp"
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Contact Email</label>
                <input {...register('contact_email', { required: true })} type="email" placeholder="admin@acme.com"
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors" />
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
