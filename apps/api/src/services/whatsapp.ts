import path from 'node:path'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import QRCode from 'qrcode'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from '@whiskeysockets/baileys'

// Unofficial (Baileys) route: this logs into a real WhatsApp account — the
// manager scans a QR code once from their phone — rather than going through
// Meta's Cloud API. Deliberately chosen for GetItDone: no business
// verification, no message-template approval, works with a personal number.
// Trade-off, documented for whoever touches this next: it's outside
// WhatsApp's terms of service, so the paired number carries some risk of
// being flagged if it sends a lot of automated traffic — fine for the
// low-volume, single-recipient reminders/invoices this is built for, not a
// fit for anything approaching bulk messaging.

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr' | 'connected'

let sock: WASocket | null = null
let status: ConnectionStatus = 'disconnected'
let currentQrDataUrl: string | null = null
let connectPromise: Promise<void> | null = null

const logger = pino({ level: 'warn' })

function getAuthDir(): string {
  return path.resolve(process.env.WHATSAPP_AUTH_DIR ?? './whatsapp-auth')
}

async function startSocket(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(getAuthDir())

  sock = makeWASocket({ auth: state, logger, printQRInTerminal: false })
  status = 'connecting'

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      status = 'qr'
      QRCode.toDataURL(qr)
        .then((dataUrl) => {
          currentQrDataUrl = dataUrl
        })
        .catch(() => {
          currentQrDataUrl = null
        })
    }

    if (connection === 'open') {
      status = 'connected'
      currentQrDataUrl = null
    }

    if (connection === 'close') {
      status = 'disconnected'
      currentQrDataUrl = null
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode
      // Any close except an explicit logout is worth retrying — matches the
      // reconnect pattern in Baileys' own docs.
      if (statusCode !== DisconnectReason.loggedOut) {
        connectPromise = null
        void ensureStarted()
      }
    }
  })
}

// Idempotent — safe to call from every request that needs the connection;
// only the first caller actually opens a socket.
function ensureStarted(): Promise<void> {
  if (!connectPromise) {
    connectPromise = startSocket()
  }
  return connectPromise
}

export async function getWhatsAppStatus(): Promise<{ status: ConnectionStatus; qrDataUrl: string | null }> {
  await ensureStarted()
  return { status, qrDataUrl: status === 'qr' ? currentQrDataUrl : null }
}

// Drops the current session so a different number can be paired — the next
// getWhatsAppStatus() call opens a fresh socket and issues a new QR code.
export async function resetWhatsAppSession(): Promise<void> {
  await sock?.logout().catch(() => {})
  sock = null
  status = 'disconnected'
  currentQrDataUrl = null
  connectPromise = null
}

export class WhatsAppNotConnectedError extends Error {
  constructor() {
    super('WhatsApp is not connected — scan the QR code first')
  }
}

// `to` is a phone number in any reasonable format (digits, +, spaces,
// dashes) — normalized to WhatsApp's <countrycode><number>@s.whatsapp.net
// JID form.
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  await ensureStarted()
  if (status !== 'connected' || !sock) throw new WhatsAppNotConnectedError()

  const digits = to.replace(/[^0-9]/g, '')
  await sock.sendMessage(`${digits}@s.whatsapp.net`, { text })
}
