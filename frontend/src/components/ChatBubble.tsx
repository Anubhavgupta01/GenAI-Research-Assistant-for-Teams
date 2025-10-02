import { useState } from 'react';

interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	mode: 'qa' | 'summarize';
	timestamp: Date;
	streaming?: boolean;
}

interface ChatBubbleProps {
	message: Message;
	onRegenerate?: () => void;
	onFeedback?: (type: 'up' | 'down') => void;
}

export function ChatBubble({ message, onRegenerate, onFeedback }: ChatBubbleProps) {
	const [copied, setCopied] = useState(false);
	const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(message.content);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy text:', err);
		}
	};

	const handleFeedback = (type: 'up' | 'down') => {
		setFeedback(type);
		onFeedback?.(type);
	};

	const renderMarkdown = (text: string) => {
		// Simple markdown rendering
		return text
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>')
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto"><code>$2</code></pre>')
			.replace(/\n/g, '<br>');
	};

	const getAvatar = () => {
		switch (message.role) {
			case 'user':
				return (
					<div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
						U
					</div>
				);
			case 'assistant':
				return (
					<div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
						🤖
					</div>
				);
			case 'system':
				return (
					<div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white">
						⚠️
					</div>
				);
		}
	};

	return (
		<div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
			<div className={`flex gap-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
				{/* Avatar */}
				<div className="flex-shrink-0">
					{getAvatar()}
				</div>

				{/* Message Content */}
				<div className={`rounded-lg p-4 ${
					message.role === 'user' 
						? 'bg-blue-600 text-white' 
						: message.role === 'system'
						? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700'
						: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
				}`}>
					<div 
						className="prose prose-sm max-w-none dark:prose-invert"
						dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
					/>
					
					{/* Timestamp */}
					<div className={`text-xs mt-2 opacity-70 ${
						message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
					}`}>
						{message.timestamp.toLocaleTimeString()}
					</div>

					{/* Actions for AI messages */}
					{message.role === 'assistant' && !message.streaming && (
						<div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
							<button
								onClick={copyToClipboard}
								className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
								title="Copy message"
							>
								{copied ? '✅' : '📋'} {copied ? 'Copied!' : 'Copy'}
							</button>
							
							{onRegenerate && (
								<button
									onClick={onRegenerate}
									className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
									title="Regenerate response"
								>
									🔄 Regenerate
								</button>
							)}
							
							<div className="flex items-center gap-1 ml-auto">
								<button
									onClick={() => handleFeedback('up')}
									className={`p-1 rounded transition-colors ${
										feedback === 'up' 
											? 'text-green-600 bg-green-100 dark:bg-green-900' 
											: 'text-gray-400 hover:text-green-600'
									}`}
									title="Good response"
								>
									👍
								</button>
								<button
									onClick={() => handleFeedback('down')}
									className={`p-1 rounded transition-colors ${
										feedback === 'down' 
											? 'text-red-600 bg-red-100 dark:bg-red-900' 
											: 'text-gray-400 hover:text-red-600'
									}`}
									title="Bad response"
								>
									👎
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export function TypingIndicator() {
	return (
		<div className="flex justify-start animate-fadeIn">
			<div className="flex gap-3 max-w-3xl">
				<div className="flex-shrink-0">
					<div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
						🤖
					</div>
				</div>
				<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
					<div className="flex items-center gap-1">
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
						<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
					</div>
				</div>
			</div>
		</div>
	);
}
