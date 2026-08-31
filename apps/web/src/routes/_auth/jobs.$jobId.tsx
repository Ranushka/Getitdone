import { createFileRoute } from '@tanstack/react-router'
import { JobDetailPage } from '@/features/jobs/JobDetailPage'

export const Route = createFileRoute('/_auth/jobs/$jobId')({
  component: () => {
    const { jobId } = Route.useParams()
    return <JobDetailPage jobId={Number(jobId)} />
  },
})
