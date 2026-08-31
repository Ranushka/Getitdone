import { createFileRoute } from '@tanstack/react-router'
import { TechnicianJobPage } from '@/features/technician/TechnicianJobPage'

// Public route — the token itself is the access control, no _auth guard.
export const Route = createFileRoute('/t/$token')({
  component: () => {
    const { token } = Route.useParams()
    return <TechnicianJobPage token={token} />
  },
})
