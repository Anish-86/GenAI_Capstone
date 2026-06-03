export type ExportColumn<T> = {
  label: string
  value: (row: T) => string | number | null | undefined
}

export type StockListRow = {
  product?: {
    product_name?: string | null
    sku?: string | null
  } | null
  store?: {
    name?: string | null
    location?: string | null
  } | null
  quantity?: number | string | null
  low_stock_threshold?: number | string | null
  status?: string | null
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(page, 1), totalPages)
  return {
    pageItems: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
    safePage,
  }
}

export function isWithinLastHours(dateLike: string, hours = 24) {
  const ts = new Date(dateLike).getTime()
  return Number.isFinite(ts) && Date.now() - ts <= hours * 60 * 60 * 1000
}

export function isBetweenDates(dateLike: string, start?: string, end?: string) {
  const ts = new Date(dateLike).getTime()
  if (!Number.isFinite(ts)) return false
  const from = start ? new Date(`${start}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
  const to = end ? new Date(`${end}T23:59:59`).getTime() : Number.POSITIVE_INFINITY
  return ts >= from && ts <= to
}

function pdfText(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function truncate(value: string | number | null | undefined, max = 28) {
  const text = String(value ?? '')
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function wrapText(line: string, maxChars = 72) {
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const wrapped: string[] = []
  let current = words[0]
  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]
    if ((current + ' ' + word).length <= maxChars) {
      current += ` ${word}`
    } else {
      wrapped.push(current)
      current = word
    }
  }
  wrapped.push(current)
  return wrapped
}

function normalizeText(value: string | number | null | undefined, fallback = 'Unknown') {
  const text = String(value ?? '').trim()
  return text || fallback
}

function makePage(lines: string[]) {
  const renderedLines = lines.flatMap(line => wrapText(line))
  return [
    'BT',
    '/F1 9 Tf',
    '42 790 Td',
    '12 TL',
    ...renderedLines.map((line, index) => `${index === 0 ? '' : 'T* '}(${pdfText(line)}) Tj`),
    'ET',
  ].join('\n')
}

function buildStockHeader(rows: StockListRow[], title = 'Current Stock List') {
  return [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    `Total Records: ${rows.length}`,
    '',
  ]
}

function buildStockBlocks(rows: StockListRow[]) {
  if (rows.length === 0) {
    return [['No records found']]
  }

  return rows.map((row, index) => {
    const productName = normalizeText(row.product?.product_name)
    const sku = normalizeText(row.product?.sku)
    const storeName = normalizeText(
      row.store?.name && row.store?.location
        ? `${row.store.name} - ${row.store.location}`
        : row.store?.name || row.store?.location,
    )
    const quantity = Number(row.quantity ?? 0)
    const threshold = Number(row.low_stock_threshold ?? 0)
    const status = normalizeText(row.status, 'Unknown')

    return [
      `${index + 1}. Product: ${productName}`,
      `SKU: ${sku}`,
      `Store: ${storeName}`,
      `Store Quantity: ${Number.isFinite(quantity) ? quantity : 0}`,
      `Low Stock Threshold: ${Number.isFinite(threshold) ? threshold : 0}`,
      `Status: ${status}`,
    ]
  })
}

export function downloadCurrentStockListPdf(filename: string, rows: StockListRow[], title = 'Current Stock List') {
  const headerLines = buildStockHeader(rows, title)
  const blocks = buildStockBlocks(rows)
  const pages: string[] = []
  const pageCapacity = 42

  let currentLines = [...headerLines]
  blocks.forEach((block, index) => {
    const linesToAdd = index === blocks.length - 1 ? block : [...block, '']
    if (currentLines.length + linesToAdd.length > pageCapacity && currentLines.length > headerLines.length) {
      pages.push(makePage(currentLines))
      currentLines = [...headerLines]
    }

    if (currentLines.length + linesToAdd.length > pageCapacity && currentLines.length === headerLines.length) {
      pages.push(makePage([...currentLines, ...linesToAdd]))
      currentLines = [...headerLines]
      return
    }

    currentLines.push(...linesToAdd)
  })

  if (currentLines.length > headerLines.length) {
    pages.push(makePage(currentLines))
  }

  if (pages.length === 0) {
    pages.push(makePage([...headerLines, 'No records found']))
  }

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]

  pages.forEach((content, index) => {
    const pageObj = 3 + index * 2
    const streamObj = pageObj + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${streamObj} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([body], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadPdf<T>(filename: string, rows: T[], columns: ExportColumn<T>[], title = filename) {
  const pageCapacity = 55
  const rowLines = rows.length
    ? rows.map(row => columns.map(col => `${col.label}: ${truncate(col.value(row))}`).join('   |   '))
    : ['No records found']
  const allLines = [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    `Records: ${rows.length}`,
    '',
    ...rowLines,
  ]
  const pages: string[] = []
  for (let i = 0; i < allLines.length; i += pageCapacity) {
    pages.push(makePage(allLines.slice(i, i + pageCapacity)))
  }

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]

  pages.forEach((content, index) => {
    const pageObj = 3 + index * 2
    const streamObj = pageObj + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${streamObj} 0 R >>`)
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })

  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach(offset => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  const blob = new Blob([body], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
