// The few Node built-ins the file-checking tests use. The app never runs on Node, so the project has no
// @types/node; these declarations cover just what the tests call.
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean; size: number };
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
}
declare const __dirname: string;
