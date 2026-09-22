/**
 * Application feature flags and storage configuration.
 * By default, external Puter Cloud services (FS, KV, AI) are disabled
 * so the application runs 100% deterministically and locally without
 * requiring paid credits, balance, or external network requests.
 */
export const APP_CONFIG = {
    // Local storage (sessionStorage & localStorage) - primary and active
    LOCAL_STORAGE_ENABLED: true,

    // Puter KV storage (disabled by default to prevent "Low Balance" popups)
    PUTER_KV_ENABLED: false,

    // Puter AI qualitative analysis (disabled by default for fast, zero-credit execution)
    PUTER_AI_ENABLED: false,

    // Puter FS file storage (disabled, local data URLs used instead)
    PUTER_FS_ENABLED: false,
} as const;
