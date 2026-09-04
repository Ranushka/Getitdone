import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage } from '@/features/jobs/CalendarPage'

export const Route = createFileRoute('/_auth/calendar')({ component: CalendarPage })
