import path from 'path';
import fs from 'fs';
import Groq from 'groq-sdk';
import {extractFunctionsAndClasses, generateJSDocComment} from './jsExtractor.js';
import {ConfigManager} from '../utils/local-settings.js';

export interface CommenterOptions {
    overwrite?: boolean;
    dryRun?: boolean;
    interactive?: boolean;
    onApproval?: (file: string, changeSummary: string) => Promise<boolean>;
    useLLM?: boolean;
    model?: string;
    onProgress?: (info: {
        file: string;
        functionName: string;
        index: number;
        total: number;
    }) => void;
}

export interface CommentFolderResult {
    scannedFiles: number;
    changedFiles: number;
    summaries: string[];
    summary: string;
    changes: Array<{ file: string; output?: string }>; // For dry-run preview
}

export async function commentFile(filePath: string, options: CommenterOptions = {}): Promise<{ changed: boolean; output?: string; reason?: string }> {
    // 1. Read file
    const code = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath);
    if (!['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        return { changed: false, reason: 'Unsupported file type' };
    }
    // 2. Extract functions/classes
    const extracted = extractFunctionsAndClasses(code);
    if (!extracted.length) {
        return { changed: false, reason: 'No functions/classes found' };
    }
    // Resolve LLM configuration
    const configManager = new ConfigManager();
    const cfg = configManager.getConfig();
    const useLLM = !!options.useLLM && (!!cfg.apiKey || cfg.provider === 'Ollama');
    const provider = cfg.provider || 'Groq';
    const model = options.model || cfg.model || (provider === 'Groq' ? 'llama-3.1-70b-versatile' : 'llama3.2');

    async function generateWithLLM(fnCode: string, fnName: string, params: string[]): Promise<string | null> {
        try {
            const system = [
                'You are an expert code documenter who writes precise, concise JSDoc for JavaScript/TypeScript.',
                '- Output EXACTLY ONE JSDoc block, starting with /** and ending with */.',
                '- Be brief (1-2 summary lines). Use active voice, present tense.',
                '- Describe what the function does, not how. Mention notable side effects, thrown errors.',
                '- Include @param for each parameter with inferred types and short descriptions.',
                '- Include default values in the description when relevant.',
                '- Include @returns with inferred type and brief description when not void.',
                '- Prefer domain terminology inferred from names and calls (e.g., fetch, parse, render).',
                '- Do NOT include code, examples, markdown fences, or extra commentary.',
            ].join('\n');
            const user = `File extension: ${ext}\nFunction name: ${fnName}\nParameters: ${params.join(', ') || 'none'}\n\nFunction code:\n${fnCode}\n\nGenerate the JSDoc for this function.`;
            if (provider === 'Groq') {
                if (!cfg.apiKey) return null;
                const client = new Groq({ apiKey: cfg.apiKey });
                const resp = await client.chat.completions.create({
                    model,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user },
                    ],
                    temperature: 0.2,
                    max_tokens: 400,
                    stream: false,
                } as any);
                const text = resp.choices?.[0]?.message?.content || '';
                return sanitizeToJSDoc(text);
            } else {
                // Ollama local
                const baseUrl = cfg.baseUrl || 'http://localhost:11434';
                const res = await fetch(`${baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: system },
                            { role: 'user', content: user },
                        ],
                        stream: false,
                    }),
                });
                if (!res.ok) return null;
                const data = await res.json();
                const text = data.message?.content || '';
                return sanitizeToJSDoc(text);
            }
        } catch {
            return null;
        }
    }

    function sanitizeToJSDoc(text: string): string | null {
        if (!text) return null;
        // Remove markdown fences if present
        let t = text.trim();
        t = t.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
        // Extract first JSDoc block
        const start = t.indexOf('/**');
        const end = t.indexOf('*/', start + 3);
        if (start >= 0 && end > start) {
            return t.substring(start, end + 2).trim();
        }
        // If no explicit JSDoc markers, attempt to wrap
        if (t.startsWith('*')) {
            return '/**\n' + t + (t.endsWith('*/') ? '' : '\n*/');
        }
        return null;
    }
    // 3. Generate comments (dry-run: just preview changes)
    let output = code;
    let offset = 0;
    let changeSummary = '';
    // For arrow functions, place comment above the variable declaration (const/let/var)
    // For function/class declarations, place above the declaration
    // We'll use regex to find the start of the variable declaration for arrow functions
    const total = extracted.length;
    for (let i = 0; i < extracted.length; i++) {
        const fn = extracted[i];
        let insertPos = fn.start + offset;
        // Capture function source for LLM context
        const fnCode = code.slice(fn.start, fn.end + 1);
        const paramNames = fn.params.map(p => p.name || 'param');

        let comment: string | null = null;
        if (useLLM) {
            if (options.onProgress) {
                options.onProgress({ file: filePath, functionName: fn.name, index: i + 1, total });
            }
            comment = await generateWithLLM(fnCode, fn.name, paramNames);
        }
        if (!comment) {
            comment = generateJSDocComment(fn);
        }
        // If arrow function, try to move insertPos to start of variable declaration
        if (fn.isArrowFunction) {
            // Find the start of the line
            const before = output.slice(0, insertPos);
            const lineStart = before.lastIndexOf('\n');
            // Look for const/let/var before the '='
            const declMatch = before.slice(lineStart + 1).match(/(const|let|var)\s+\w+/);
            if (declMatch) {
                insertPos = lineStart + 1;
            }
        }
        output = output.slice(0, insertPos) + comment + '\n' + output.slice(insertPos);
        offset += comment.length + 1;
        changeSummary += `Add comment for ${fn.name} at ${insertPos}\n`;
    }
    if (options.interactive && options.onApproval) {
        const approved = await options.onApproval(filePath, changeSummary);
        if (!approved) return { changed: false, reason: 'Change not approved' };
    }
    if (!options.dryRun) {
        fs.writeFileSync(filePath, output, 'utf8');
    }
    return { changed: true, output: options.dryRun ? output : undefined };
}

export async function commentFolder(folderPath: string, options: CommenterOptions = {}) {
    // Recursively find all JS/TS files and call commentFile on each
    const allowExt = new Set(['.js', '.ts', '.jsx', '.tsx']);
    const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.vs', 'obj', 'bin', 'debug', 'release']);

    const result: CommentFolderResult = {
        scannedFiles: 0,
        changedFiles: 0,
        summaries: [],
    summary: '',
    changes: [],
    };

    function* walk(dir: string): Generator<string> {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (ignoreDirs.has(entry.name)) continue;
                yield* walk(path.join(dir, entry.name));
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (allowExt.has(ext)) {
                    yield path.join(dir, entry.name);
                }
            }
        }
    }

    for (const file of walk(folderPath)) {
        result.scannedFiles++;
        try {
            const fileResult = await commentFile(file, options);
            if (fileResult.changed) {
                result.changedFiles++;
                result.summaries.push(`Changed: ${path.relative(process.cwd(), file)}`);
                result.changes.push({ file, output: fileResult.output });
            }
        } catch (e: any) {
            result.summaries.push(`Error on ${path.relative(process.cwd(), file)}: ${e?.message || String(e)}`);
        }
    }

    result.summary = `Scanned ${result.scannedFiles} file(s). ${result.changedFiles} changed.`;
    return result;
}
