import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';

interface LoginProps {
	onSubmit: (config: {
		provider: string;
		apiKey: string;
		baseUrl: string;
		model: string;
	}) => void;
	onCancel: () => void;
}

const PROVIDERS = ['Groq', 'Ollama'];

export default function Login({onSubmit, onCancel}: LoginProps) {
	const [providerIndex, setProviderIndex] = useState(0);
	const [apiKey, setApiKey] = useState('');
	const [baseUrl, setBaseUrl] = useState('http://localhost:11434');
	const [model, setModel] = useState('llama3.2');
	const [step, setStep] = useState<
		'provider' | 'apiKey' | 'baseUrl' | 'model' | 'submit'
	>('provider');

	useInput((input, key) => {
		if (step === 'provider') {
			if (key.downArrow || input === 'j') {
				setProviderIndex(i => (i + 1) % PROVIDERS.length);
				return;
			}
			if (key.upArrow || input === 'k') {
				setProviderIndex(i => (i - 1 + PROVIDERS.length) % PROVIDERS.length);
				return;
			}
			if (key.return) {
				setStep(PROVIDERS[providerIndex] === 'Groq' ? 'apiKey' : 'baseUrl');
				return;
			}
		} else if (step === 'apiKey') {
			if (key.return) {
				setStep('model');
				return;
			}
			if (key.escape) {
				onCancel();
				return;
			}
			if (key.backspace || key.delete) {
				setApiKey(prev => prev.slice(0, -1));
				return;
			}
			if (key.ctrl && input === 'c') {
				onCancel();
				return;
			}
			if (input && !key.meta && !key.ctrl) {
				setApiKey(prev => prev + input);
			}
		} else if (step === 'baseUrl') {
			if (key.return) {
				setStep('model');
				return;
			}
			if (key.escape) {
				onCancel();
				return;
			}
			if (key.backspace || key.delete) {
				setBaseUrl(prev => prev.slice(0, -1));
				return;
			}
			if (key.ctrl && input === 'c') {
				onCancel();
				return;
			}
			if (input && !key.meta && !key.ctrl) {
				setBaseUrl(prev => prev + input);
			}
		} else if (step === 'model') {
			if (key.return) {
				setStep('submit');
				return;
			}
			if (key.escape) {
				onCancel();
				return;
			}
			if (key.backspace || key.delete) {
				setModel(prev => prev.slice(0, -1));
				return;
			}
			if (key.ctrl && input === 'c') {
				onCancel();
				return;
			}
			if (input && !key.meta && !key.ctrl) {
				setModel(prev => prev + input);
			}
		} else if (step === 'submit') {
			onSubmit({
				provider: PROVIDERS[providerIndex],
				apiKey,
				baseUrl,
				model,
			});
		}
	});

	return (
		<Box flexDirection="column" marginBottom={1}>
			{step === 'provider' && (
				<>
					<Box marginBottom={1}>
						<Text color="cyan" bold>
							Select Provider
						</Text>
					</Box>
					{PROVIDERS.map((prov, idx) => (
						<Box key={prov}>
							<Text color={providerIndex === idx ? 'green' : 'white'}>
								{providerIndex === idx ? '>' : ' '} {prov}
							</Text>
						</Box>
					))}
					<Box marginTop={1}>
						<Text color="gray">Use ↑/↓ or j/k to select, Enter to confirm</Text>
					</Box>
				</>
			)}
			{step === 'apiKey' && (
				<>
					<Box marginBottom={1}>
						<Text color="cyan" bold>
							Enter Groq API Key
						</Text>
					</Box>
					<Box>
						<Text color="cyan">API Key: </Text>
						<Text>
							{'*'.repeat(Math.min(apiKey.length, 20))}
							{apiKey.length > 20 && '...'}
						</Text>
						<Text backgroundColor="cyan" color="cyan">
							▌
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text color="gray">Enter to continue, Esc to cancel</Text>
					</Box>
				</>
			)}
			{step === 'baseUrl' && (
				<>
					<Box marginBottom={1}>
						<Text color="cyan" bold>
							Enter Ollama Base URL
						</Text>
					</Box>
					<Box>
						<Text color="cyan">Base URL: </Text>
						<Text>{baseUrl}</Text>
						<Text backgroundColor="cyan" color="cyan">
							▌
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text color="gray">Enter to continue, Esc to cancel</Text>
					</Box>
				</>
			)}
			{step === 'model' && (
				<>
					<Box marginBottom={1}>
						<Text color="cyan" bold>
							Enter Model Name
						</Text>
					</Box>
					<Box>
						<Text color="cyan">Model: </Text>
						<Text>{model}</Text>
						<Text backgroundColor="cyan" color="cyan">
							▌
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text color="gray">Enter to finish, Esc to cancel</Text>
					</Box>
				</>
			)}
		</Box>
	);
}
