import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';

interface Props {
  target?: string;
  onSubmit: (opts: {useLLM: boolean; dryRun: boolean; overwrite: boolean}) => void;
  onCancel: () => void;
}

export default function CommentOptions({target, onSubmit, onCancel}: Props) {
  const [useLLM, setUseLLM] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [cursor, setCursor] = useState(0);
  const items = [
    { label: 'Use LLM', getter: () => useLLM, setter: setUseLLM },
    { label: 'Dry run (preview)', getter: () => dryRun, setter: setDryRun },
    { label: 'Overwrite existing comments', getter: () => overwrite, setter: setOverwrite },
    { label: 'Run', getter: () => null, setter: null },
    { label: 'Cancel', getter: () => null, setter: null },
  ];

  useInput((input, key) => {
    if (key.downArrow) setCursor(c => Math.min(c + 1, items.length - 1));
    if (key.upArrow) setCursor(c => Math.max(c - 1, 0));
    if (input === ' ') {
      const item = items[cursor];
      if (item.setter) item.setter(!item.getter());
    }
    if (key.return) {
      if (cursor === 3) {
        onSubmit({useLLM, dryRun, overwrite});
      } else if (cursor === 4) {
        onCancel();
      } else {
        const item = items[cursor];
        if (item.setter) item.setter(!item.getter());
      }
    }
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="yellow" bold>
        Comment options{target ? ` for ${target}` : ''}
      </Text>
      {items.map((item, idx) => (
        <Box key={item.label}>
          <Text color={idx === cursor ? 'cyan' : 'white'}>
            {idx === cursor ? '>' : ' '} {item.label}
            {item.getter ? `: ${item.getter() ? 'On' : 'Off'}` : ''}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}><Text dimColor>Up/Down to navigate • Space to toggle • Enter to select • Esc to cancel</Text></Box>
    </Box>
  );
}
