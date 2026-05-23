import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { KeyRound, Plus, Users, Shield, Package, Wrench, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { tenantService, userService } from '../services/api'
import type { Tenant, User } from '../types'
import { demoTenants, demoUsers } from '../demoData'
import { format } from 'date-fns'
import { useAuthStore } from '../store/authStore'

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  super_admin: { label: 'Super Admin', color: 'text-teal-600 bg-teal-500/10 border-teal-200', icon: Shield },
  retailer_admin: { label: 'Retailer Admin', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Package },
  inventory_manager: { label: 'Inv. Manager', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: Wrench },
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const createForm = useForm<any>({ defaultValues: { role: 'retailer_admin' } })
  const resetForm = useForm<{ password: string }>()
  const selectedRole = createForm.watch('role', 'retailer_admin')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await userService.list()
      setUsers(data)
    } catch {
      setUsers(demoUsers)
    } finally {
      setLoading(false)
    }
  }

  const loadTenants = async () => {
    if (currentUser?.role !== 'super_admin') return
    try {
      const { data } = await tenantService.list()
      setTenants(data)
    } catch {
      setTenants(demoTenants)
    }
  }

  useEffect(() => {
    load()
    loadTenants()
  }, [currentUser?.role])

  const toggleActive = async (user: User) => {
    try {
      await userService.update(user.id, { is_active: !user.is_active })
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
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

  const createUser = async (data: any) => {
    try {
      const role = currentUser?.role === 'super_admin' ? data.role || 'retailer_admin' : 'inventory_manager'
      await userService.create({
        ...data,
        role,
        tenant_id: currentUser?.role === 'super_admin' && role !== 'super_admin' ? data.tenant_id || undefined : undefined,
      })
      toast.success('User created')
      setShowCreate(false)
      createForm.reset({ role: 'retailer_admin' })
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    }
  }

  const updateRole = async (user: User, role: string) => {
    try {
      await userService.update(user.id, { role })
      toast.success('Role updated')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update role')
    }
  }

  const resetPassword = async (data: { password: string }) => {
    if (!resetUser) return
    try {
      await userService.resetPassword(resetUser.id, data.password)
      toast.success('Password reset')
      setResetUser(null)
      resetForm.reset()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    }
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarColors = ['from-teal-500 to-indigo-600', 'from-sky-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500']
  const visibleUsers = currentUser?.role === 'super_admin' ? users.filter(user => user.role === 'retailer_admin') : users
  const tenantName = (tenantId: string | null) => tenants.find(tenant => tenant.id === tenantId)?.company_name

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {currentUser?.role === 'super_admin' ? `${visibleUsers.length} retailer admins` : `${visibleUsers.length} team members`}
          </p>
        </div>
        <button onClick={() => { createForm.reset({ role: 'retailer_admin' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-medium text-white transition-colors">
          <Plus size={15} /> New User
        </button>
      </div>

      <div className="grid gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-3 w-28 bg-slate-100/80 rounded animate-pulse" />
              </div>
            </div>
          ))
        ) : visibleUsers.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <Users size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No retailer admins found</p>
          </div>
        ) : visibleUsers.map((user, i) => {
          const rcfg = roleConfig[user.role]
          const RIcon = rcfg?.icon || Users
          return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 hover:border-slate-300 transition-colors group">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                {initials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-950">{user.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${rcfg?.color}`}>
                    <RIcon size={10} />{rcfg?.label}
                  </span>
                  {!user.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {user.email}
                  {currentUser?.role === 'super_admin' && user.tenant_id && ` · ${tenantName(user.tenant_id) || 'Tenant assigned'}`}
                  {' · '}Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <select
                  value={user.role}
                  onChange={(event) => updateRole(user, event.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                  {currentUser?.role === 'super_admin' && <option value="retailer_admin">Retailer Admin</option>}
                  <option value="inventory_manager">Inventory Manager</option>
                </select>
                <button onClick={() => setResetUser(user)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors"
                  title="Reset password">
                  <KeyRound size={14} />
                </button>
                <button onClick={() => toggleActive(user)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors"
                  title={user.is_active ? 'Deactivate' : 'Activate'}>
                  {user.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                </button>
                <button onClick={() => handleDelete(user.id)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">Create User</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createForm.handleSubmit(createUser)} className="p-5 space-y-4">
              <input {...createForm.register('name', { required: true })} placeholder="Full name"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500" />
              <input {...createForm.register('email', { required: true })} type="email" placeholder="Email"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500" />
              <input {...createForm.register('password', { required: true })} type="password" placeholder="Temporary password"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500" />
              {currentUser?.role === 'super_admin' && (
                <>
                  <select {...createForm.register('role')} className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500">
                    <option value="retailer_admin">Retailer Admin</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {selectedRole !== 'super_admin' && (
                    <select {...createForm.register('tenant_id', { required: selectedRole !== 'super_admin' })}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500">
                      <option value="">Select retailer tenant</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>{tenant.company_name}</option>
                      ))}
                    </select>
                  )}
                </>
              )}
              <button className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium">Create</button>
            </form>
          </div>
        </div>
      )}

      {resetUser && (
        <div className="fixed inset-0 bg-slate-900/35 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">Reset Password</h2>
              <button onClick={() => setResetUser(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={resetForm.handleSubmit(resetPassword)} className="p-5 space-y-4">
              <div className="text-sm text-slate-600">{resetUser.name}</div>
              <input {...resetForm.register('password', { required: true })} type="password" placeholder="New password"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-950 focus:outline-none focus:border-teal-500" />
              <button className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium">Reset Password</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
