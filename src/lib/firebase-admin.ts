import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const projectId = "smt-family";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  return initializeApp({ projectId });
}

const adminApp = getFirebaseAdminApp();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

class DeleteBuilder implements PromiseLike<{ data: null; error: null }> {
  private colRef: FirebaseFirestore.CollectionReference;
  private constraints: { field: string; op: string; value: any }[] = [];

  constructor(colRef: FirebaseFirestore.CollectionReference) {
    this.colRef = colRef;
  }

  eq(field: string, value: any): this {
    this.constraints.push({ field, op: "==", value });
    return this;
  }

  gte(field: string, value: any): this {
    this.constraints.push({ field, op: ">=", value });
    return this;
  }

  lte(field: string, value: any): this {
    this.constraints.push({ field, op: "<=", value });
    return this;
  }

  then<T1 = { data: null; error: null }, T2 = never>(
    onfulfilled?: ((value: { data: null; error: null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: null; error: { message: string } | null }> {
    let query: FirebaseFirestore.Query = this.colRef;
    for (const c of this.constraints) {
      query = query.where(c.field, c.op as any, c.value);
    }
    const snap = await query.get();
    if (snap.empty) return { data: null, error: { message: "No matching document found for delete" } };
    for (const d of snap.docs) await d.ref.delete();
    return { data: null, error: null };
  }
}

export const firebaseAdmin = {
  auth: {
    admin: {
      createUser: async (props: { email: string; password: string; email_confirm?: boolean; user_metadata?: Record<string, any> }) => {
        try {
          const user = await adminAuth.createUser({
            email: props.email,
            password: props.password,
            emailVerified: props.email_confirm ?? false,
            displayName: props.user_metadata?.full_name,
          });
          return { data: { user: { id: user.uid, email: user.email } }, error: null };
        } catch (e: any) {
          return { data: null, error: { message: e.message || "Failed to create user" } };
        }
      },
      updateUserById: async (uid: string, props: { password?: string }) => {
        try {
          await adminAuth.updateUser(uid, { password: props.password });
          return { error: null };
        } catch (e: any) {
          return { error: { message: e.message || "Failed to update user" } };
        }
      },
      deleteUser: async (uid: string) => {
        try {
          await adminAuth.deleteUser(uid);
          return { error: null };
        } catch (e: any) {
          return { error: { message: e.message || "Failed to delete user" } };
        }
      },
    },
  },
  from: (table: string) => {
    const colRef = adminDb.collection(table);
    const constraints: { field: string; op: string; value: any }[] = [];
    let limitCount: number | undefined;

    const base = {
      eq: (field: string, value: any) => {
        constraints.push({ field, op: "==", value });
        return base;
      },
      in: (field: string, values: any[]) => {
        constraints.push({ field, op: "in", value: values });
        return base;
      },
      gte: (field: string, value: any) => {
        constraints.push({ field, op: ">=", value });
        return base;
      },
      lte: (field: string, value: any) => {
        constraints.push({ field, op: "<=", value });
        return base;
      },
      order: (_field: string, _opts?: { ascending?: boolean }) => base,
      limit: (n: number) => { limitCount = n; return base; },
      select: (_fields?: string, _opts?: any) => base,
    };

    return {
      select: (_fields?: string, _opts?: any) => ({
        ...base,
        then: <T1 = { data: any[]; error: null }, T2 = never>(
          onfulfilled?: ((v: { data: any[]; error: null }) => T1 | PromiseLike<T1>) | null,
          onrejected?: ((r: any) => T2 | PromiseLike<T2>) | null,
        ) => (async () => {
          let query: FirebaseFirestore.Query = colRef;
          for (const c of constraints) {
            query = query.where(c.field, c.op as any, c.value);
          }
          if (limitCount) query = query.limit(limitCount);
          const snap = await query.get();
          return { data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null };
        })().then(onfulfilled, onrejected) as any,
      }),
      insert: async (data: Record<string, any>) => {
        try {
          const docId = data.id || colRef.doc().id;
          const docRef = colRef.doc(docId);
          await docRef.set({ ...data, id: docId });
          return { data: { id: docId, ...data }, error: null };
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      },
      upsert: async (data: Record<string, any>, opts?: { onConflict?: string }) => {
        try {
          if (opts?.onConflict) {
            const conflictFields = opts.onConflict.split(",").map((s) => s.trim());
            let query: FirebaseFirestore.Query = colRef;
            for (const f of conflictFields) {
              query = query.where(f, "==", data[f]);
            }
            const snap = await query.get();
            if (!snap.empty) {
              const existing = snap.docs[0];
              const docData = { ...data, id: existing.id };
              await existing.ref.update(docData);
              return { data: { id: existing.id, ...data }, error: null };
            }
          }
          const docId = data.id || colRef.doc().id;
          const docRef = colRef.doc(docId);
          await docRef.set({ ...data, id: docId });
          return { data: { id: docId, ...data }, error: null };
        } catch (e: any) {
          return { data: null, error: { message: e.message } };
        }
      },
      update: (patch: Record<string, any>) => ({
        eq: async (field: string, value: any) => {
          try {
            const snap = await colRef.where(field, "==", value).get();
            if (snap.empty) return { error: { message: "No matching document found for update" } };
            for (const d of snap.docs) await d.ref.update(patch);
            return { data: null, error: null };
          } catch (e: any) {
            return { error: { message: e.message } };
          }
        },
      }),
      delete: () => new DeleteBuilder(colRef),
    };
  },
};
