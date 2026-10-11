// Polyfills for JS features that some supported environments lack.

// Map.prototype.getOrInsert is missing in older Node.js versions (e.g., Node.js 22) and older browsers.
// It is small, so it is defined here instead of being loaded from a package.
if(typeof Map.prototype.getOrInsert !== 'function') {
    Object.defineProperty(Map.prototype, 'getOrInsert', {
        value: function<K, V>(this: Map<K, V>, key: K, value: V): V {
            if(!this.has(key)) {
                this.set(key, value);
            }
            return this.get(key)!;
        },
        writable: true,
        enumerable: false,
        configurable: true,
    });
}

// Temporal is missing in some environments, e.g., Homebrew's Node.js 26 and older browsers.
// The polyfill is only loaded when Temporal is missing.
// In Node.js, it is loaded from the temporal-polyfill package in node_modules.
// In browsers, it is loaded from a CDN, so that the deployed site doesn't need node_modules.
// If loading fails, code that uses Temporal reports the error.

// Keep the version in this URL in sync with temporal-polyfill's version in package.json.
// TEMPORAL_POLYFILL_INTEGRITY is the SHA-384 hash of that file, so the browser rejects it if the CDN serves anything else.
const TEMPORAL_POLYFILL_URL = 'https://cdn.jsdelivr.net/npm/temporal-polyfill@1.0.5/global.js';
const TEMPORAL_POLYFILL_INTEGRITY = 'sha384-V3RJVvomlAv9mt2CjNHc3G5eJl80cl9VwlOkHx421kNT/5DUSInoDJFmFd386ZbK';

function loadScript(src: string, integrity: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.integrity = integrity;
        script.crossOrigin = 'anonymous';  // required for integrity checks on cross-origin scripts
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
        document.head.appendChild(script);
    });
}

if(typeof globalThis.Temporal === 'undefined') {
    try {
        if(typeof document !== 'undefined') {
            await loadScript(TEMPORAL_POLYFILL_URL, TEMPORAL_POLYFILL_INTEGRITY);
        }
        else {
            await import('temporal-polyfill/global');
        }
    }
    catch(e) {
        console.warn('Could not load Temporal polyfill:', e);
    }
}

export {};
