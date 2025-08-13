import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { listFilesRecursive } from '../../../utils/file-list.js';
import fs from 'fs';
import path from 'path';

interface FilePickerProps {
    rootDir: string;
    onSelect: (file: string) => void;
    filterExts?: string[];
    initialQuery?: string;
}

type ViewMode = 'files' | 'folders' | 'both';

export const FilePicker: React.FC<FilePickerProps> = ({ rootDir, onSelect, filterExts, initialQuery }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState(initialQuery || '');
    const [filtered, setFiltered] = useState<string[]>([]);
    const [selected, setSelected] = useState(0);
    const [showAll, setShowAll] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('files');
    const VISIBLE_COUNT = 10;

    // Function to get all files and folders
    const getAllItems = (rootDir: string, showAll: boolean, viewMode: ViewMode): string[] => {
        const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.cache', 'lib', 'config', '.vscode', 'teams', 'temp']);
        const results: string[] = [];

        const traverse = (dir: string, baseDir: string) => {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    if (entry.name.startsWith('.') && !showAll) continue;

                    const fullPath = path.join(dir, entry.name);
                    const relativePath = path.relative(baseDir, fullPath);

                    if (entry.isDirectory()) {
                        if (ignoreDirs.has(entry.name)) continue;

                        // Add folder if we're showing folders or both
                        if (viewMode === 'folders' || viewMode === 'both') {
                            results.push(relativePath + '/');
                        }

                        // Recurse into directory
                        traverse(fullPath, baseDir);
                    } else {
                        // Add file if we're showing files or both
                        if (viewMode === 'files' || viewMode === 'both') {
                            const ext = path.extname(entry.name);
                            const defaultExts = ['.js', '.jsx', '.ts', '.tsx'];
                            const exts = filterExts && filterExts.length > 0 ? filterExts : defaultExts;

                            if (showAll || exts.includes(ext)) {
                                if (!entry.name.endsWith('.map')) {
                                    results.push(relativePath);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                // Skip directories that can't be read
            }
        };

        traverse(rootDir, rootDir);
        return results.sort((a, b) => {
            // Directories first (those ending with /), then files
            const aIsDir = a.endsWith('/');
            const bIsDir = b.endsWith('/');
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
    };

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            const all = getAllItems(rootDir, showAll, viewMode);
            setFiles(all);
            setLoading(false);
        }, 0);
    }, [rootDir, filterExts, showAll, viewMode]);

    useEffect(() => {
        const q = query.toLowerCase();
        setFiltered(files.filter(f => f.toLowerCase().includes(q)));
        setSelected(0);
    }, [query, files]);

    useInput((input, key) => {
        if (loading) return;
        if (key.downArrow) setSelected(s => Math.min(filtered.length - 1, s + 1));
        else if (key.upArrow) setSelected(s => Math.max(0, s - 1));
        else if (key.return) onSelect(filtered[selected]);
        else if (key.backspace || key.delete) setQuery(q => q.slice(0, -1));
        else if (key.shift && input?.toLowerCase() === 'a') setShowAll(v => !v);
        else if (key.shift && input?.toLowerCase() === 'f') {
            // Cycle through view modes: files -> folders -> both -> files
            setViewMode(current => {
                if (current === 'files') return 'folders';
                if (current === 'folders') return 'both';
                return 'files';
            });
        }
        else if (input && !key.ctrl && !key.meta) setQuery(q => q + input);
    });

    // Calculate scroll window for visible files
    let start = Math.max(0, selected - Math.floor(VISIBLE_COUNT / 2));
    let end = start + VISIBLE_COUNT;
    if (end > filtered.length) {
        end = filtered.length;
        start = Math.max(0, end - VISIBLE_COUNT);
    }
    const visibleFiles = filtered.slice(start, end);

    // Render query with a visible cursor
    const cursorPos = query.length;
    const queryWithCursor = (
        <>
            {query}
            <Text backgroundColor="cyan" color="black"> </Text>
        </>
    );

    const getViewModeDescription = () => {
        switch (viewMode) {
            case 'files': return showAll ? 'all files' : 'JS/TS files only';
            case 'folders': return 'folders only';
            case 'both': return showAll ? 'all files and folders' : 'JS/TS files and folders';
        }
    };

    return (
        <Box flexDirection="column">
            <Text color="cyan">Select a file (type to filter, arrows to navigate, Enter to select):</Text>
            <Text>
                Query: {queryWithCursor}
            </Text>
            <Text dimColor>Shift+A: toggle all files, Shift+F: cycle view mode. Currently showing: {getViewModeDescription()}</Text>
            {loading ? (
                <Text color="yellow">Loading files, please wait...</Text>
            ) : (
                <Box flexDirection="column">
                    {visibleFiles.map((f, i) => {
                        const fileIdx = start + i;
                        const isFolder = f.endsWith('/');
                        return (
                            <Text key={f} inverse={fileIdx === selected}>
                                {isFolder ? <Text color="blue">📁 {f}</Text> : f}
                            </Text>
                        );
                    })}
                    {filtered.length === 0 && <Text color="gray">No files found.</Text>}
                </Box>
            )}
        </Box>
    );
};
