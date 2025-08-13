import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {FilePicker} from './FilePicker.js';

interface Props {
  defaultTarget?: string;
  onRun: (args: { target: string; useLLM: boolean; dryRun: boolean; overwrite: boolean; interactive: boolean }) => void;
  onCancel: () => void;
}

const JS_TS_EXTS = ['.js', '.jsx', '.ts', '.tsx'];

type Step = 'pick' | 'options';

export default function CommentWizard({defaultTarget, onRun, onCancel}: Props) {
  const [step, setStep] = useState<Step>(defaultTarget ? 'options' : 'pick');
  const [target, setTarget] = useState<string>(defaultTarget || '');
  const [useLLM, setUseLLM] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [cursor, setCursor] = useState(0);

  const items = [
    { label: 'Use LLM', getter: () => useLLM, setter: setUseLLM },
    { label: 'Dry run (preview)', getter: () => dryRun, setter: setDryRun },
    { label: 'Overwrite existing comments', getter: () => overwrite, setter: setOverwrite },
    { label: 'Ask approval before applying', getter: () => interactive, setter: setInteractive },
    { label: 'Change target', getter: () => null, setter: null },
    { label: 'Run', getter: () => null, setter: null },
    { label: 'Cancel', getter: () => null, setter: null },
  ];

  useInput((input, key) => {
    if (step === 'options') {
      if (key.downArrow) setCursor(c => Math.min(c + 1, items.length - 1));
      if (key.upArrow) setCursor(c => Math.max(c - 1, 0));
      if (input === ' ') {
        const item = items[cursor];
        if (item.setter) item.setter(!item.getter());
      }
      if (key.return) {
        if (cursor === 4) {
          // Change target
          setStep('pick');
        } else if (cursor === 5) {
          if (target) onRun({ target, useLLM, dryRun, overwrite, interactive });
        } else if (cursor === 6) {
          onCancel();
        } else {
          const item = items[cursor];
          if (item.setter) item.setter(!item.getter());
        }
      }
      if (key.escape) onCancel();
    }
    if (step === 'pick') {
      if (input?.toLowerCase() === 'a') setShowAll(v => !v);
      if (key.escape) onCancel();
    }
  });

  if (step === 'pick') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="yellow" bold>Select target file</Text>
        <FilePicker
          rootDir={process.cwd()}
          onSelect={(file) => {
            setTarget(file);
            setStep('options');
          }}
          filterExts={showAll ? undefined : JS_TS_EXTS}
          initialQuery={target}
        />
        <Text dimColor>Press 'a' to toggle showing all files. Esc to cancel.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="yellow" bold>
        Comment options for {target}
      </Text>
      {items.map((item, idx) => (
        <Box key={item.label}>
          <Text color={idx === cursor ? 'cyan' : 'white'}>
            {idx === cursor ? '>' : ' '} {item.label}
            {item.getter ? `: ${item.getter() ? 'On' : 'Off'}` : ''}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Up/Down to navigate • Space to toggle • Enter to select • Esc to cancel</Text>
      </Box>
    </Box>
  );
}
