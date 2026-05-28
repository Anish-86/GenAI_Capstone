import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../store/authStore'
import { notificationService } from '../services/api'
import type { Notification } from '../types'
import ChatWidget from '../components/common/ChatWidget'
import {
  LayoutDashboard, Package, ArrowLeftRight, Users, Building2,
  LogOut, X, ChevronRight, Bell, AlertTriangle, MapPin
} from 'lucide-react'

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/tenants', icon: Building2, label: 'Tenants', roles: ['super_admin'] },
  { to: '/app/products', icon: Package, label: 'Products', roles: ['retailer_admin', 'inventory_manager'] },
  { to: '/app/inventory', icon: ArrowLeftRight, label: 'Inventory', roles: ['retailer_admin', 'inventory_manager'] },
  { to: '/app/stores', icon: MapPin, label: 'Stores', roles: ['retailer_admin'] },
  { to: '/app/alerts', icon: AlertTriangle, label: 'Low Stock', roles: ['retailer_admin', 'inventory_manager'] },
  { to: '/app/users', icon: Users, label: 'Team', roles: ['retailer_admin'] },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [visibleNotifications, setVisibleNotifications] = useState(6)
  const [contentScrolled, setContentScrolled] = useState(false)
  const scrollTicking = useRef(false)
  const bellButtonRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const unread = notifications.filter(n => !n.is_read).length

  const handleLogout = () => { logout(); navigate('/login') }
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

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (bellButtonRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setNotificationOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const openNotifications = async () => {
    const opening = !notificationOpen
    if (opening && bellButtonRef.current) {
      const rect = bellButtonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right,
      })
      setVisibleNotifications(6)
      await loadNotifications()
    }
    setNotificationOpen(opening)
  }

  const clearNotifications = async () => {
    try { await notificationService.clearAll(); setNotifications([]); setVisibleNotifications(6) } catch {}
  }

  const markRead = async (notification: Notification) => {
    try { await notificationService.markRead(notification.id); loadNotifications() } catch {}
    setNotificationOpen(false)
    if (notification.entity_type === 'low_stock_alert' || notification.entity_type === 'complaint') {
      navigate('/app/alerts')
    }
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const handleContentScroll = (e: React.UIEvent<HTMLElement>) => {
    if (scrollTicking.current) return
    scrollTicking.current = true
    window.requestAnimationFrame(() => {
      setContentScrolled(e.currentTarget.scrollTop > 8)
      scrollTicking.current = false
    })
  }

  const notificationDropdown = notificationOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
      className="w-[min(22.5rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Notifications</div>
          <div className="mt-1 text-xs text-slate-500">Latest inventory updates</div>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={clearNotifications}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="mt-3 max-h-[min(26rem,calc(100vh-8rem))] space-y-3 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <div className="text-sm font-semibold text-slate-900">No notifications</div>
            <div className="mt-1 text-xs text-slate-500">You are all caught up for now.</div>
          </div>
        ) : notifications.slice(0, visibleNotifications).map(notification => (
          <button
            key={notification.id}
            type="button"
            onClick={() => markRead(notification)}
            className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition-all duration-200 hover:border-teal-300 hover:shadow-lg ${
              notification.is_read ? 'border-slate-200 bg-white' : 'border-teal-100 bg-teal-50/70'
            }`}
          >
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-teal-600">
              <Bell size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">{notification.title}</div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {new Date(notification.created_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-500">{notification.message}</div>
            </div>
          </button>
        ))}
      </div>
      {visibleNotifications < notifications.length && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            onClick={() => setVisibleNotifications(c => c + 6)}
            className="w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:text-slate-950 hover:border-slate-300"
          >
            Read more
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null


  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 flex flex-col h-full border-r
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-64' : 'w-16'}
        translate-x-0
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 h-20 border-b border-slate-200/70 ${sidebarOpen ? 'px-4' : 'px-3 justify-center'}`}>
          <div className={`w-10 h-10 rounded-2xl bg-slate-950 items-center justify-center flex-shrink-0 shadow-lg ${sidebarOpen ? 'flex' : 'hidden lg:hidden'}`}>
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
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors flex rounded-lg border border-slate-200/70 bg-white/70" title="Expand sidebar">
              <ChevronRight size={16} />
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
        <header className={`relative z-[80] flex items-center justify-end gap-4 h-20 px-6 border-b transition-shadow ${contentScrolled ? 'shadow-lg shadow-slate-950/5' : ''}`}>
          <div className="ml-auto flex items-center gap-2">
            <button
              ref={bellButtonRef}
              type="button"
              onClick={openNotifications}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition-all duration-200 hover:border-teal-300 hover:bg-white hover:text-teal-600 ${notificationOpen ? 'border-teal-300 bg-white text-teal-600' : ''}`}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main onScroll={handleContentScroll} className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {notificationDropdown}
      <ChatWidget />
    </div>
  )
}
