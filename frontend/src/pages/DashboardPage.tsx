import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Package, AlertTriangle, ArrowLeftRight, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import { inventoryService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { DashboardStats, AdminStats } from '../types'
import { demoAdminStats, demoDashboardStats } from '../demoData'
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
        setStats(data.total_products || data.recent_transactions?.length ? data : demoDashboardStats)
        if (user?.role === 'super_admin') {
          const { data: ad } = await inventoryService.adminStats()
          setAdminStats(ad.total_tenants ? ad : demoAdminStats)
        }
      } catch {
        setStats(demoDashboardStats)
        if (user?.role === 'super_admin') setAdminStats(demoAdminStats)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const StatCard = ({ title, value, icon: Icon, change, color }: any) => (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-950 mb-1">
        {loading ? <div className="h-7 w-24 bg-slate-100 rounded animate-pulse" /> : value}
      </div>
      <div className="text-sm text-slate-500">{title}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening with your inventory today</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:text-slate-950 hover:border-slate-300 transition-all">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats?.total_products.toLocaleString() ?? '—'}
          icon={Package}
          change={12}
          color="bg-teal-600/15 text-teal-600"
        />
        <StatCard
          title="Low Stock Items"
          value={stats?.low_stock_count ?? '—'}
          icon={AlertTriangle}
          change={-3}
          color="bg-amber-500/15 text-amber-400"
        />
        <StatCard
          title="Transactions"
          value={stats?.total_transactions.toLocaleString() ?? '—'}
          icon={ArrowLeftRight}
          change={8}
          color="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          title="Inventory Value"
          value={stats ? `$${(stats.total_value / 1000).toFixed(1)}K` : '—'}
          icon={DollarSign}
          change={5}
          color="bg-emerald-500/15 text-emerald-400"
        />
      </div>

      {user?.role === 'super_admin' && adminStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tenants', val: adminStats.total_tenants },
            { label: 'All Products', val: adminStats.total_products.toLocaleString() },
            { label: 'Active Users', val: adminStats.active_users },
            { label: 'Total Transactions', val: adminStats.total_transactions.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-white/80 border border-slate-100 rounded-lg p-4">
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-medium">System · {s.label}</div>
              <div className="text-2xl font-bold text-slate-700">{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-950 text-sm">Stock Movement</h2>
              <p className="text-xs text-slate-500 mt-0.5">Last 6 months</p>
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />Stock In</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block" />Stock Out</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
              <Area type="monotone" dataKey="in" stroke="#8b5cf6" strokeWidth={2} fill="url(#gIn)" />
              <Area type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={1.5} fill="url(#gOut)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-semibold text-slate-950 text-sm mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse mb-1.5" />
                    <div className="h-2.5 w-20 bg-slate-100/80 rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : stats?.recent_transactions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No transactions yet</p>
            ) : (
              stats?.recent_transactions.slice(0, 6).map(txn => (
                <div key={txn.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${txnColors[txn.transaction_type] || 'text-slate-600 bg-slate-100'}`}>
                    {txn.transaction_type === 'stock_in' ? '+' : txn.transaction_type === 'stock_out' ? '−' : '~'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-950 truncate">{txn.product?.product_name || 'Product'}</div>
                    <div className="text-xs text-slate-500">{txn.quantity} units · {format(new Date(txn.timestamp), 'MMM d, HH:mm')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
