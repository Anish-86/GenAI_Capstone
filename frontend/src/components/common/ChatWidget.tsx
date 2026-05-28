import { useState } from 'react'
import { Bot, MessageCircle, Send, X } from 'lucide-react'
import { assistantService } from '../../services/api'

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'I am your assistant. Ask me about your InventIQ workspace, alerts, products, stores, tenants, or how to use this app.' },
  ])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: message }])
    setLoading(true)
    try {
      const { data } = await assistantService.chat(message)
      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'I could not reach the assistant service right now.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[120]">
      {open && (
        <div className="mb-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Bot size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950">Ask IQ</div>
                <div className="text-xs text-slate-500">Your workspace assistant</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-950">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-5 ${message.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {message.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-slate-400">Thinking...</div>}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Ask anything about your data..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            />
            <button disabled={!input.trim() || loading} className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen(value => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition-transform hover:-translate-y-0.5"
        title="Open assistant"
      >
        <div className="flex flex-col items-center leading-none">
          <MessageCircle size={17} />
          <span className="mt-0.5 text-[9px] font-bold">Ask IQ</span>
        </div>
      </button>
    </div>
  )
}
