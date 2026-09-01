import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { cn } from '@/lib/utils'

export interface SignaturePadHandle {
  isEmpty: () => boolean
  clear: () => void
  /** Exports the drawn strokes as a transparent-background PNG blob. */
  toBlob: () => Promise<Blob | null>
}

function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

/**
 * A finger/stylus/mouse signature pad — draws to a canvas sized for the
 * device's pixel ratio so it stays crisp, and exports the result as a PNG
 * (transparent background) for upload through the same /api/upload path
 * used for photo attachments.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { className?: string; onChange?: (hasInk: boolean) => void }>(
  function SignaturePad({ className, onChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const hasInk = useRef(false)
    const lastPoint = useRef<{ x: number; y: number } | null>(null)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#111'
    }, [])

    useImperativeHandle(ref, () => ({
      isEmpty: () => !hasInk.current,
      clear: () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
        hasInk.current = false
        onChange?.(false)
      },
      toBlob: () =>
        new Promise((resolve) => {
          const canvas = canvasRef.current
          if (!canvas || !hasInk.current) return resolve(null)
          canvas.toBlob((blob) => resolve(blob), 'image/png')
        }),
    }))

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      e.currentTarget.setPointerCapture(e.pointerId)
      drawing.current = true
      lastPoint.current = getPoint(e)
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx || !lastPoint.current) return
      const point = getPoint(e)
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
      lastPoint.current = point
      if (!hasInk.current) {
        hasInk.current = true
        onChange?.(true)
      }
    }

    function handlePointerUp() {
      drawing.current = false
      lastPoint.current = null
    }

    return (
      <canvas
        ref={canvasRef}
        className={cn('touch-none rounded-md border border-input bg-white', className)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    )
  },
)
