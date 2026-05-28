import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { AlertTriangle, CheckCircle2, MessageSquare, X, MapPin, User as UserIcon } from 'lucide-react'
import { alertService, complaintService, productService } from '../services/api'
import type { Complaint, LowStockAlert, Product } from '../types'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'
import Pagination from '../components/common/Pagination'
import { paginate } from '../utils/tableTools'

export default function AlertsPage() {
  const { user } = useAuthStore()
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [resolveAlert, setResolveAlert] = useState<LowStockAlert | null>(null)
  const [openPage, setOpenPage] = useState(1)
  const [resolvedPage, setResolvedPage] = useState(1)
  const [complaintPage, setComplaintPage] = useState(1)
  const complaintForm = useForm<any>({ defaultValues: { priority: 'medium', complaint_type: 'Product shortage' } })
  const resolveForm = useForm<{ message: string }>()

  const load = async () => {
    setLoading(true)
    try {
      const [alertRes, complaintRes] = await Promise.all([
        alertService.list(),
        complaintService.list(),
      ])
      setAlerts(alertRes.data)
      setComplaints(complaintRes.data)
      if (user?.role === 'inventory_manager') {
        const { data: productData } = await productService.list({ page_size: 100 })
        setProducts(productData.items)
      }
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const raiseComplaint = async (data: any) => {
    try {
      await complaintService.create({
        product_id: data.product_id || undefined,
        complaint_type: data.complaint_type,
        priority: data.priority,
        description: data.description,
      })
      toast.success('Complaint raised — retailer admin notified')
      complaintForm.reset({ priority: 'medium', complaint_type: 'Product shortage' })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to raise complaint')
    }
  }

  const submitResolve = async (data: { message: string }) => {
    if (!resolveAlert) return
    try {
      await alertService.update(resolveAlert.id, {
        status: 'resolved',
        resolve_message: data.message,
      })
      toast.success('Alert resolved — message sent to inventory manager')
      setResolveAlert(null)
      resolveForm.reset()
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resolve')
    }
  }

  const resolveComplaint = async (complaint: Complaint) => {
    try {
      await complaintService.update(complaint.id, { status: 'resolved' })
      toast.success('Complaint resolved')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const openAlerts = alerts.filter(a => a.status === 'open')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved')
  const openRows = paginate(openAlerts, openPage, 3)
  const resolvedRows = paginate(resolvedAlerts, resolvedPage, 3)
  const complaintRows = paginate(complaints, complaintPage, 5)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Low Stock Alerts</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {user?.role === 'inventory_manager'
            ? 'Alerts from your store · raise complaints to notify your retailer admin'
            : `${openAlerts.length} open alerts from your stores`}
        </p>
      </div>

      {/* Open alerts */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Open Alerts ({openAlerts.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                <div className="flex-1"><div className="h-4 w-48 bg-slate-100 rounded animate-pulse mb-2" /><div className="h-3 w-32 bg-slate-100 rounded animate-pulse" /></div>
              </div>
            ))
          ) : openAlerts.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <CheckCircle2 size={28} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No open alerts</p>
            </div>
          ) : openRows.pageItems.map(alert => (
            <div key={alert.id} className="px-4 py-4 flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle size={15} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-950">{alert.product?.product_name || 'Product'}</div>
                <div className="flex flex-wrap gap-3 mt-1">
                  {alert.store && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={11} />{alert.store.name} · {alert.store.location}
                    </span>
                  )}
                  {alert.raised_by_user && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <UserIcon size={11} />Raised by {alert.raised_by_user.name}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
                {alert.remaining_quantity !== null && (
                  <div className="mt-1.5 text-xs font-medium text-red-500">{alert.remaining_quantity} units remaining</div>
                )}
                {alert.message && <div className="text-xs text-slate-600 mt-1.5 bg-slate-50 rounded px-2 py-1.5">{alert.message}</div>}
              </div>
              {user?.role === 'retailer_admin' && (
                <button onClick={() => { setResolveAlert(alert); resolveForm.reset() }}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium flex-shrink-0 transition-colors">
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
        <Pagination page={openRows.safePage} totalPages={openRows.totalPages} totalItems={openAlerts.length} pageSize={3} onPageChange={setOpenPage} />
      </div>

      {/* Resolved alerts (collapsed) */}
      {resolvedAlerts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900">Resolved ({resolvedAlerts.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {resolvedRows.pageItems.map(alert => (
              <div key={alert.id} className="px-4 py-3 flex items-center gap-4 opacity-60">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700">{alert.product?.product_name}</div>
                  <div className="text-xs text-slate-400">
                    {alert.store?.location} · Resolved {alert.resolved_at ? format(new Date(alert.resolved_at), 'MMM d, yyyy') : ''}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Resolved</span>
              </div>
            ))}
          </div>
          <Pagination page={resolvedRows.safePage} totalPages={resolvedRows.totalPages} totalItems={resolvedAlerts.length} pageSize={3} onPageChange={setResolvedPage} />
        </div>
      )}

      {/* Inventory manager: raise complaint */}
      {user?.role === 'inventory_manager' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-teal-600" />
            <h2 className="text-sm font-semibold text-slate-900">Raise Complaint to Retailer Admin</h2>
          </div>
          <form onSubmit={complaintForm.handleSubmit(raiseComplaint)} className="grid sm:grid-cols-2 gap-3">
            <select {...complaintForm.register('product_id')} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">No specific product</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
            </select>
            <select {...complaintForm.register('complaint_type', { required: 'Complaint type is mandatory' })} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option>Product shortage</option>
              <option>Damaged products</option>
              <option>Supply issue</option>
              <option>Inventory mismatch</option>
            </select>
            <select {...complaintForm.register('priority')} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <textarea {...complaintForm.register('description', { required: 'Description is mandatory' })} placeholder="Describe the issue..." rows={3}
              className="sm:col-span-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
            {complaintForm.formState.errors.description && <p className="sm:col-span-2 text-xs text-red-500 -mt-2">{String(complaintForm.formState.errors.description.message)}</p>}
            <button className="sm:col-span-2 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
              Submit Complaint
            </button>
          </form>
        </div>
      )}

      {/* Complaints */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <MessageSquare size={15} className="text-teal-600" />
          <h2 className="text-sm font-semibold text-slate-900">Store Complaints ({complaints.length})</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {complaints.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No complaints</div>
          ) : complaintRows.pageItems.map(complaint => (
            <div key={complaint.id} className="px-4 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-950">{complaint.complaint_type}</div>
                <div className="flex flex-wrap gap-3 mt-1">
                  {complaint.store && (
                    <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={11} />{complaint.store.location}</span>
                  )}
                  {complaint.raised_by_user && (
                    <span className="flex items-center gap-1 text-xs text-slate-500"><UserIcon size={11} />{complaint.raised_by_user.name}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${complaint.priority === 'high' ? 'bg-red-50 text-red-500 border-red-200' : complaint.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {complaint.priority}
                  </span>
                  <span className="text-xs text-slate-400">{format(new Date(complaint.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1.5 bg-slate-50 rounded px-2 py-1.5">{complaint.description}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${complaint.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                  {complaint.status}
                </span>
                {user?.role === 'retailer_admin' && complaint.status !== 'resolved' && (
                  <button onClick={() => resolveComplaint(complaint)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Pagination page={complaintRows.safePage} totalPages={complaintRows.totalPages} totalItems={complaints.length} pageSize={5} onPageChange={setComplaintPage} />
      </div>

      {/* Resolve modal */}
      {resolveAlert && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-950">Resolve Alert</h2>
              <button onClick={() => setResolveAlert(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
            </div>
            <div className="px-5 pt-4 pb-2">
              <div className="text-sm text-slate-700 font-medium">{resolveAlert.product?.product_name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {resolveAlert.store?.location} · Raised by {resolveAlert.raised_by_user?.name}
              </div>
            </div>
            <form onSubmit={resolveForm.handleSubmit(submitResolve)} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Message to inventory manager <span className="text-slate-400">(they will receive this as a notification)</span>
                </label>
                <textarea {...resolveForm.register('message', { required: 'Message is mandatory' })}
                  placeholder="e.g. Restocking 200 units dispatched from warehouse, expected delivery in 2 days."
                  rows={3}
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500 resize-none" />
                {resolveForm.formState.errors.message && <p className="text-xs text-red-500 mt-1">{String(resolveForm.formState.errors.message.message)}</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setResolveAlert(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:text-slate-950">Cancel</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">
                  Resolve & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
