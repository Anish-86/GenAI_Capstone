// RegisterPage.tsx
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Package, ArrowRight, ShieldCheck } from 'lucide-react'
import { authService } from '../services/api'
import { requiredEmail, requiredPassword, requiredText } from '../utils/validation'

interface FormData { name: string; email: string; password: string; role: string }

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await authService.signup(data)
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell min-h-screen hero-panel flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md rounded-[2rem] p-8">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center">
            <Package size={18} className="text-lime-300" />
          </div>
          <span className="text-xl font-black text-slate-950">InventIQ</span>
        </div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1.5 text-xs font-bold text-slate-900">
          <ShieldCheck size={13} />
          Secure workspace setup
        </div>
        <h2 className="text-3xl font-black text-slate-950 mb-1">Create account</h2>
        <p className="text-slate-500 mb-8">Get started with your inventory workspace</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'jane@company.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{f.label}</label>
              <input {...register(f.name as any, f.name === 'name' ? requiredText('Name') : f.name === 'email' ? requiredEmail : requiredPassword)} type={f.type} placeholder={f.placeholder}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all text-sm" />
              {(errors as any)[f.name] && <p className="text-xs text-red-500 mt-1">{String((errors as any)[f.name]?.message || 'This field is mandatory')}</p>}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Role</label>
            <select {...register('role')}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-950 focus:outline-none focus:border-teal-500 transition-all text-sm">
              <option value="inventory_manager">Inventory Manager</option>
              <option value="retailer_admin">Retailer Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 font-bold py-3 rounded-full transition-colors flex items-center justify-center gap-2 text-sm mt-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight size={15} /></>}
          </button>
        </form>
        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 hover:text-teal-700 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
