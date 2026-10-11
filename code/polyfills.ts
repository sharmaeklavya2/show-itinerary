// Polyfills for JS features that some supported environments lack.

// Temporal is missing in some Node.js builds (e.g., Homebrew's Node.js 26) and in older browsers.
// The polyfill is only loaded when needed, so environments with native Temporal don't download or run it.
if(typeof globalThis.Temporal === 'undefined') {
    await import('temporal-polyfill/global');
}

export {};
