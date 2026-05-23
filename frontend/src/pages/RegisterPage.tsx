// RegisterPage.tsx
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Package, ArrowRight } from 'lucide-react'
import { authService } from '../services/api'

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-950">InventIQ</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-950 mb-1">Create account</h2>
        <p className="text-slate-500 mb-8">Get started with your inventory workspace</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith' },
            { name: 'email', label: 'Email', type: 'email', placeholder: 'jane@company.com' },
            { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{f.label}</label>
              <input {...register(f.name as any, { required: true })} type={f.type} placeholder={f.placeholder}
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-950 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Role</label>
            <select {...register('role')}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-950 focus:outline-none focus:border-teal-500 transition-all text-sm">
              <option value="inventory_manager">Inventory Manager</option>
              <option value="retailer_admin">Retailer Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2">
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
