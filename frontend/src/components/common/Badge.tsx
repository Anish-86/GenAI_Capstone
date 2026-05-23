import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-slate-100 text-slate-600 border-slate-200',
  success: 'bg-emerald-400/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-400/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-400/10 text-red-400 border-red-500/20',
  info: 'bg-blue-400/10 text-blue-400 border-blue-500/20',
  purple: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
}

const sizes = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
}

export default function Badge({ children, variant = 'default', size = 'md' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}
