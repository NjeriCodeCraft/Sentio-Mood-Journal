// Environment variable loader for client-side applications
class EnvLoader {
    constructor() {
        this.env = {};
        this.loaded = false;
    }

    async loadEnv() {
        if (this.loaded) return this.env;

        // Initialize with empty values (Vite-like keys for compatibility)
        this.env = {
            VITE_SUPABASE_URL: '',
            VITE_SUPABASE_ANON_KEY: '',
            VITE_HUGGINGFACE_API_KEY: ''
        };

        // Load from window._env_ (runtime configuration via env.js)
        if (typeof window !== 'undefined' && window._env_) {
            this.env.VITE_SUPABASE_URL = window._env_.VITE_SUPABASE_URL || this.env.VITE_SUPABASE_URL;
            this.env.VITE_SUPABASE_ANON_KEY = window._env_.VITE_SUPABASE_ANON_KEY || this.env.VITE_SUPABASE_ANON_KEY;
            this.env.VITE_HUGGINGFACE_API_KEY = window._env_.VITE_HUGGINGFACE_API_KEY || this.env.VITE_HUGGINGFACE_API_KEY;
        }

        // Also expose non-prefixed aliases for convenience
        this.env.SUPABASE_URL = this.env.VITE_SUPABASE_URL;
        this.env.SUPABASE_ANON_KEY = this.env.VITE_SUPABASE_ANON_KEY;
        this.env.HUGGINGFACE_API_KEY = this.env.VITE_HUGGINGFACE_API_KEY;
        
        this.loaded = true;
        return this.env;
    }

    parseEnvFile(envText) {
        const lines = envText.split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    this.env[key.trim()] = value;
                }
            }
        });
    }

    loadFromGlobals() {
        // No-op for static build; values are loaded from window._env_
    }

    get(key) {
        return this.env[key];
    }

    getAll() {
        return { ...this.env };
    }

    isConfigured() {
        // Accept either VITE_* or alias keys
        const hasSupabaseUrl = !!(this.env.VITE_SUPABASE_URL || this.env.SUPABASE_URL);
        const hasAnonKey = !!(this.env.VITE_SUPABASE_ANON_KEY || this.env.SUPABASE_ANON_KEY);
        // Hugging Face API key is optional; some features may be limited
        return hasSupabaseUrl && hasAnonKey;
    }

    getMissingKeys() {
        const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
        return required.filter(key => !this.env[key] && !this.env[key.replace('VITE_', '')]);
    }
}

// Export for use in other modules
window.EnvLoader = EnvLoader;
