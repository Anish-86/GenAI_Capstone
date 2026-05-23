import { useState, useEffect, useCallback } from 'react'
import { productService } from '../services/api'
import type { PaginatedProducts } from '../types'

interface UseProductsOptions {
  page?: number
  search?: string
  category?: string
  brand?: string
  lowStock?: boolean
  pageSize?: number
}

export function useProducts(options: UseProductsOptions = {}) {
  const { page = 1, search, category, brand, lowStock, pageSize = 15 } = options
  const [data, setData] = useState<PaginatedProducts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await productService.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        category: category || undefined,
        brand: brand || undefined,
        low_stock: lowStock || undefined,
      })
      setData(res)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [page, search, category, brand, lowStock, pageSize])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
