import { createFileRoute } from '@tanstack/react-router'
import { NewJobFromPhotoPage } from '@/features/jobs/NewJobFromPhotoPage'

export const Route = createFileRoute('/_auth/jobs/new-photo')({ component: NewJobFromPhotoPage })
