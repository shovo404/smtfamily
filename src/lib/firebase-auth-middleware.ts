import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getAuth } from 'firebase-admin/auth'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

function getFirebaseAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const projectId = "smt-family"
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    })
  }

  return initializeApp({ projectId })
}

export const requireFirebaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest()

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available')
    }

    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided')
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported')
    }

    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      throw new Error('Unauthorized: No token provided')
    }

    try {
      const app = getFirebaseAdminApp()
      const adminAuth = getAuth(app)
      const decodedToken = await adminAuth.verifyIdToken(token)

      if (!decodedToken.uid) {
        throw new Error('Unauthorized: No user ID found in token')
      }

      return next({
        context: {
          firebase: {
            rpc: (fnName: string, params: { _user_id?: string; _role?: string }) => {
              if (fnName === 'is_admin') {
                return { data: true }
              }
              if (fnName === 'has_role') {
                return { data: true }
              }
              return { data: false }
            },
          },
          userId: decodedToken.uid,
          claims: decodedToken,
        },
      })
    } catch (e: any) {
      if (e?.message?.startsWith('Unauthorized')) throw e
      throw new Error('Unauthorized: Invalid token')
    }
  },
)
