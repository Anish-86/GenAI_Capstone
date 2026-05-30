import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Package, Eye, EyeOff, ArrowRight, Boxes, Activity, ShieldCheck } from 'lucide-react'
import { authService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { requiredEmail, requiredPassword } from '../utils/validation'

interface FormData { email: string; password: string }

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { data: tokens } = await authService.login(data.email, data.password)
      const { data: user } = await authService.profile(tokens.access_token)
      setAuth(user, tokens.access_token, tokens.refresh_token)
      toast.success('Welcome back!')
      navigate('/app/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell min-h-screen hero-panel flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden p-12 text-white">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-2xl bg-lime-300 flex items-center justify-center">
              <Package size={20} className="text-slate-950" />
            </div>
            <span className="text-xl font-bold">InventIQ</span>
          </div>

          <div className="mt-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-lime-200">
              <ShieldCheck size={14} />
              Modern inventory operations
            </div>
            <h1 className="mt-6 text-5xl font-black leading-tight">
              Control every stock movement from one intelligent workspace.
            </h1>
            <p className="mt-5 text-white/72 text-lg leading-relaxed">
              Track warehouse stock, store inventory, low-stock signals, and team activity in a clean command center built for speed.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-3">
            {[
              { label: 'Live SKUs', value: '2M+' },
              { label: 'Transfers', value: '50K+' },
              { label: 'Uptime', value: '99.9%' },
            ].map(stat => (
              <div key={stat.label} className="rounded-2xl border border-white/12 bg-white/8 p-4">
                <div className="text-2xl font-black text-lime-200">{stat.value}</div>
                <div className="text-sm text-white/58 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="inventory-visual relative z-10 mt-auto rounded-[2rem] border border-white/12 p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Inventory pulse</div>
              <div className="text-xs text-white/50">Warehouse to stores</div>
            </div>
            <div className="rounded-full bg-lime-300 px-3 py-1 text-xs font-bold text-slate-950">Live</div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              [Boxes, 'Stock', '84%'],
              [Activity, 'Flow', '+18%'],
              [ShieldCheck, 'Risk', 'Low'],
            ].map(([Icon, label, value]: any) => (
              <div key={label} className="rounded-2xl bg-white/10 p-4">
                <Icon size={18} className="text-lime-300" />
                <div className="mt-5 text-xl font-black">{value}</div>
                <div className="text-xs text-white/50">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-20 rounded-2xl bg-white/10 p-3">
            <div className="h-full rounded-xl bg-gradient-to-r from-lime-300 via-cyan-300 to-blue-400 opacity-80" />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-8">
        <div className="glass-card w-full max-w-md rounded-[2rem] p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-9 h-9 rounded-2xl bg-slate-950 flex items-center justify-center">
                <Package size={16} className="text-lime-300" />
              </div>
              <span className="font-bold text-slate-950">InventIQ</span>
            </div>
            <h2 className="text-4xl font-bold text-slate-950 mb-2">Welcome back</h2>
            <p className="text-slate-500">Enter your credentials to access your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
              <input
                {...register('email', requiredEmail)}
                type="email"
                placeholder="you@company.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all text-sm"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password', requiredPassword)}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 hover:text-teal-700 transition-colors">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
