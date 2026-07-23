import {
  type User,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  type UploadMetadata,
} from "firebase/storage";
import { auth, firestore, storage } from "@/firebase";

function toFirebaseUser(user: User | null) {
  if (!user) return null;
  return {
    id: user.uid,
    email: user.email,
    user_metadata: user.providerData?.[0] || {},
    app_metadata: {},
    aud: "firebase",
    created_at: user.metadata.creationTime || "",
  };
}

const firebaseAuth = {
  getSession: async () => {
    const user = auth.currentUser;
    if (!user) return { data: { session: null }, error: null };
    const token = await getIdToken(user, true);
    return {
      data: {
        session: {
          access_token: token,
          user: toFirebaseUser(user),
          expires_in: 3600,
        },
      },
      error: null,
    };
  },

  getUser: async () => {
    const user = auth.currentUser;
    if (!user) return { data: { user: null }, error: null };
    await user.reload();
    return { data: { user: toFirebaseUser(user) }, error: null };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const unsubscribe = firebaseOnAuthStateChanged(auth, (user) => {
      if (user) {
        callback("SIGNED_IN", { user: toFirebaseUser(user) });
      } else {
        callback("SIGNED_OUT", null);
      }
    });
    return { data: { subscription: { unsubscribe } } };
  },

  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { data: { user: toFirebaseUser(cred.user) }, error: null };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message || "Authentication failed" } };
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (e: any) {
      return { error: { message: e.message || "Sign out failed" } };
    }
  },

  getClaims: async (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return { data: { claims: payload }, error: null };
    } catch {
      return { data: null, error: new Error("Invalid token") };
    }
  },

  setSession: async (_tokens: { access_token?: string; refresh_token?: string }) => {
    return { data: null, error: null };
  },
};

type JoinDef = {
  alias: string;
  refField: string;
  refTable: string;
  refColumns: string[];
};

function parseFieldList(fields: string): { columns: string[]; joins: JoinDef[] } {
  const parts = fields.split(",").map((s) => s.trim());
  const columns: string[] = [];
  const joins: JoinDef[] = [];
  const tableMap: Record<string, string> = {
    actor_user_id: "profiles",
  };
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx > 0) {
      const alias = part.slice(0, colonIdx).trim();
      const rest = part.slice(colonIdx + 1).trim();
      const parenOpen = rest.indexOf("(");
      if (parenOpen >= 0) {
        const refField = rest.slice(0, parenOpen).trim();
        const inner = rest.slice(parenOpen + 1, rest.lastIndexOf(")"));
        const refColumns = inner.split(",").map((s) => s.trim());
        const refTable = tableMap[refField] || refField.replace(/_id$/, "s");
        joins.push({ alias, refField, refTable, refColumns });
      }
    } else {
      columns.push(part);
    }
  }
  return { columns, joins };
}

type QueryResult = { data: any; error: any; count?: number };

class FirestoreQueryBuilder implements PromiseLike<QueryResult> {
  private table: string;
  private constraints: QueryConstraint[] = [];
  private countQuery = false;
  private getSingle = false;
  private joins: JoinDef[] = [];
  private insertPayload: Record<string, any> | null = null;
  private upsertPayload: { data: Record<string, any>; onConflict?: string } | null = null;
  private updatePayload: Record<string, any> | null = null;
  private isDeleteOp = false;
  private executed = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string, opts?: { count?: "exact"; head?: boolean }): this {
    if (opts?.count === "exact") {
      this.countQuery = true;
    }
    if (fields) {
      const parsed = parseFieldList(fields);
      this.joins = parsed.joins;
    }
    return this;
  }

  eq(field: string, value: any): this {
    if (value !== undefined && value !== null) {
      this.constraints.push(where(field, "==", value));
    }
    return this;
  }

  neq(field: string, value: any): this {
    this.constraints.push(where(field, "!=", value));
    return this;
  }

  gt(field: string, value: any): this {
    this.constraints.push(where(field, ">", value));
    return this;
  }

  gte(field: string, value: any): this {
    this.constraints.push(where(field, ">=", value));
    return this;
  }

  lt(field: string, value: any): this {
    this.constraints.push(where(field, "<", value));
    return this;
  }

  lte(field: string, value: any): this {
    this.constraints.push(where(field, "<=", value));
    return this;
  }

  in(field: string, values: any[]): this {
    if (values.length > 0) {
      this.constraints.push(where(field, "in", values));
    }
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this.constraints.push(orderBy(field, opts?.ascending !== false ? "asc" : "desc"));
    return this;
  }

  limit(n: number): this {
    this.constraints.push(limit(n));
    return this;
  }

  maybeSingle(): this {
    this.getSingle = true;
    return this;
  }

  single(): this {
    this.getSingle = true;
    return this;
  }

  insert(data: Record<string, any>): this {
    this.insertPayload = data;
    return this;
  }

  upsert(data: Record<string, any>, opts?: { onConflict?: string }): this {
    this.upsertPayload = { data, onConflict: opts?.onConflict };
    return this;
  }

  update(data: Record<string, any>): this {
    this.updatePayload = data;
    return this;
  }

  delete(): this {
    this.isDeleteOp = true;
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<any> {
    if (this.executed) return { data: null, error: null };
    this.executed = true;
    try {
      const db = firestore;
      const colRef = collection(db, this.table);

      if (this.insertPayload) {
        return await this.doInsert(colRef, this.insertPayload);
      }
      if (this.upsertPayload) {
        return await this.doUpsert(colRef, this.upsertPayload);
      }
      if (this.isDeleteOp) {
        return await this.doDelete(colRef);
      }
      if (this.updatePayload) {
        return await this.doUpdate(colRef);
      }

      if (this.countQuery) {
        const q = query(colRef, ...this.constraints);
        const snapshot = await getCountFromServer(q);
        return { data: null, count: snapshot.data().count, error: null };
      }

      const q = query(colRef, ...this.constraints);
      const snapshot = await getDocs(q);

      let data: any;
      if (this.getSingle) {
        if (snapshot.empty) {
          data = null;
        } else {
          const docSnap = snapshot.docs[0];
          data = { id: docSnap.id, ...docSnap.data() };
        }
      } else {
        data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      }

      if (this.joins.length > 0 && data) {
        const rows = Array.isArray(data) ? data : [data];
        for (const join of this.joins) {
          const refIds = [...new Set(rows.map((r: any) => r[join.refField]).filter(Boolean))];
          if (refIds.length === 0) {
            for (const row of rows) row[join.alias] = null;
            continue;
          }
          const refCol = collection(db, join.refTable);
          const refQuery = query(refCol, where("__name__", "in", refIds.slice(0, 30)));
          const refSnap = await getDocs(refQuery);
          const refMap = new Map(refSnap.docs.map((d) => [d.id, d.data()]));
          for (const row of rows) {
            const refData = refMap.get(row[join.refField]);
            if (refData) {
              const picked: Record<string, any> = {};
              for (const c of join.refColumns) {
                if (c === "*") Object.assign(picked, refData);
                else picked[c] = refData[c];
              }
              row[join.alias] = picked;
            } else {
              row[join.alias] = null;
            }
          }
        }
        if (this.getSingle && Array.isArray(data)) data = data[0] || null;
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message, details: error } };
    }
  }

  private async doInsert(colRef: any, data: Record<string, any>) {
    const payload = { ...data };
    let docRef;
    if (payload.id && payload.id !== "") {
      const docData = { ...payload, id: payload.id };
      await setDoc(doc(colRef, payload.id), docData);
      docRef = doc(colRef, payload.id);
    } else {
      docRef = doc(colRef);
      const docId = docRef.id;
      await setDoc(docRef, { ...payload, id: docId });
    }
    return { data: { id: docRef.id, ...payload }, error: null };
  }

  private async doUpsert(colRef: any, opts: { data: Record<string, any>; onConflict?: string }) {
    const payload = { ...opts.data };
    if (opts.onConflict) {
      const conflictFields = opts.onConflict.split(",").map((s) => s.trim());
      const conflictConstraints = conflictFields.map((f) => where(f, "==", payload[f]));
      const q = query(colRef, ...conflictConstraints);
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0];
        const docData = { ...payload, id: existing.id };
        await updateDoc(doc(colRef, existing.id), docData);
        return { data: { id: existing.id, ...payload }, error: null };
      }
    }
    let docRef;
    if (payload.id && payload.id !== "") {
      const docData = { ...payload, id: payload.id };
      await setDoc(doc(colRef, payload.id), docData);
      docRef = doc(colRef, payload.id);
    } else {
      docRef = doc(colRef);
      const docId = docRef.id;
      await setDoc(docRef, { ...payload, id: docId });
    }
    return { data: { id: docRef.id, ...payload }, error: null };
  }

  private async doUpdate(colRef: any) {
    const q = query(colRef, ...this.constraints);
    const snap = await getDocs(q);
    if (snap.empty) return { data: null, error: { message: "No matching document found for update" } };
    const payload = { ...this.updatePayload! };
    for (const d of snap.docs) {
      await updateDoc(doc(colRef, d.id), payload);
    }
    const result = { id: snap.docs[0].id, ...payload };
    return { data: result, error: null };
  }

  private async doDelete(colRef: any) {
    const q = query(colRef, ...this.constraints);
    const snap = await getDocs(q);
    if (snap.empty) return { data: null, error: { message: "No matching document found for delete" } };
    for (const d of snap.docs) {
      await deleteDoc(doc(colRef, d.id));
    }
    return { data: null, error: null };
  }
}

const firebaseStorage = {
  from: (bucket: string) => ({
    upload: async (
      path: string,
      file: Blob | Uint8Array | ArrayBuffer,
      opts?: { upsert?: boolean; contentType?: string },
    ) => {
      try {
        const ref = storageRef(storage, `${bucket}/${path}`);
        const metadata: UploadMetadata = {};
        if (opts?.contentType) metadata.contentType = opts.contentType;
        await uploadBytesResumable(ref, file, metadata);
        return { data: { path }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message || "Upload failed" } };
      }
    },
    getPublicUrl: async (path: string) => {
      try {
        const ref = storageRef(storage, `${bucket}/${path}`);
        const publicUrl = await getDownloadURL(ref);
        return { data: { publicUrl }, error: null };
      } catch (e: any) {
        return { data: { publicUrl: null }, error: { message: e.message || "Failed to get URL" } };
      }
    },
  }),
};

class FirestoreChannel {
  private name: string;
  private listeners: Array<{
    table: string;
    event: string;
    filter?: string;
    callback: () => void;
  }> = [];
  private unsubscribes: Unsubscribe[] = [];

  constructor(name: string) {
    this.name = name;
  }

  on(
    type: "postgres_changes",
    config: { event: string; schema: string; table: string; filter?: string },
    callback: () => void,
  ): this {
    this.listeners.push({
      table: config.table,
      event: config.event,
      filter: config.filter,
      callback,
    });
    return this;
  }

  subscribe(): { unsubscribe: () => void } {
    for (const listener of this.listeners) {
      const db = firestore;
      const colRef = collection(db, listener.table);
      const constraints: QueryConstraint[] = [];

      if (listener.filter) {
        const filterMatch = listener.filter.match(/^(\w+)=eq\.(.+)$/);
        if (filterMatch) {
          constraints.push(where(filterMatch[1], "==", filterMatch[2]));
        }
      }

      const q = query(colRef, ...constraints);
      const unsub = onSnapshot(q, () => {
        listener.callback();
      });
      this.unsubscribes.push(unsub);
    }

    this.unsubscribe = () => {
      for (const unsub of this.unsubscribes) unsub();
      this.unsubscribes = [];
    };

    return { unsubscribe: this.unsubscribe.bind(this) };
  }

  unsubscribe: () => void = () => {};
}

export const firebase = {
  auth: firebaseAuth,
  from: (table: string) => new FirestoreQueryBuilder(table),
  storage: firebaseStorage,
  channel: (name: string) => new FirestoreChannel(name),
  removeChannel: (channel: any) => {
    if (channel?.unsubscribe) channel.unsubscribe();
  },
};
