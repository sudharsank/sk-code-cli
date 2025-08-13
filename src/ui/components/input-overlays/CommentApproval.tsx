import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import DiffPreview from '../display/DiffPreview.js';

interface Props {
  filePath: string;
  oldText?: string;
  newText?: string;
  onApprove: (autoApproveSession?: boolean) => void;
  onReject: () => void;
}

export default function CommentApproval({ filePath, oldText, newText, onApprove, onReject }: Props) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [filePath]);

  useInput((input, key) => {
    if (key.upArrow) setSelected(s => Math.max(0, s - 1));
    if (key.downArrow) setSelected(s => Math.min(2, s + 1));
    if (key.escape) onReject();
    if (key.return) {
      if (selected === 0) onApprove(false);
      else if (selected === 1) onApprove(true);
      else onReject();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="yellow">
        🟡 Approve commenting changes for <Text bold>{filePath}</Text>?
      </Text>

      {oldText !== undefined && newText !== undefined && (
        <Box borderStyle="round" borderColor="yellow" paddingX={1}>
          <DiffPreview
            toolName="edit_file"
            toolArgs={{ file_path: filePath, old_text: oldText, new_text: newText, replace_all: false }}
          />
        </Box>
      )}

      <Box flexDirection="column">
        {['Yes', "Yes, and don't ask again this session", 'No, cancel'].map((label, idx) => (
          <Box key={label}>
            <Text color={selected === idx ? 'black' : idx === 2 ? 'red' : idx === 1 ? 'blue' : 'green'}
                  backgroundColor={selected === idx ? (idx === 2 ? 'rgb(214, 114, 114)' : idx === 1 ? 'rgb(114, 159, 214)' : 'rgb(124, 214, 114)') : undefined}>
              {selected === idx ? '>' : ' '} {label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box>
        <Text dimColor>Up/Down to select • Enter to confirm • Esc to cancel</Text>
      </Box>
    </Box>
  );
}
