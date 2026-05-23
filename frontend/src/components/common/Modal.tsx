import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white border border-slate-200 rounded-lg w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-950 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
