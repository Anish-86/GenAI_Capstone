import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, ArrowRight, BarChart3, ShieldCheck, Zap, Users,
  MapPin, AlertTriangle, CheckCircle2, Star, ChevronDown,
  TrendingUp, Activity, Boxes, ArrowLeftRight, Menu, X
} from 'lucide-react'

/* ─── Scroll-reveal hook ─────────────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

/* ─── Reveal wrapper ─────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Data ───────────────────────────────────────────────────────────────── */
const features = [
  {
    icon: Boxes,
    title: 'Real-time Stock Tracking',
    desc: 'Monitor every SKU across all warehouses and stores with live updates. Never lose track of what you have and where.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: AlertTriangle,
    title: 'Smart Low-Stock Alerts',
    desc: 'Get notified the moment inventory dips below your threshold. Set custom alerts per product, per store.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ArrowLeftRight,
    title: 'Inventory Transfers',
    desc: 'Move stock between stores seamlessly. Full audit trail of every transfer, adjustment, and restock.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Users,
    title: 'Team & Role Management',
    desc: 'Assign retailer admins and inventory managers per store. Granular permissions keep operations clean.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    desc: 'Dive into product performance, store-level trends, and team activity with real-time dashboards.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: MapPin,
    title: 'Multi-Store Operations',
    desc: 'Manage unlimited store locations under one roof. Each store gets its own inventory, team, and reporting.',
    color: 'bg-teal-50 text-teal-600',
  },
]

const steps = [
  {
    num: '01',
    title: 'Set up your workspace',
    desc: 'Create your tenant, add your stores, and invite your team in minutes. No complex onboarding.',
    checks: ['Add unlimited stores', 'Invite team members', 'Configure roles & permissions'],
  },
  {
    num: '02',
    title: 'Load your inventory',
    desc: 'Add products, assign stock to each store, and set low-stock thresholds that trigger automatic alerts.',
    checks: ['Bulk product import', 'Per-store stock assignment', 'Custom alert thresholds'],
  },
  {
    num: '03',
    title: 'Operate with confidence',
    desc: 'Track every movement, respond to alerts instantly, and make data-driven decisions from your dashboard.',
    checks: ['Live inventory dashboard', 'Instant alert notifications', 'Full audit trail'],
  },
]

const testimonials = [
  {
    quote: 'InventIQ cut our stock-out incidents by 70%. The alert system alone paid for itself in the first month.',
    name: 'Priya Sharma',
    role: 'Operations Head, RetailCo',
    initials: 'PS',
    color: 'bg-emerald-400',
  },
  {
    quote: 'Managing 12 stores used to be chaos. Now everything is in one place and my team actually uses it.',
    name: 'Rahul Mehta',
    role: 'Founder, QuickMart',
    initials: 'RM',
    color: 'bg-blue-400',
  },
  {
    quote: 'The multi-tenant setup is perfect for our franchise model. Each store is isolated but I see everything.',
    name: 'Ananya Iyer',
    role: 'CEO, FreshChain',
    initials: 'AI',
    color: 'bg-violet-400',
  },
]

const stats = [
  { value: '2M+', label: 'SKUs tracked' },
  { value: '500+', label: 'Stores managed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '70%', label: 'Fewer stock-outs' },
]

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="landing min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
              <Package size={17} className="text-emerald-400" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">InventIQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-slate-900 transition-colors">Reviews</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link to="/register" className="landing-cta-btn text-sm font-bold px-5 py-2.5 rounded-full flex items-center gap-1.5">
              Get started <ArrowRight size={14} />
            </Link>
          </div>
          <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 text-slate-600">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3">
            <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-600 py-2">Features</a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-600 py-2">How it works</a>
            <a href="#testimonials" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-slate-600 py-2">Reviews</a>
            <Link to="/login" className="block text-sm font-semibold text-slate-600 py-2">Sign in</Link>
            <Link to="/register" className="landing-cta-btn block text-center text-sm font-bold px-5 py-3 rounded-full">Get started free</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="landing-blob landing-blob-1" />
        <div className="landing-blob landing-blob-2" />
        <div className="landing-blob landing-blob-3" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 mb-8"
            style={{ animation: 'fadeUp 0.6s ease both' }}>
            <Zap size={12} />
            Inventory management, reimagined
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-6"
            style={{ animation: 'fadeUp 0.6s ease 100ms both' }}>
            Control every stock<br />
            <span className="landing-gradient-text">movement</span> from<br />
            one workspace.
          </h1>

          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ animation: 'fadeUp 0.6s ease 200ms both' }}>
            Track warehouse stock, store inventory, low-stock signals, and team activity in a clean command center built for speed and scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            style={{ animation: 'fadeUp 0.6s ease 300ms both' }}>
            <Link to="/register" className="landing-cta-btn text-base font-bold px-8 py-4 rounded-full flex items-center gap-2 shadow-lg">
              Start for free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="text-base font-semibold text-slate-600 hover:text-slate-900 transition-colors px-6 py-4 rounded-full border border-slate-200 hover:border-slate-300 bg-white">
              Sign in to dashboard
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500"
            style={{ animation: 'fadeUp 0.6s ease 400ms both' }}>
            <div className="flex -space-x-2">
              {['bg-emerald-400', 'bg-blue-400', 'bg-violet-400', 'bg-amber-400'].map((c, i) => (
                <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-white flex items-center justify-center text-[9px] font-black text-white`}>
                  {['P', 'R', 'A', 'S'][i]}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
            </div>
            <span className="font-semibold text-slate-700">500+ teams</span> rely on InventIQ
          </div>
        </div>

        {/* Hero dashboard mockup */}
        <div className="relative max-w-5xl mx-auto mt-16" style={{ animation: 'fadeUp 0.8s ease 500ms both' }}>
          <div className="landing-mockup rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            {/* Mockup topbar */}
            <div className="bg-slate-900 px-5 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <div className="ml-4 flex-1 bg-slate-700 rounded-full h-5 max-w-xs" />
            </div>
            {/* Mockup body */}
            <div className="bg-slate-50 p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Total SKUs', value: '2,847', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Low Stock', value: '14', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Stores', value: '12', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Transfers', value: '38', color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(card => (
                <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-white`}>
                  <div className={`text-2xl font-black ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">{card.label}</div>
                </div>
              ))}
              <div className="col-span-3 bg-white rounded-xl p-4 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Inventory Activity</div>
                <div className="flex items-end gap-1.5 h-16">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-emerald-400 opacity-80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Stock Health</div>
                <div className="flex items-center justify-center h-16">
                  <div className="relative w-14 h-14">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#34d399" strokeWidth="3"
                        strokeDasharray="84 16" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-900">84%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-emerald-400/20 blur-3xl rounded-full" />
        </div>

        {/* Scroll cue */}
        <div className="flex justify-center mt-16" style={{ animation: 'bounce 2s infinite 1s' }}>
          <a href="#features" className="flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <span>Scroll to explore</span>
            <ChevronDown size={16} />
          </a>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <div className="text-4xl font-black text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1 font-medium">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-600 mb-5">
              <Activity size={12} />
              Everything you need
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Built for modern<br />inventory operations
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              From a single store to a nationwide chain — InventIQ scales with you.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="landing-feature-card group rounded-2xl border border-slate-100 bg-white p-6 hover:border-slate-200 hover:shadow-lg transition-all duration-300">
                  <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-5`}>
                    <f.icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 mb-5">
              <TrendingUp size={12} />
              Simple setup
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Up and running<br />in 30 seconds
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              No complex onboarding. No lengthy setup. Just sign up and start managing.
            </p>
          </Reveal>

          <div className="space-y-6">
            {steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
                <div className="landing-step-card flex flex-col md:flex-row gap-8 rounded-2xl bg-white border border-slate-100 p-8 hover:border-slate-200 hover:shadow-md transition-all duration-300">
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-emerald-400 text-xl font-black">
                      {step.num}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-slate-500 mb-5 leading-relaxed">{step.desc}</p>
                    <ul className="space-y-2">
                      {step.checks.map(c => (
                        <li key={c} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {i === 0 && (
                    <div className="hidden lg:flex flex-shrink-0 w-48 flex-col gap-2 justify-center">
                      {['Stores', 'Team', 'Roles'].map((t, j) => (
                        <div key={t} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                          <div className={`w-2 h-2 rounded-full ${['bg-emerald-400', 'bg-blue-400', 'bg-violet-400'][j]}`} />
                          <span className="text-xs font-semibold text-slate-600">{t} configured</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {i === 1 && (
                    <div className="hidden lg:flex flex-shrink-0 w-48 flex-col gap-2 justify-center">
                      {['Products loaded', 'Stock assigned', 'Alerts set'].map((t, j) => (
                        <div key={t} className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                          <CheckCircle2 size={13} className={['text-emerald-500', 'text-emerald-500', 'text-amber-500'][j]} />
                          <span className="text-xs font-semibold text-slate-600">{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {i === 2 && (
                    <div className="hidden lg:flex flex-shrink-0 w-48 flex-col gap-2 justify-center">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                        <div className="text-xs font-bold text-emerald-700">Live Dashboard</div>
                        <div className="text-[10px] text-emerald-600 mt-0.5">All stores synced</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <div className="text-xs font-bold text-amber-700">Alert triggered</div>
                        <div className="text-[10px] text-amber-600 mt-0.5">Store B · SKU-441</div>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold text-slate-600 mb-5">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              Customer stories
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              Loved by operations<br />teams everywhere
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 100}>
                <div className="landing-testimonial-card rounded-2xl border border-slate-100 bg-white p-6 hover:border-slate-200 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  <div className="flex gap-0.5 mb-5">
                    {[...Array(5)].map((_, j) => <Star key={j} size={14} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-xs font-black text-white`}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="landing-cta-section rounded-3xl p-12 text-center relative overflow-hidden">
              <div className="landing-cta-blob-1" />
              <div className="landing-cta-blob-2" />
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
                  Ready to take control<br />of your inventory?
                </h2>
                <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
                  Join 500+ teams who use InventIQ to run leaner, faster operations.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/register" className="landing-cta-btn-white text-base font-bold px-8 py-4 rounded-full flex items-center gap-2">
                    Get started free <ArrowRight size={16} />
                  </Link>
                  <Link to="/login" className="text-base font-semibold text-white/80 hover:text-white transition-colors px-6 py-4">
                    Sign in →
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Package size={14} className="text-emerald-400" />
            </div>
            <span className="font-black text-slate-900">InventIQ</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <Link to="/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-slate-900 transition-colors">Get started</Link>
          </div>
          <div className="text-xs text-slate-400">© 2026 InventIQ. All rights reserved.</div>
        </div>
      </footer>

    </div>
  )
}
