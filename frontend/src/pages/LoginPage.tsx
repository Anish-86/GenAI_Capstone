import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Package, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { authService } from '../services/api'
import { useAuthStore } from '../store/authStore'

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
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-white relative overflow-hidden p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-100 via-transparent to-indigo-100" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-950">InventIQ</span>
          </div>

          <div className="mt-12">
            <h1 className="text-4xl font-bold text-slate-950 leading-tight mb-4">
              Inventory<br />management<br />reimagined.
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed">
              Multi-tenant, role-based, and built for scale. Track every product, every movement, every moment.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4">
            {[
              { label: 'Tenants', value: '500+' },
              { label: 'Products tracked', value: '2M+' },
              { label: 'Transactions/day', value: '50K+' },
              { label: 'Uptime', value: '99.9%' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 border border-slate-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-slate-950">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center">
                <Package size={16} className="text-white" />
              </div>
              <span className="font-semibold text-slate-950">InventIQ</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-950 mb-2">Sign in</h2>
            <p className="text-slate-500">Enter your credentials to access your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Email</label>
              <input
                {...register('email', { required: 'Email is required' })}
                type="email"
                placeholder="you@company.com"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all text-sm"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all text-sm"
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
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2"
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
