import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: number
  iconColor?: string
  loading?: boolean
}

export default function StatCard({ title, value, icon: Icon, change, iconColor = 'bg-teal-600/15 text-teal-600', loading }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
}
