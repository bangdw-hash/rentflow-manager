// rentflow 공용 UI 프리미티브 (V2 디자인 시스템)

export const inputClass =
  'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-900 ' +
  'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition'

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/70 ${className}`} {...rest}>
      {children}
    </div>
  )
}

const BTN = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
  secondary: 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-gray-600 hover:bg-gray-100',
  subtle: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
}
const SIZE = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-50 ${BTN[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  )
}

export function EmptyState({ icon = '📭', title, desc, action }) {
  return (
    <div className="py-14 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-gray-700 font-medium">{title}</p>
      {desc && <p className="text-sm text-gray-400 mt-1">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function StatCard({ accent = 'bg-blue-500', label, value, sub, danger }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${accent}`} />
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold tnum ${danger ? 'text-rose-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  )
}

const BADGE = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  red: 'bg-rose-50 text-rose-700 ring-rose-600/10',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/10',
}
export function Pill({ color = 'gray', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[color] || BADGE.gray}`}>
      {children}
    </span>
  )
}

// 행 액션용 아이콘 버튼 (수정/삭제)
export function IconBtn({ title, onClick, danger, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
    >
      {children}
    </button>
  )
}

export const EditIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
)
export const TrashIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></svg>
)
