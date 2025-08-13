import fs from 'fs';
import path from 'path';

/**
 * Recursively list all files in a directory, optionally filtering by extension(s).
 * @param dir Directory to search
 * @param exts Array of extensions (e.g. ['.js', '.ts']) or undefined for all
 * @param baseDir Used internally for relative paths
 */
export function listFilesRecursive(dir: string, exts?: string[], baseDir?: string): string[] {
    let results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.cache']);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (ignoreDirs.has(entry.name)) continue;
            results = results.concat(listFilesRecursive(fullPath, exts, baseDir || dir));
        } else if (!exts || exts.includes(path.extname(entry.name))) {
            results.push(baseDir ? path.relative(baseDir, fullPath) : fullPath);
        }
    }
    return results;
}
