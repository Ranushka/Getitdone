import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Paperclip, X, Camera as CameraIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CapturedPhoto {
  file: File
  dataUrl: string
}

export interface CameraCaptureButtonHandle {
  /** Opens the same file picker / camera overlay a tap on the button would —
   * lets a parent prompt for a photo from its own UI (e.g. a "Done" action
   * that requires one) without needing a second, hidden trigger element. */
  open: () => void
}

/**
 * Attach control: on desktop it opens the plain file picker, on touch
 * devices it opens a live camera overlay instead — matching GMS's
 * photo-capture pattern (getUserMedia + canvas snapshot), photo-only for
 * now: no torch or video recording yet, that's a deliberately deferred
 * follow-up.
 *
 * By default the icon reflects what tapping it actually does (paperclip
 * = file picker on desktop, camera = live capture on mobile). Pass `icon`
 * to override this — e.g. the "smart add" button uses a fixed wand icon
 * regardless of device, since it's a distinct feature (AI-generated
 * checklist item), not a plain attach control.
 */
export const CameraCaptureButton = forwardRef<CameraCaptureButtonHandle, {
  onCapture: (photo: CapturedPhoto) => void
  icon?: LucideIcon
  label?: string
  /** Matches Button's sm (h-9) vs default (h-10) heights so this lines up
   * with adjacent Button components instead of always being 4px taller. */
  size?: 'default' | 'sm'
}>(function CameraCaptureButton(
  { onCapture, icon: IconOverride, label = 'Capture photo', size = 'default' },
  ref,
) {
  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const Icon = IconOverride ?? (isTouchDevice ? CameraIcon : Paperclip)

  function open() {
    if (isTouchDevice) setCameraOpen(true)
    else fileInputRef.current?.click()
  }

  useImperativeHandle(ref, () => ({ open }))

  function handleFilePicked(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onCapture({ file, dataUrl: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={open}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
          size === 'sm' ? 'size-9' : 'size-10',
        )}
      >
        <Icon className={size === 'sm' ? 'size-4' : 'size-5'} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFilePicked(e.target.files)}
      />
      {cameraOpen ? (
        <CameraOverlay
          onClose={() => setCameraOpen(false)}
          onCapture={(photo) => {
            setCameraOpen(false)
            onCapture(photo)
          }}
        />
      ) : null}
    </>
  )
})

function CameraOverlay({
  onClose,
  onCapture,
}: {
  onClose: () => void
  onCapture: (photo: CapturedPhoto) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  function attachStream(video: HTMLVideoElement | null) {
    if (!video || streamRef.current) return
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        streamRef.current = stream
        video.srcObject = stream
        return video.play().catch(() => {})
      })
      .catch(() => setError('Could not access the camera.'))
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
        stopStream()
        onCapture({ file, dataUrl })
      },
      'image/jpeg',
      0.92,
    )
  }

  function handleClose() {
    stopStream()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-end p-3">
        <button
          type="button"
          onClick={handleClose}
          className="grid size-9 place-items-center rounded-full bg-black/50 text-white"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <p className="px-6 text-center text-sm text-white">{error}</p>
        ) : (
          <video ref={attachStream} className="h-full w-full object-contain" muted playsInline />
        )}
      </div>
      <div className="flex items-center justify-center p-6">
        <button
          type="button"
          onClick={capture}
          disabled={!!error}
          className="grid size-16 place-items-center rounded-full border-4 border-white bg-white/20 disabled:opacity-50"
        >
          <CameraIcon className="size-7 text-white" />
        </button>
      </div>
    </div>
  )
}
