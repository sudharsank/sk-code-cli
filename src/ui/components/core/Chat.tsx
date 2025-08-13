import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useApp} from 'ink';
import {Agent} from '../../../core/agent.js';
import {useAgent} from '../../hooks/useAgent.js';
import {useTokenMetrics} from '../../hooks/useTokenMetrics.js';
import MessageHistory from './MessageHistory.js';
import MessageInput from './MessageInput.js';
import TokenMetrics from '../display/TokenMetrics.js';
import PendingToolApproval from '../input-overlays/PendingToolApproval.js';
import CommentApproval from '../input-overlays/CommentApproval.js';
import Login from '../input-overlays/Login.js';
import ModelSelector from '../input-overlays/ModelSelector.js';
import MaxIterationsContinue from '../input-overlays/MaxIterationsContinue.js';
import {handleSlashCommand} from '../../../commands/index.js';
import CommentWizard from '../input-overlays/CommentWizard.js';

interface ChatProps {
	agent: Agent;
}

export default function Chat({agent}: ChatProps) {
	const {
		completionTokens,
		startTime,
		endTime,
		pausedTime,
		isPaused,
		isActive,
		startRequest,
		addApiTokens,
		pauseMetrics,
		resumeMetrics,
		completeRequest,
		resetMetrics,
	} = useTokenMetrics();

	const agentHook = useAgent(
		agent,
		startRequest, // Start tracking on new request
		addApiTokens, // Add API usage tokens throughout the request
		pauseMetrics, // Pause during approval
		resumeMetrics, // Resume after approval
		completeRequest, // Complete when agent is done
	);

	const {
		messages,
		userMessageHistory,
		isProcessing,
		currentToolExecution,
		pendingApproval,
		pendingMaxIterations,
		sessionAutoApprove,
		showReasoning,
		sendMessage,
		approveToolExecution,
		respondToMaxIterations,
		addMessage,
		setApiKey,
		clearHistory,
		toggleAutoApprove,
		toggleReasoning,
		interruptRequest,
	} = agentHook;

	const {exit} = useApp();
	const [inputValue, setInputValue] = useState('');
	const [showInput, setShowInput] = useState(true);
	const [showLogin, setShowLogin] = useState(false);
	const [showModelSelector, setShowModelSelector] = useState(false);
	const [showCommentOptions, setShowCommentOptions] = useState(false);
	const [commentTarget, setCommentTarget] = useState<string | undefined>(undefined);
	const [commentApproval, setCommentApproval] = useState<{
		show: boolean;
		filePath?: string;
		oldText?: string;
		newText?: string;
		resolve?: (approved: boolean, autoApproveSession?: boolean) => void;
	}>({ show: false });

	// Handle global keyboard shortcuts
	useInput((input, key) => {
		if (key.ctrl && input === 'c') {
			exit();
		}
		if (key.shift && key.tab) {
			toggleAutoApprove();
		}
		if (key.escape) {
			// If waiting for tool approval, reject the tool
			if (pendingApproval) {
				handleApproval(false);
			}
			// If model is actively processing (but not waiting for approval or executing tools after approval)
			else if (isProcessing && !currentToolExecution) {
				interruptRequest();
			}
			// If user is typing and nothing else is happening, clear the input
			else if (showInput && inputValue.trim()) {
				setInputValue('');
			}
		}
	});

	// Hide input when processing, waiting for approval, or showing login/model selector
	useEffect(() => {
		setShowInput(
			!isProcessing && !pendingApproval && !showLogin && !showModelSelector,
		);
	}, [isProcessing, pendingApproval, showLogin, showModelSelector]);

	const handleSendMessage = async (message: string) => {
		if (message.trim() && !isProcessing) {
			setInputValue('');

			// Handle slash commands
			if (message.startsWith('/')) {
				handleSlashCommand(message, {
					addMessage,
					clearHistory,
					setShowLogin,
					setShowModelSelector,
					toggleReasoning,
					showReasoning,
					setShowCommentOptions: ({show, target}) => {
						setShowCommentOptions(show);
						setCommentTarget(target);
					},
					setShowCommentApproval: ({ show, filePath, oldText, newText, resolve }) => {
						setCommentApproval({ show, filePath, oldText, newText, resolve });
					},
				});
				return;
			}

			// The agent will handle starting request tracking
			await sendMessage(message);
		}
	};

	const handleApproval = (approved: boolean, autoApproveSession?: boolean) => {
		approveToolExecution(approved, autoApproveSession);
	};

	const handleLogin = (config: {
		provider: string;
		apiKey: string;
		baseUrl: string;
		model: string;
	}) => {
		setShowLogin(false);
		addMessage({
			role: 'system',
			content: 'Saving settings, please wait...'
		});
		// Save the config persistently (to be implemented in agent/config)
		if (agent.saveProviderConfig) {
			agent.saveProviderConfig(config);
		} else if (agent.saveApiKey) {
			agent.saveApiKey(config.apiKey);
		}
		addMessage({
			role: 'system',
			content: `${config.provider} configuration saved successfully. You can now start chatting with the assistant.`,
		});
	};

	const handleLoginCancel = () => {
		setShowLogin(false);
		addMessage({
			role: 'system',
			content: 'Login canceled.',
		});
	};

	const handleModelSelect = (model: string) => {
		setShowModelSelector(false);
		// Clear chat history when switching models
		clearHistory();
		// Set the new model on the agent
		agent.setModel(model);
		addMessage({
			role: 'system',
			content: `Switched to model: ${model}. Chat history has been cleared.`,
		});
	};

	const handleModelCancel = () => {
		setShowModelSelector(false);
		addMessage({
			role: 'system',
			content: 'Model selection canceled.',
		});
	};

	return (
		<Box flexDirection="column" height="100%">
			{/* Chat messages area */}
			<Box flexGrow={1} flexDirection="column" paddingX={1}>
				<MessageHistory messages={messages} showReasoning={showReasoning} />
			</Box>

			{/* Token metrics */}
			<TokenMetrics
				isActive={isActive}
				isPaused={isPaused}
				startTime={startTime}
				endTime={endTime}
				pausedTime={pausedTime}
				completionTokens={completionTokens}
			/>

			{/* Input area */}
			<Box borderStyle="round" borderColor="white" paddingX={1}>
				{pendingApproval ? (
					<PendingToolApproval
						toolName={pendingApproval.toolName}
						toolArgs={pendingApproval.toolArgs}
						onApprove={() => handleApproval(true, false)}
						onReject={() => handleApproval(false, false)}
						onApproveWithAutoSession={() => handleApproval(true, true)}
					/>
					) : commentApproval.show ? (
						<CommentApproval
							filePath={commentApproval.filePath || ''}
							oldText={commentApproval.oldText}
							newText={commentApproval.newText}
							onApprove={(auto) => {
								commentApproval.resolve?.(true, auto);
								if (auto) {
									// Reuse existing toggle for session auto-approve indicator
									if (!sessionAutoApprove) toggleAutoApprove();
								}
								setCommentApproval({ show: false });
							}}
							onReject={() => {
								commentApproval.resolve?.(false, false);
								setCommentApproval({ show: false });
							}}
						/>
				) : pendingMaxIterations ? (
					<MaxIterationsContinue
						maxIterations={pendingMaxIterations.maxIterations}
						onContinue={() => respondToMaxIterations(true)}
						onStop={() => respondToMaxIterations(false)}
					/>
				) : showCommentOptions ? (
					<CommentWizard
						defaultTarget={commentTarget}
						onRun={({target, useLLM, dryRun, overwrite, interactive}) => {
							setShowCommentOptions(false);
                            const flags = [useLLM ? '--llm' : '', dryRun ? '--dry-run' : '', overwrite ? '--overwrite' : '', interactive ? '--interactive' : '']
                                .filter(Boolean)
                                .join(' ');
                            const finalCmd = `/comment ${target} ${flags}`.trim();
                            handleSlashCommand(finalCmd, {
                                addMessage,
                                clearHistory,
                                setShowLogin,
                                setShowModelSelector,
                                toggleReasoning,
                                showReasoning,
                                setShowCommentOptions: ({show, target}) => {
                                    setShowCommentOptions(show);
                                    setCommentTarget(target);
                                },
								setShowCommentApproval: ({ show, filePath, oldText, newText, resolve }) => {
									setCommentApproval({ show, filePath, oldText, newText, resolve });
								},
                            });
                        }}
                        onCancel={() => {
                            setShowCommentOptions(false);
                            addMessage({ role: 'system', content: 'Comment canceled.' });
                        }}
                    />
				) : showLogin ? (
					<Login onSubmit={handleLogin} onCancel={handleLoginCancel} />
				) : showModelSelector ? (
					<ModelSelector
						onSubmit={handleModelSelect}
						onCancel={handleModelCancel}
						currentModel={agent.getCurrentModel?.() || undefined}
					/>
				) : showInput ? (
					<MessageInput
						value={inputValue}
						onChange={setInputValue}
						onSubmit={handleSendMessage}
						placeholder="... (Esc to clear, Ctrl+C to exit)"
						userMessageHistory={userMessageHistory}
					/>
				) : (
					<Box>
						<Text color="gray" dimColor>
							Processing...
						</Text>
					</Box>
				)}
			</Box>

			<Box justifyContent="space-between" paddingX={1}>
				<Box>
					<Text color="cyan" bold>
						{sessionAutoApprove ? 'auto-approve edits is on' : ''}
					</Text>
				</Box>
				<Box>
					<Text color="gray" dimColor>
						{agent.getCurrentModel?.() || ''}
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
