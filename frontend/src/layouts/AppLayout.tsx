import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { notificationService } from '../services/api'
import type { Notification } from '../types'
import {
  LayoutDashboard, Package, ArrowLeftRight, Users, Building2,
  LogOut, X, ChevronRight, Bell, AlertTriangle, MapPin, Sparkles
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
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [contentScrolled, setContentScrolled] = useState(false)
  const scrollTicking = useRef(false)
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
  const handleContentScroll = (event: React.UIEvent<HTMLElement>) => {
    if (scrollTicking.current) return
    scrollTicking.current = true
    window.requestAnimationFrame(() => {
      setContentScrolled(event.currentTarget.scrollTop > 8)
      scrollTicking.current = false
    })
  }

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 flex flex-col h-full border-r
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
        translate-x-0
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-20 border-b border-slate-200/70">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Package size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="font-bold text-slate-950">InventIQ</span>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Asset Command</div>
            </div>
          )}
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors hidden lg:flex">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {filteredNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-3 text-sm font-semibold transition-all duration-200 group relative
                ${isActive
                  ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/10'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'}
              `}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
              {sidebarOpen && <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />}
              {!sidebarOpen && (
                <div className="absolute left-14 bg-white text-slate-950 text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-slate-200">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="mx-3 mb-3 rounded-2xl border border-slate-200/80 bg-slate-950 p-4 text-white shadow-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-lime-300">
              <Sparkles size={13} />
              Live workspace
            </div>
            <div className="mt-2 text-sm font-semibold">Inventory flows are synced across stores.</div>
          </div>
        )}

        {/* User */}
        <div className="p-3 border-t border-slate-200/70">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-lime-300 flex items-center justify-center text-xs font-black text-slate-950 flex-shrink-0">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-950 truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</div>
              </div>
            )}
            {sidebarOpen && (
              <button onClick={handleLogout} className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-red-400 transition-colors">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className={`flex items-center justify-end gap-4 h-20 px-6 border-b transition-shadow ${contentScrolled ? 'shadow-lg shadow-slate-950/5' : ''}`}>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={openNotifications} className="relative p-2.5 hover:bg-white text-slate-600 hover:text-slate-950 transition-colors border border-slate-200/80 bg-white/60">
              <Bell size={18} />
              {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-teal-600 rounded-full text-[10px] leading-5 font-bold text-white text-center shadow-md">{unread}</span>}
            </button>
            {notificationOpen && (
              <div className="absolute right-6 top-16 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
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
        <main onScroll={handleContentScroll} className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
