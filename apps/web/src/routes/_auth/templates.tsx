import { createFileRoute } from '@tanstack/react-router'
import { TemplatesPage } from '@/features/templates/TemplatesPage'

export const Route = createFileRoute('/_auth/templates')({ component: TemplatesPage })
