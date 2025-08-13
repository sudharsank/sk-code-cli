import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { listFilesRecursive } from '../../../utils/file-list.js';

interface FilePickerProps {
    rootDir: string;
    onSelect: (file: string) => void;
    filterExts?: string[];
    initialQuery?: string;
}

export const FilePicker: React.FC<FilePickerProps> = ({ rootDir, onSelect, filterExts, initialQuery }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState(initialQuery || '');
    const [filtered, setFiltered] = useState<string[]>([]);
    const [selected, setSelected] = useState(0);
    const [showAll, setShowAll] = useState(false);
    const VISIBLE_COUNT = 10;

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            // Default to JS/TS if no filter provided
            const exts = filterExts && filterExts.length > 0 ? filterExts : ['.js', '.jsx', '.ts', '.tsx'];
            const all = listFilesRecursive(rootDir, showAll ? undefined : exts)
                .filter(f => !f.endsWith('.map'));
            setFiles(all);
            setLoading(false);
        }, 0);
    }, [rootDir, filterExts, showAll]);

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
        else if (input?.toLowerCase() === 'a') setShowAll(v => !v);
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

    return (
        <Box flexDirection="column">
            <Text color="cyan">Select a file (type to filter, arrows to navigate, Enter to select):</Text>
            <Text>
                Query: {queryWithCursor}
            </Text>
            <Text dimColor>Press 'a' to toggle showing all files. Currently showing {showAll ? 'all files' : 'JS/TS only'}.</Text>
            {loading ? (
                <Text color="yellow">Loading files, please wait...</Text>
            ) : (
                <Box flexDirection="column">
                    {visibleFiles.map((f, i) => {
                        const fileIdx = start + i;
                        return (
                            <Text key={f} inverse={fileIdx === selected}>{f}</Text>
                        );
                    })}
                    {filtered.length === 0 && <Text color="gray">No files found.</Text>}
                </Box>
            )}
        </Box>
    );
};
