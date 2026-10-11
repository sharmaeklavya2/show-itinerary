// Minimal type declarations for the parts of Node.js that cli.ts uses.
// They replace @types/node, which would be a large dependency for a few functions.

declare module "node:fs" {
    export function readFileSync(path: string | URL, encoding: 'utf8'): string;
    export function writeFileSync(path: string | URL, data: string): void;
}

declare module "node:util" {
    export function parseArgs(config: {
        args?: string[],
        options?: Record<string, {type: 'boolean' | 'string', short?: string}>,
        allowPositionals?: boolean,
        strict?: boolean,
    }): {values: Record<string, string | boolean | undefined>, positionals: string[]};
}

declare const process: {
    argv: string[];
    exitCode?: number;
};
