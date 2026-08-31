import { createFileRoute } from '@tanstack/react-router'
import { NewJobPage } from '@/features/jobs/NewJobPage'

export const Route = createFileRoute('/_auth/jobs/new')({ component: NewJobPage })
