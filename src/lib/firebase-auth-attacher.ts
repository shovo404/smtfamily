import { createMiddleware } from '@tanstack/react-start'
import { getIdToken } from 'firebase/auth'
import { auth } from '@/firebase'

export const attachFirebaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const user = auth.currentUser
    if (!user) {
      return next({ headers: {} })
    }
    try {
      const token = await getIdToken(user, true)
      return next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    } catch {
      return next({ headers: {} })
    }
  },
)
