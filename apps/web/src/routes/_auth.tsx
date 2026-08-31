import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/features/auth/AuthenticatedLayout'

export const Route = createFileRoute('/_auth')({
  component: () => (
    <AuthenticatedLayout>
      <Outlet />
    </AuthenticatedLayout>
  ),
})
