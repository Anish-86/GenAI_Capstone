import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Package, ArrowLeftRight, Users, Building2,
  LogOut, Menu, X, ChevronRight, Bell, Search
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: ArrowLeftRight, label: 'Inventory' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/tenants', icon: Building2, label: 'Tenants', adminOnly: true },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(item => !item.adminOnly || user?.role === 'super_admin')

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
            <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-950 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-600 rounded-full" />
            </button>
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
