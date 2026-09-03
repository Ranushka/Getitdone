import { createFileRoute } from '@tanstack/react-router'
import { WhatsAppPage } from '@/features/whatsapp/WhatsAppPage'

export const Route = createFileRoute('/_auth/whatsapp')({ component: WhatsAppPage })
