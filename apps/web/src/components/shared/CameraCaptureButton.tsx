import { useRef, useState } from 'react'
import { Wand2, X, Camera as CameraIcon } from 'lucide-react'

export interface CapturedPhoto {
  file: File
  dataUrl: string
}

/**
 * Magic-wand attach button. On desktop it opens the plain file picker (same
 * as the existing paperclip attach control). On touch devices it opens a
 * live camera overlay instead — matching GMS's photo-capture pattern
 * (getUserMedia + canvas snapshot), photo-only for now: no torch or video
 * recording yet, that's a deliberately deferred follow-up.
 */
export function CameraCaptureButton({ onCapture }: { onCapture: (photo: CapturedPhoto) => void }) {
  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

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
        aria-label="Capture photo"
        onClick={() => (isTouchDevice ? setCameraOpen(true) : fileInputRef.current?.click())}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-input bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Wand2 className="size-5" />
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
}

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
