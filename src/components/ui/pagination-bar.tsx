'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'

interface PaginationBarProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Texto descriptivo a la izquierda (ej: "Mostrando 1–12 de 40 canales"). */
  summary?: React.ReactNode
  /** Color de acento del botón de página activa. */
  accent?: 'indigo' | 'violet' | 'amber' | 'emerald'
  className?: string
}

const accentStyles: Record<NonNullable<PaginationBarProps['accent']>, string> = {
  indigo: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
  violet: 'bg-violet-600/20 text-violet-300 border-violet-500/30',
  amber: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
}

/** Devuelve las páginas a mostrar con elipsis: 1 … 4 5 6 … 12 */
function getPageList(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  if (start > 2) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 1) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  summary,
  accent = 'indigo',
  className,
}: PaginationBarProps) {
  const pages = getPageList(page, totalPages)

  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0',
        className
      )}
    >
      <div className="min-w-0 truncate">{summary}</div>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginación">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 border border-white/[0.06] bg-white/[0.02]"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e-${i}`} className="px-1 text-slate-600 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'h-7 min-w-7 px-2 rounded-lg border text-xs font-semibold font-mono-numbers transition-colors cursor-pointer',
                  p === page
                    ? accentStyles[accent]
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                )}
              >
                {p}
              </button>
            )
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7 border border-white/[0.06] bg-white/[0.02]"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  )
}
