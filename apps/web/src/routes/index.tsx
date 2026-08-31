import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/home/HomePage'

// Public — shows marketing/feature content when logged out; redirects to
// /dashboard when already authenticated (see HomePage).
export const Route = createFileRoute('/')({ component: HomePage })
