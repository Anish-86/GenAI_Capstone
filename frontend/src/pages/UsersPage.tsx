import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { KeyRound, Plus, Shield, Package, Wrench, Trash2, ToggleLeft, ToggleRight, X, MapPin } from 'lucide-react'
import { storeService, userService } from '../services/api'
import type { Store, User } from '../types'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [admins, setAdmins] = useState<User[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showManagerModal, setShowManagerModal] = useState(false)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const adminForm = useForm<any>()
  const managerForm = useForm<any>()
  const resetForm = useForm<{ password: string }>()

  const load = async () => {
    setLoading(true)
    try {
      const [userRes, storeRes] = await Promise.all([
        userService.list(),
        storeService.list(),
      ])
      setAdmins(userRes.data.filter((u: User) => u.role === 'retailer_admin'))
      setManagers(userRes.data.filter((u: User) => u.role === 'inventory_manager'))
      setStores(storeRes.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggleActive = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active })
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
      load()
    } catch { toast.error('Failed to update') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return
    try {
      await userService.delete(id)
      toast.success('User deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const createAdmin = async (data: any) => {
    try {
      await userService.create({ ...data, role: 'retailer_admin' })
      toast.success('Retailer admin created')
      setShowAdminModal(false)
      adminForm.reset()
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const createManager = async (data: any) => {
    try {
      await userService.create({ ...data, role: 'inventory_manager' })
      toast.success('Inventory manager created')
      setShowManagerModal(false)
      managerForm.reset()
      load()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const resetPassword = async (data: { password: string }) => {
    if (!resetUser) return
    try {
      await userService.resetPassword(resetUser.id, data.password)
      toast.success('Password reset')
      setResetUser(null)
      resetForm.reset()
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  const storeName = (storeId: string | null | undefined) => {
    if (!storeId) return null
    const s = stores.find(s => s.id === storeId)
    return s ? `${s.name} · ${s.location}` : null
  }

  const UserCard = ({ user, showStore }: { user: User; showStore?: boolean }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:border-slate-300 transition-colors group">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-950">{user.name}</span>
          {!user.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {user.email}
          {showStore && storeName(user.store_id) && (
            <span className="ml-1 inline-flex items-center gap-1"><MapPin size={10} />{storeName(user.store_id)}</span>
          )}
          {' · '}Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setResetUser(user)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors" title="Reset password">
          <KeyRound size={14} />
        </button>
        <button onClick={() => toggleActive(user)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title={user.is_active ? 'Deactivate' : 'Activate'}>
          {user.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
        </button>
        <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )

  const inputCls = "w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Team</h1>
        <p className="text-slate-500 text-sm mt-0.5">{admins.length} retailer admins · {managers.length} inventory managers</p>
      </div>

      {/* Retailer Admins */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-900">Retailer Admins</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">{admins.length}</span>
          </div>
          <button onClick={() => { adminForm.reset(); setShowAdminModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium text-white transition-colors">
            <Plus size={13} /> Add Admin
          </button>
        </div>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 bg-white border border-slate-200 rounded-lg animate-pulse" />)
        ) : admins.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-400">No retailer admins yet</div>
        ) : admins.map(u => <UserCard key={u.id} user={u} />)}
      </section>

      {/* Inventory Managers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900">Inventory Managers</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">{managers.length}</span>
          </div>
          <button onClick={() => { managerForm.reset(); setShowManagerModal(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded-lg text-xs font-medium text-white transition-colors">
            <Plus size={13} /> Add Manager
          </button>
        </div>
        {stores.length === 0 && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Create stores first (in the Stores section) before adding inventory managers.
          </div>
        )}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-white border border-slate-200 rounded-lg animate-pulse" />)
        ) : managers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-400">No inventory managers yet</div>
        ) : managers.map(u => <UserCard key={u.id} user={u} showStore />)}
      </section>

      {/* Create Retailer Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2"><Package size={16} className="text-blue-500" /><h2 className="text-base font-semibold text-slate-950">New Retailer Admin</h2></div>
              <button onClick={() => setShowAdminModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={adminForm.handleSubmit(createAdmin)} className="p-5 space-y-3">
              <input {...adminForm.register('name', { required: true })} placeholder="Full name" className={inputCls} />
              <input {...adminForm.register('email', { required: true })} type="email" placeholder="Email" className={inputCls} />
              <input {...adminForm.register('phone')} placeholder="Phone (optional)" className={inputCls} />
              <input {...adminForm.register('password', { required: true })} type="password" placeholder="Temporary password" className={inputCls} />
              <button className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">Create Retailer Admin</button>
            </form>
          </div>
        </div>
      )}

      {/* Create Inventory Manager Modal */}
      {showManagerModal && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-2"><Wrench size={16} className="text-teal-600" /><h2 className="text-base font-semibold text-slate-950">New Inventory Manager</h2></div>
              <button onClick={() => setShowManagerModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={managerForm.handleSubmit(createManager)} className="p-5 space-y-3">
              <input {...managerForm.register('name', { required: true })} placeholder="Full name" className={inputCls} />
              <input {...managerForm.register('email', { required: true })} type="email" placeholder="Email" className={inputCls} />
              <input {...managerForm.register('phone')} placeholder="Phone (optional)" className={inputCls} />
              <input {...managerForm.register('password', { required: true })} type="password" placeholder="Temporary password" className={inputCls} />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Assign to Store</label>
                <select {...managerForm.register('store_id', { required: true })} className={inputCls}>
                  <option value="">Select store location</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name} · {s.location}</option>)}
                </select>
              </div>
              <button className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors">Create Inventory Manager</button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-950">Reset Password</h2>
              <button onClick={() => setResetUser(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={resetForm.handleSubmit(resetPassword)} className="p-5 space-y-3">
              <div className="text-sm text-slate-600">{resetUser.name} · {resetUser.email}</div>
              <input {...resetForm.register('password', { required: true })} type="password" placeholder="New password" className={inputCls} />
              <button className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium">Reset Password</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
