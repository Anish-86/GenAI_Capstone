import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { notificationService } from '../services/api'
import type { Notification } from '../types'
import {
  LayoutDashboard, Package, ArrowLeftRight, Users, Building2,
  LogOut, Menu, X, ChevronRight, Bell, Search, AlertTriangle, MapPin
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: Building2, label: 'Tenants', roles: ['super_admin'] },
  { to: '/products', icon: Package, label: 'Products', roles: ['retailer_admin', 'inventory_manager'] },
  { to: '/inventory', icon: ArrowLeftRight, label: 'Inventory', roles: ['retailer_admin', 'inventory_manager'] },
  { to: '/stores', icon: MapPin, label: 'Stores', roles: ['retailer_admin'] },
  { to: '/alerts', icon: AlertTriangle, label: 'Low Stock', roles: ['retailer_admin', 'inventory_manager'] },
  { to: '/users', icon: Users, label: 'Team', roles: ['retailer_admin'] },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const unread = notifications.filter(notification => !notification.is_read).length

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(user?.role || ''))

  const loadNotifications = async () => {
    try {
      const { data } = await notificationService.list()
      setNotifications(data)
      return data
    } catch {
      setNotifications([])
      return []
    }
  }

  useEffect(() => {
    loadNotifications()
    const timer = window.setInterval(loadNotifications, 30000)
    return () => window.clearInterval(timer)
  }, [])

  const openNotifications = async () => {
    const opening = !notificationOpen
    setNotificationOpen(opening)
    if (opening) {
      const latest = await loadNotifications()
      // Mark all as read dynamically when panel opens
      if (latest.some((n: Notification) => !n.is_read)) {
        try {
          await notificationService.markAllRead()
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        } catch {}
      }
    }
  }

  const markRead = async (notification: Notification) => {
    try {
      await notificationService.markRead(notification.id)
      loadNotifications()
    } catch {}
    // Navigate based on entity type
    setNotificationOpen(false)
    if (notification.entity_type === 'low_stock_alert') {
      navigate('/alerts')
    } else if (notification.entity_type === 'complaint') {
      navigate('/alerts')
    }
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="flex h-screen bg-slate-50 text-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/35 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 flex flex-col h-full bg-white border-r border-slate-200
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="font-semibold text-slate-950 tracking-tight">InventIQ</span>
              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Inventory OS</div>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors hidden lg:flex">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
                ${isActive
                  ? 'bg-teal-600/15 text-teal-700 border border-teal-500/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'}
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
              {sidebarOpen && <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />}
              {!sidebarOpen && (
                <div className="absolute left-14 bg-slate-100 text-slate-950 text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-slate-200">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-200">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-950 truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-red-400 transition-colors">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 h-16 px-6 border-b border-slate-200 bg-slate-50">
          <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(!mobileOpen) }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors">
            <Menu size={18} />
          </button>
          <div className="flex-1 max-w-md relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search products, SKUs..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={openNotifications} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors">
              <Bell size={18} />
              {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-teal-600 rounded-full text-[10px] leading-4 text-white text-center">{unread}</span>}
            </button>
            {notificationOpen && (
              <div className="absolute right-6 top-14 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <div className="text-sm font-semibold text-slate-900">Notifications</div>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-slate-400 text-center">No notifications</div>
                  ) : notifications.map(notification => (
                    <button key={notification.id} onClick={() => markRead(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${notification.is_read ? '' : 'bg-teal-50/70'}`}>
                      <div className="text-sm font-medium text-slate-900">{notification.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{notification.message}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
