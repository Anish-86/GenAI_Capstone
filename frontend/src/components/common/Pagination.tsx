import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems <= pageSize) return null

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
      <span className="text-xs font-medium text-slate-500">Page {page} of {totalPages} · {totalItems} records</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
