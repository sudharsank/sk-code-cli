export interface CommandContext {
	addMessage: (message: any) => void;
	clearHistory: () => void;
	setShowLogin: (show: boolean) => void;
	setShowModelSelector?: (show: boolean) => void;
	toggleReasoning?: () => void;
	showReasoning?: boolean;
	setShowCommentOptions?: (options: { show: boolean; target?: string }) => void;
	setShowCommentApproval?: (options: {
		show: boolean;
		filePath?: string;
		oldText?: string;
		newText?: string;
		resolve?: (approved: boolean, autoApproveSession?: boolean) => void;
	}) => void;
}

export interface CommandDefinition {
	command: string;
	description: string;
	handler: (context: CommandContext, args?: string) => void | Promise<void>;
}

export abstract class BaseCommand implements CommandDefinition {
	abstract command: string;
	abstract description: string;
	abstract handler(context: CommandContext, args?: string): void | Promise<void>;
}
