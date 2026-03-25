/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
    readonly VITE_SUBSCRIPTIONS_API_BASE_URL?: string;
    readonly VITE_SUBSCRIPTIONS_API_TIMEOUT_MS?: string;
    readonly VITE_SUBSCRIPTIONS_API_TOKEN_STORAGE_KEY?: string;
    readonly VITE_SUBSCRIPTIONS_API_ACCESS_TOKEN?: string;
    readonly VITE_SUBSCRIPTIONS_API_REFRESH_TOKEN?: string;
    readonly VITE_SUBSCRIPTIONS_API_CLIENT_ID?: string;
    readonly VITE_SUBSCRIPTIONS_API_REFRESH_ENDPOINT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
