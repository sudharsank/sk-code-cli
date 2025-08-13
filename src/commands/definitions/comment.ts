import {CommandDefinition, CommandContext} from '../base.js';
import {Command} from 'commander';
import path from 'path';
import {commentFile, commentFolder, CommenterOptions} from '../../tools/commenter.js';
import fs from 'fs';

export default function registerCommentCommand(program: Command) {
    program
        .command('comment <target>')
        .description('Analyze code and add/update comments for functions, classes, and methods (JS/TS only, for now)')
        .option('--overwrite', 'Overwrite existing comments')
        .option('--dry-run', 'Show changes but do not write to files')
    .option('--llm', 'Use configured LLM to generate higher-quality JSDoc')
        .option('--interactive', 'Prompt for approval before applying changes')
        .action(async (target, options) => {
            console.log('[DEBUG] comment command options:', options);
            const absPath = path.resolve(process.cwd(), target);
            const commenterOptions: CommenterOptions = {
                overwrite: options.overwrite,
                dryRun: options.dryRun,
        useLLM: options.llm,
                interactive: options.interactive,
                onApproval: options.interactive
                    ? async (file) => {
                        try {
                            const original = fs.readFileSync(file, 'utf8');
                            const preview = await commentFile(file, { ...commenterOptions, dryRun: true, interactive: false });
                            if (!preview.changed || preview.output === undefined) {
                                console.log('No changes to apply.');
                                return false;
                            }

                            const rel = path.relative(process.cwd(), file);
                            console.log(`\n=== Preview (not written) ===\nFile: ${rel}\n`);
                            // Print a truncated preview to avoid flooding the terminal
                            const snippet = preview.output.length > 4000 ? preview.output.slice(0, 4000) + '\n... [truncated] ...' : preview.output;
                            console.log(snippet);
                            console.log('\n============================');

                            const yes = await new Promise<boolean>(resolve => {
                                const readline = require('readline');
                                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                                rl.question('Apply changes? [y/N]: ', (answer: string) => {
                                    rl.close();
                                    resolve(/^y(es)?$/i.test(answer.trim()));
                                });
                            });
                            return yes;
                        } catch (e) {
                            console.error('Error preparing approval preview:', e);
                            return false;
                        }
                    }
                    : undefined,
            };
            // Simple file/folder check
            if (fs.lstatSync(absPath).isDirectory()) {
                await commentFolder(absPath, commenterOptions);
            } else {
                await commentFile(absPath, commenterOptions);
            }
        });
}

// Slash command for /comment
export const commentCommand: CommandDefinition = {
    command: 'comment',
    description: 'Comment a file or folder (usage: /comment <file-or-folder> [--dry-run] [--llm])',
    handler: async (ctx: CommandContext, args?: string) => {
        const { addMessage, setShowCommentOptions, setShowCommentApproval } = ctx;
        // If no args, show usage
        if (!args || !args.trim()) {
            if (setShowCommentOptions) {
                setShowCommentOptions({ show: true });
                return;
            }
            addMessage({
                role: 'system',
                content:
                    'Usage: /comment <file-or-folder> [--dry-run] [--overwrite] [--llm]\nTip: Use /comment-options for an interactive picker.',
            });
            return;
        }

        // Parse args: first token is target, rest are flags
        const parts = args.split(/\s+/);
        const target = parts[0];
    const flags = new Set(parts.slice(1));
    const dryRun = flags.has('--dry-run');
    const overwrite = flags.has('--overwrite');
    const useLLM = flags.has('--llm');
    const interactive = flags.has('--interactive');

        const absPath = path.resolve(process.cwd(), target);

        // Validate path
    if (!fs.existsSync(absPath)) {
            if (setShowCommentOptions) {
                setShowCommentOptions({ show: true, target });
                return;
            } else {
                addMessage({
                    role: 'system',
                    content: `Path not found: ${target}`,
                });
                return;
            }
        }

        const commenterOptions: CommenterOptions = {
            overwrite,
            dryRun,
            useLLM,
            interactive,
            onProgress: ({file, functionName, index, total}) => {
                addMessage({
                    role: 'assistant',
                    content: `Analyzing ${functionName} (${index}/${total}) in ${target}...`,
                });
            },
            // For non-dry-run applies, ask approval before writing
            onApproval: interactive && !dryRun && setShowCommentApproval ? async (file, changeSummary) => {
                // Load original content for diff
                let originalContent = '';
                try { originalContent = fs.readFileSync(file, 'utf8'); } catch {}
                // Generate a temporary preview by invoking a dry run for this file
                // But we already have the would-be output in changeSummary text only; instead, re-run single file with forced dryRun to obtain the new text
                let newText: string | undefined = undefined;
                try {
                    const tmp = await commentFile(file, { ...commenterOptions, dryRun: true, interactive: false });
                    newText = tmp.output;
                } catch {}

                const approved = await new Promise<boolean>(resolve => {
                    setShowCommentApproval!({
                        show: true,
                        filePath: path.relative(process.cwd(), file),
                        oldText: originalContent,
                        newText: newText,
                        resolve: (ok) => resolve(!!ok),
                    });
                });
                return approved;
            } : undefined,
        };

        try {
            const stat = fs.lstatSync(absPath);
            if (stat.isDirectory()) {
                addMessage({
                    role: 'system',
                    content: `Scanning folder: ${target} ...`,
                });
                const result = await commentFolder(absPath, commenterOptions);
                addMessage({
                    role: 'system',
                    content:
                        result?.summary || 'Completed folder scan. No JS/TS files changed.',
                });
                // If dry-run, show sequential previews for changed files
                if (dryRun && result?.changes?.length) {
                    for (const ch of result.changes) {
                        if (!ch.output) continue;
                        let originalContent = '';
                        try { originalContent = fs.readFileSync(ch.file, 'utf8'); } catch {}
                        addMessage({
                            role: 'tool_execution',
                            content: 'Dry-run preview',
                            toolExecution: {
                                id: Math.random().toString(36).slice(2),
                                name: 'edit_file',
                                args: {
                                    file_path: path.relative(process.cwd(), ch.file),
                                    old_text: originalContent,
                                    new_text: ch.output,
                                    replace_all: false,
                                },
                                status: 'completed',
                                result: { success: true },
                            },
                        });
                    }
                }
            } else {
                // Single file path
                let originalContent = '';
                try { originalContent = fs.readFileSync(absPath, 'utf8'); } catch {}

                if (interactive) {
                    addMessage({ role: 'system', content: 'Preparing preview for approval…' });
                    const preview = await commentFile(absPath, { ...commenterOptions, dryRun: true, interactive: false });
                    if (!preview.changed || preview.output === undefined) {
                        addMessage({ role: 'system', content: `No changes: ${preview.reason || 'unknown reason'}` });
                        return;
                    }
                    // Show diff preview
                    addMessage({
                        role: 'tool_execution',
                        content: 'Dry-run preview',
                        toolExecution: {
                            id: Math.random().toString(36).slice(2),
                            name: 'edit_file',
                            args: {
                                file_path: path.relative(process.cwd(), absPath),
                                old_text: originalContent,
                                new_text: preview.output,
                                replace_all: false,
                            },
                            status: 'completed',
                            result: { success: true },
                        },
                    });

                    // If approval UI is unavailable, block writes
                    if (!setShowCommentApproval) {
                        addMessage({
                            role: 'system',
                            content: 'Interactive approval UI is not available in this view. Changes were NOT applied.\nUse: sk comment <file> --llm --interactive (terminal) or run without --interactive to apply.',
                        });
                        return;
                    }

                    // Ask approval
                    const approved = await new Promise<boolean>(resolve => {
                        setShowCommentApproval!({
                            show: true,
                            filePath: path.relative(process.cwd(), absPath),
                            oldText: originalContent,
                            newText: preview.output!,
                            resolve: ok => resolve(!!ok),
                        });
                    });

                    if (dryRun) {
                        addMessage({ role: 'system', content: 'Dry run complete. Preview generated (not written).' });
                        return;
                    }

                    if (approved) {
                        const applied = await commentFile(absPath, { ...commenterOptions, dryRun: false, interactive: false });
                        addMessage({ role: 'system', content: applied.changed ? 'Comments added/updated successfully.' : `No changes: ${applied.reason || 'unknown reason'}` });
                    } else {
                        addMessage({ role: 'system', content: 'Change not approved. No write occurred.' });
                    }
                } else {
                    // Non-interactive flow
                    const result = await commentFile(absPath, commenterOptions);
                    if (result.changed) {
                        if (dryRun && result.output !== undefined) {
                            addMessage({
                                role: 'tool_execution',
                                content: 'Dry-run preview',
                                toolExecution: {
                                    id: Math.random().toString(36).slice(2),
                                    name: 'edit_file',
                                    args: { file_path: target, old_text: originalContent, new_text: result.output, replace_all: false },
                                    status: 'completed',
                                    result: { success: true },
                                },
                            });
                        }
                        addMessage({ role: 'system', content: dryRun ? 'Dry run complete. Preview generated (not written).' : 'Comments added/updated successfully.' });
                    } else {
                        addMessage({ role: 'system', content: `No changes: ${result.reason || 'unknown reason'}` });
                    }
                }
            }
        } catch (err: any) {
            addMessage({
                role: 'system',
                content: `Error: ${err?.message || String(err)}`,
            });
        }
    },
};

export const commentOptionsCommand: CommandDefinition = {
    command: 'comment-options',
    description: 'Open interactive options for commenting (choose LLM, dry-run, overwrite)',
    handler: ({ setShowCommentOptions, addMessage }: CommandContext) => {
        if (setShowCommentOptions) {
            setShowCommentOptions({ show: true });
        } else {
            addMessage({ role: 'system', content: 'Interactive options are not available in this UI.' });
        }
    }
};