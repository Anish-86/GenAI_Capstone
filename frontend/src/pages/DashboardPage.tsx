import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Package, AlertTriangle, ArrowLeftRight, DollarSign, ArrowUpRight, ArrowDownRight, MapPin, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { inventoryService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { DashboardStats, AdminStats } from '../types'
import { format } from 'date-fns'

const txnColors: Record<string, string> = {
  stock_in: 'text-emerald-400 bg-emerald-400/10',
  stock_out: 'text-red-400 bg-red-400/10',
  adjustment: 'text-amber-400 bg-amber-400/10',
}

const chartData = [
  { month: 'Jan', in: 420, out: 280 },
  { month: 'Feb', in: 380, out: 320 },
  { month: 'Mar', in: 520, out: 290 },
  { month: 'Apr', in: 470, out: 410 },
  { month: 'May', in: 610, out: 350 },
  { month: 'Jun', in: 540, out: 480 },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await inventoryService.dashboard()
        setStats(data)
        if (user?.role === 'super_admin') {
          const { data: ad } = await inventoryService.adminStats()
          setAdminStats(ad)
        }
      } catch {
        toast.error('Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const StatCard = ({ title, value, icon: Icon, change, color }: any) => (
    <div className="group bg-white border border-slate-200 rounded-lg p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl ${color} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-black text-slate-950 mb-1">
        {loading ? <div className="h-7 w-24 bg-slate-100 rounded animate-pulse" /> : value}
      </div>
      <div className="text-sm font-medium text-slate-500">{title}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 lg:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }} />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight lg:text-5xl">
              {user?.role === 'super_admin' ? 'Welcome , Super Admin' : `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${user?.name?.split(' ')[0]}`}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/68 lg:text-base">
              {user?.role === 'super_admin' ? 'Platform-level tenant, store, and alert analytics in one control plane.' : 'Monitor product movement, store readiness, low-stock risk, and warehouse value in real time.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:w-[360px]">
            {[
              [MapPin, 'Stores', user?.role === 'super_admin' ? adminStats?.total_stores ?? '—' : stats?.total_stores ?? '—'],
              [ShieldCheck, user?.role === 'super_admin' ? 'Tenants' : 'Health', user?.role === 'super_admin' ? adminStats?.total_tenants ?? '—' : 'Live'],
              [Package, 'Products', user?.role === 'super_admin' ? adminStats?.total_products ?? '—' : stats?.total_products ?? '—'],
            ].map(([Icon, label, val]: any) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/10 p-4">
                <Icon size={17} className="text-lime-300" />
                <div className="mt-4 text-xl font-black">{val}</div>
                <div className="text-xs text-white/52">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats?.total_products.toLocaleString() ?? '—'}
          icon={Package}
          change={12}
          color="bg-lime-100 text-slate-950"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.low_stock_count ?? '—'}
          icon={AlertTriangle}
          change={-3}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="Transactions"
          value={stats?.total_transactions.toLocaleString() ?? '—'}
          icon={ArrowLeftRight}
          change={8}
          color="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Inventory Value"
          value={stats ? `$${(stats.total_value / 1000).toFixed(1)}K` : '—'}
          icon={DollarSign}
          change={5}
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      {user?.role === 'super_admin' && adminStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tenants', val: adminStats.total_tenants },
            { label: 'Tenant Admins', val: adminStats.total_tenant_admins },
            { label: 'Inventory Managers', val: adminStats.total_inventory_managers },
            { label: 'All Products', val: adminStats.total_products.toLocaleString() },
            { label: 'Low Stock Alerts', val: adminStats.total_low_stock_alerts },
            { label: 'Active Tenants', val: adminStats.active_tenants },
            { label: 'Inactive Tenants', val: adminStats.inactive_tenants },
            { label: 'Total Transactions', val: adminStats.total_transactions.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-white/80 border border-slate-100 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">System · {s.label}</div>
              <div className="text-2xl font-bold text-slate-700">{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[2.4fr_1fr] gap-6">
        {/* Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 h-full min-h-[440px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-950 text-base">Stock Movement</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />Stock In</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block" />Stock Out</span>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#21c45d" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#21c45d" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a' }} />
                <Area type="monotone" dataKey="in" stroke="#21c45d" strokeWidth={2.5} fill="url(#gIn)" />
                <Area type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={1.5} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 h-full min-h-[440px] flex flex-col lg:max-w-[420px]">
          <h2 className="font-bold text-slate-950 text-base mb-4">Recent Activity</h2>
          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="space-y-3 flex-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-slate-100 rounded animate-pulse mb-1.5" />
                      <div className="h-2.5 w-20 bg-slate-100/80 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : stats?.recent_transactions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No recent activity</p>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {stats?.recent_transactions.slice(0, 8).map(txn => (
                  <div key={txn.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${txnColors[txn.transaction_type] || 'text-slate-600 bg-slate-100'}`}>
                      {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '−' : '~'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-950 truncate">{txn.product?.product_name || 'Product'}</div>
                      <div className="text-xs text-slate-500">{txn.quantity} units · {format(new Date(txn.timestamp), 'MMM d, HH:mm')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
