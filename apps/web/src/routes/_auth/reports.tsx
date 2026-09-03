import { createFileRoute } from '@tanstack/react-router'
import { ReportsPage } from '@/features/reports/ReportsPage'

export const Route = createFileRoute('/_auth/reports')({ component: ReportsPage })
