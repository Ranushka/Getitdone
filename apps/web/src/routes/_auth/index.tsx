import { createFileRoute } from '@tanstack/react-router'
import { JobsListPage } from '@/features/jobs/JobsListPage'

export const Route = createFileRoute('/_auth/')({ component: JobsListPage })
