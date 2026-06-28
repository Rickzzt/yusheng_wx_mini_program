declare module "@cloudbase/js-sdk" {
  export type CloudBaseInitOptions = {
    env: string;
    region?: string;
    accessKey?: string;
    auth?: {
      detectSessionInUrl?: boolean;
    };
  };

  export type Session = {
    user?: {
      id?: string;
      is_anonymous?: boolean;
      user_metadata?: Record<string, unknown>;
    };
  };

  export type CloudBaseResult<T> = {
    data?: T;
    error?: {
      message?: string;
    };
  };

  export type CloudBaseAuth = {
    signInWithPassword(params: { username: string; password: string }): Promise<CloudBaseResult<{ user?: { id?: string }; session?: Session }>>;
    getSession(): Promise<CloudBaseResult<{ session?: Session }>>;
    signOut(): Promise<CloudBaseResult<unknown>>;
  };

  export type DatabaseQuery = {
    where(query: Record<string, unknown>): DatabaseQuery;
    orderBy(field: string, order: "asc" | "desc"): DatabaseQuery;
    limit(value: number): DatabaseQuery;
    skip(value: number): DatabaseQuery;
    get(): Promise<{ data?: unknown[] }>;
  };

  export type DatabaseDoc = {
    get(): Promise<{ data?: unknown }>;
    set(params: { data: Record<string, unknown> }): Promise<unknown>;
    update(params: { data: Record<string, unknown> }): Promise<unknown>;
    remove(): Promise<unknown>;
  };

  export type DatabaseCollection = DatabaseQuery & {
    doc(id: string): DatabaseDoc;
    add(data: Record<string, unknown>): Promise<{ _id?: string }>;
  };

  export type Database = {
    collection(name: string): DatabaseCollection;
    command: {
      neq(value: unknown): unknown;
      in(values: unknown[]): unknown;
    };
  };

  export type CloudBaseApp = {
    auth(params?: { persistence?: "local" | "session" | "none" }): CloudBaseAuth;
    database(): Database;
  };

  const cloudbase: {
    init(options: CloudBaseInitOptions): CloudBaseApp;
  };

  export default cloudbase;
}
