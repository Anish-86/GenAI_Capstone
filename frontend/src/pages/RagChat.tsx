import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Bot, ChevronDown, FileUp, MessageSquareText, Send, Sparkles, UploadCloud } from 'lucide-react'
import { ragService } from '../services/api'

type RagSource = {
  chunk_id: string
  chunk_index: number
  score: number
  page_number?: number | null
  excerpt: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: RagSource[]
  error?: boolean
}

export default function RagChat() {
  const [file, setFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [useLatestDocument, setUseLatestDocument] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const canAsk = useMemo(() => Boolean(question.trim()) && !loading, [question, loading])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    if (selected && selected.type !== 'application/pdf') {
      toast.error('Please choose a PDF file.')
      event.target.value = ''
      setFile(null)
      return
    }
    setFile(selected)
  }

  const uploadPdf = async () => {
    if (!file || uploading) return
    setUploading(true)
    try {
      const { data } = await ragService.upload(file)
      setDocumentId(data.document_id)
      setSessionId(null)
      setUseLatestDocument(false)
      toast.success('PDF uploaded successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload PDF')
    } finally {
      setUploading(false)
    }
  }

  const askQuestion = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading) return

    const userMessage: Message = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMessage])
    setQuestion('')
    setLoading(true)

    try {
      const payload: { question: string; document_id?: string | null; session_id?: string | null } = { question: trimmed }
      if (!useLatestDocument && documentId) {
        payload.document_id = documentId
      }
      if (sessionId) {
        payload.session_id = sessionId
      }
      const { data } = await ragService.ask(payload)
      if (data.session_id) {
        setSessionId(data.session_id)
      }
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
        },
      ])
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to get answer'
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: message,
          error: true,
        },
      ])
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const resetSession = () => {
    setMessages([])
    setQuestion('')
    setSessionId(null)
    toast.success('Chat cleared')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <Sparkles size={12} />
            Assistant
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Inventory PDF Q&A</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Upload a stock report, then ask grounded questions against the indexed PDF content.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetSession}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
          >
            Clear chat
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Upload Panel */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <FileUp size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Upload Inventory PDF</h2>
                <p className="text-xs text-slate-500">PDF only. The latest upload can be used automatically.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Choose file</span>
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 transition hover:border-teal-300 hover:bg-teal-50/40">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={onFileChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                />
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <UploadCloud size={14} />
                  {file ? file.name : 'No file selected yet'}
                </div>
              </div>
            </label>

            <button
              type="button"
              onClick={uploadPdf}
              disabled={!file || uploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </button>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={useLatestDocument}
                onChange={event => setUseLatestDocument(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">Use latest document</div>
              </div>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upload status</div>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">State</span>
                  <span className={`font-semibold ${uploading ? 'text-amber-600' : documentId ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {uploading ? 'Uploading' : documentId ? 'Ready' : 'Waiting'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-slate-500">Document ID</span>
                  <span className="max-w-[190px] break-all text-right font-mono text-xs text-slate-900">
                    {documentId || 'Not uploaded yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chat Panel */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-700 text-white">
                <Bot size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">Ask the report</h2>
                <p className="text-xs text-slate-500">Grounded answers with sources from the uploaded PDF.</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex">
              <MessageSquareText size={14} />
              {/* {documentId ? 'Indexed document ready' : 'No document selected'} */}
            </div>
          </div>

          <div className="flex h-[620px] flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Sparkles size={20} />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-950">Start the conversation</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Upload a PDF first, then ask things like stock levels, low stock items, or “List out all the products in the document”.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[92%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[80%] ${message.role === 'user' ? 'bg-blue-600 text-white' : message.error ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>
                      <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                      {message.sources && message.sources.length > 0 && (
                        <details className="mt-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Sources ({message.sources.length})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {message.sources.map(source => (
                              <div key={source.chunk_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                                  <span>Chunk {source.chunk_index}</span>
                                  {typeof source.page_number === 'number' && <span>Page {source.page_number}</span>}
                                  <span>Score {source.score.toFixed(4)}</span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-slate-600">{source.excerpt}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 shadow-sm">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={askQuestion} className="border-t border-slate-100 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={question}
                  onChange={event => setQuestion(event.target.value)}
                  placeholder="Ask about products, stock levels, thresholds, or summaries..."
                  disabled={loading}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!canAsk}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send size={15} />
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
