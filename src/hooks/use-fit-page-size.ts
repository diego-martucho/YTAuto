'use client'

import { useCallback, useEffect, useState } from 'react'

const MD_BREAKPOINT = 768
const LG_BREAKPOINT = 1024
const XL_BREAKPOINT = 1280

export interface FitColumns {
  base: number
  md?: number
  lg?: number
  xl?: number
}

interface UseFitPageSizeOptions {
  /** Altura fija (px) de cada fila/ítem en escritorio. */
  rowHeight: number
  /** Separación vertical (px) entre filas. */
  gap?: number
  /** Espacio fijo (px) que ocupa el contenedor además de las filas (ej: thead de una tabla). */
  reserved?: number
  /** Columnas por breakpoint (mismo criterio que las clases grid de Tailwind). */
  columns?: FitColumns
  /** Cantidad mínima de filas a mostrar aunque no entren. */
  minRows?: number
  /** Tamaño de página fijo para mobile (<768px), donde se permite scroll natural. */
  mobilePageSize?: number
}

function resolveColumns(width: number, columns: FitColumns): number {
  if (width >= XL_BREAKPOINT && columns.xl) return columns.xl
  if (width >= LG_BREAKPOINT && (columns.lg ?? columns.md)) return (columns.lg ?? columns.md)!
  if (width >= MD_BREAKPOINT && columns.md) return columns.md
  return columns.base
}

/**
 * Calcula cuántos ítems entran en el alto disponible de un contenedor (sin scroll)
 * en escritorio, recalculando al redimensionar. En mobile devuelve un tamaño fijo.
 *
 * El contenedor medido debe tener un alto definido por el layout (ej: `flex-1 min-h-0`),
 * no por su contenido.
 */
export function useFitPageSize<T extends HTMLElement = HTMLDivElement>({
  rowHeight,
  gap = 0,
  reserved = 0,
  columns = { base: 1 },
  minRows = 1,
  mobilePageSize = 8,
}: UseFitPageSizeOptions) {
  const [node, setNode] = useState<T | null>(null)
  const [pageSize, setPageSize] = useState<number | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const { base: colsBase, md: colsMd, lg: colsLg, xl: colsXl } = columns

  // Callback ref para el contenedor a medir (se nombra "measure" para no confundir al linter con un objeto ref)
  const measure = useCallback((el: T | null) => setNode(el), [])

  useEffect(() => {
    const compute = () => {
      const width = window.innerWidth
      if (width < MD_BREAKPOINT) {
        setIsDesktop(false)
        setPageSize(mobilePageSize)
        return
      }
      setIsDesktop(true)
      if (!node) return
      const available = node.clientHeight - reserved
      const rows = Math.max(minRows, Math.floor((available + gap) / (rowHeight + gap)))
      const cols = resolveColumns(width, { base: colsBase, md: colsMd, lg: colsLg, xl: colsXl })
      setPageSize(rows * cols)
    }

    compute()
    window.addEventListener('resize', compute)
    let observer: ResizeObserver | undefined
    if (node && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(compute)
      observer.observe(node)
    }
    return () => {
      window.removeEventListener('resize', compute)
      observer?.disconnect()
    }
  }, [node, rowHeight, gap, reserved, minRows, mobilePageSize, colsBase, colsMd, colsLg, colsXl])

  return { measure, pageSize, isDesktop }
}

/**
 * Paginado en cliente con clamping automático de la página actual.
 */
export function usePagination<T>(items: T[], pageSize: number | null) {
  const [page, setPage] = useState(1)
  const size = pageSize && pageSize > 0 ? pageSize : items.length || 1
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * size
  const pageItems = items.slice(start, start + size)

  return {
    page: currentPage,
    setPage,
    totalPages,
    pageItems,
    rangeStart: items.length === 0 ? 0 : start + 1,
    rangeEnd: start + pageItems.length,
    total: items.length,
  }
}
