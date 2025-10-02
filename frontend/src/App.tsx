import { useEffect, useRef, useState } from 'react';
import { ChatBubble, TypingIndicator } from './components/ChatBubble';
import { InsightsPanel } from './components/InsightsPanel';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Message = {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	mode: 'qa' | 'summarize';
	timestamp: Date;
	streaming?: boolean;
	finalContent?: string;
};

type UploadedDoc = {
	id: string;
	name: string;
	type: string;
	size: number;
	uploadDate: Date;
};

function AppContent() {
	const { setTheme, actualTheme } = useTheme();
	const [documentId, setDocumentId] = useState<string | null>(null);
	const [mode, setMode] = useState<'qa' | 'summarize'>('qa');
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		fetch(`${API_URL}/health`).catch(() => {});
	}, []);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === 'k') {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};
		
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	}, []);

	async function handleUpload(file: File) {
		setUploading(true);
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: form });
			if (!res.ok) throw new Error('Upload failed');
			const data = await res.json();
			setDocumentId(data.document_id);
			
			// Add to uploaded docs list
			const newDoc: UploadedDoc = {
				id: data.document_id,
				name: file.name,
				type: file.type || 'application/octet-stream',
				size: file.size,
				uploadDate: new Date()
			};
			setUploadedDocs(prev => [newDoc, ...prev]);
			
			const systemMsg: Message = { 
				id: crypto.randomUUID(), 
				role: 'system', 
				content: `📄 Document uploaded successfully (${data.characters.toLocaleString()} characters)`, 
				mode,
				timestamp: new Date()
			};
			setMessages(m => [...m, systemMsg]);
		} catch (e: any) {
			const errorMsg: Message = { 
				id: crypto.randomUUID(), 
				role: 'system', 
				content: `❌ Upload error: ${e.message}`, 
				mode,
				timestamp: new Date()
			};
			setMessages(m => [...m, errorMsg]);
		} finally {
			setUploading(false);
		}
	}

	async function send() {
		if (!input.trim()) return;
		const userMessage: Message = { 
			id: crypto.randomUUID(), 
			role: 'user', 
			content: input, 
			mode,
			timestamp: new Date()
		};
		setMessages(m => [...m, userMessage]);
		setInput('');
		setLoading(true);
		
		try {
			if (mode === 'summarize') {
				const form = new FormData();
				if (documentId) form.append('document_id', documentId);
				else form.append('text', userMessage.content);
				const res = await fetch(`${API_URL}/summarize`, { method: 'POST', body: form });
				const data = await res.json();
				
				const finalContent = `**Summary:**\n${data.summary}\n\n**Key Points:**\n${data.key_points?.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n') || 'None'}\n\n**Action Items:**\n${data.tasks?.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n') || 'None'}`;
				
				// Start streaming effect
				const assistantId = crypto.randomUUID();
				const assistantMsg: Message = { 
					id: assistantId, 
					role: 'assistant', 
					content: '', 
					finalContent,
					mode,
					timestamp: new Date(),
					streaming: true
				};
				setMessages(m => [...m, assistantMsg]);
				
				// Simulate streaming
				simulateStreaming(assistantId, finalContent);
			} else {
				const form = new FormData();
				form.append('question', userMessage.content);
				if (documentId) form.append('document_id', documentId);
				else form.append('context', '');
				const res = await fetch(`${API_URL}/qa`, { method: 'POST', body: form });
				const data = await res.json();
				
				// Start streaming effect
				const assistantId = crypto.randomUUID();
				const assistantMsg: Message = { 
					id: assistantId, 
					role: 'assistant', 
					content: '', 
					finalContent: data.answer,
					mode,
					timestamp: new Date(),
					streaming: true
				};
				setMessages(m => [...m, assistantMsg]);
				
				// Simulate streaming
				simulateStreaming(assistantId, data.answer);
			}
		} catch (e: any) {
			const errorMsg: Message = { 
				id: crypto.randomUUID(), 
				role: 'system', 
				content: `❌ Error: ${e.message}`, 
				mode,
				timestamp: new Date()
			};
			setMessages(m => [...m, errorMsg]);
		} finally {
			setLoading(false);
		}
	}

	function simulateStreaming(messageId: string, finalText: string) {
		let index = 0;
		const interval = setInterval(() => {
			if (index < finalText.length) {
				const currentText = finalText.slice(0, index + 1);
				setMessages(prev => prev.map(msg => 
					msg.id === messageId 
						? { ...msg, content: currentText }
						: msg
				));
				index++;
			} else {
				// Streaming complete
				setMessages(prev => prev.map(msg => 
					msg.id === messageId 
						? { ...msg, streaming: false }
						: msg
				));
				clearInterval(interval);
			}
		}, 30);
	}

	function newChat() {
		setMessages([]);
		setDocumentId(null);
	}

	function regenerateLastMessage() {
		// Find the last user message and resend it
		const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
		if (lastUserMessage) {
			setInput(lastUserMessage.content);
			// Remove the last AI response
			setMessages(prev => {
				const lastAiIndex = prev.map((msg, index) => ({ msg, index }))
					.filter(({ msg }) => msg.role === 'assistant')
					.pop()?.index;
				if (lastAiIndex !== undefined) {
					return prev.slice(0, lastAiIndex);
				}
				return prev;
			});
		}
	}

	function handleInsightAction(action: 'summarize' | 'keypoints' | 'tasks') {
		if (!documentId) return;
		
		setMode('summarize');
		if (action === 'summarize') {
			setInput('');
			send();
		} else if (action === 'keypoints') {
			setInput('Extract the key points from this document');
			setTimeout(() => send(), 100);
		} else if (action === 'tasks') {
			setInput('Generate actionable tasks from this document');
			setTimeout(() => send(), 100);
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function getFileIcon(type: string): string {
		if (type.includes('pdf')) return '📄';
		if (type.includes('word') || type.includes('document')) return '📝';
		if (type.includes('text')) return '📃';
		if (type.includes('image')) return '🖼️';
		return '📁';
	}

	return (
		<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
			{/* Left Sidebar */}
			<div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden`}>
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<button 
						onClick={newChat}
						className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
					>
						<span>+</span>
						New Chat
					</button>
				</div>
				
				<div className="flex-1 overflow-auto">
					<div className="p-4 space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mode</label>
							<select 
								value={mode} 
								onChange={e => setMode(e.target.value as any)} 
								className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
							>
								<option value="qa">💬 Q&A Chat</option>
								<option value="summarize">📝 Summarize</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Document</label>
							<input 
								ref={fileInputRef} 
								type="file" 
								className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300" 
								onChange={e => e.target.files && e.target.files[0] && handleUpload(e.target.files[0])} 
								disabled={uploading} 
							/>
							{uploading && <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">Uploading...</div>}
						</div>

						{/* Uploaded Documents */}
						<div>
							<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Documents</h3>
							{uploadedDocs.length === 0 ? (
								<div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
									No documents uploaded
								</div>
							) : (
								<div className="space-y-2">
									{uploadedDocs.map(doc => (
										<div 
											key={doc.id}
											className={`p-2 rounded border cursor-pointer transition-colors ${
												documentId === doc.id 
													? 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700' 
													: 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
											}`}
											onClick={() => setDocumentId(doc.id)}
										>
											<div className="flex items-start gap-2">
												<div className="text-lg">{getFileIcon(doc.type)}</div>
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium text-gray-900 dark:text-white truncate">
														{doc.name}
													</div>
													<div className="text-xs text-gray-500 dark:text-gray-400">
														{formatFileSize(doc.size)} • {doc.uploadDate.toLocaleDateString()}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col">
				{/* Header */}
				<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<button 
								onClick={() => setSidebarOpen(!sidebarOpen)}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
								</svg>
							</button>
							<h1 className="text-xl font-semibold text-gray-900 dark:text-white">GenAI Research Assistant</h1>
						</div>
						<div className="flex items-center gap-4">
							<div className="text-sm text-gray-500 dark:text-gray-400">
								{mode === 'qa' ? '💬 Q&A Mode' : '📝 Summarize Mode'}
							</div>
							<button
								onClick={() => setTheme(actualTheme === 'dark' ? 'light' : 'dark')}
								className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
								title="Toggle theme"
							>
								{actualTheme === 'dark' ? '☀️' : '🌙'}
							</button>
						</div>
					</div>
				</header>

				{/* Chat Messages */}
				<div className="flex-1 overflow-auto p-4 space-y-4">
					{messages.length === 0 && (
						<div className="text-center text-gray-500 dark:text-gray-400 mt-20">
							<div className="text-6xl mb-4">🤖</div>
							<h2 className="text-2xl font-semibold mb-2">How can I help you today?</h2>
							<p>Upload a document and ask questions, or paste text to summarize.</p>
							<div className="mt-6 text-sm">
								<div className="flex justify-center gap-4">
									<span>Enter = Send</span>
									<span>Shift+Enter = New line</span>
									<span>Ctrl+K = Focus input</span>
								</div>
							</div>
						</div>
					)}
					
					{messages.map(msg => (
						<ChatBubble 
							key={msg.id} 
							message={msg} 
							onRegenerate={regenerateLastMessage}
							onFeedback={(type) => console.log('Feedback:', type, msg.id)}
						/>
					))}
					
					{loading && <TypingIndicator />}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Area */}
				<div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-end gap-2">
							<div className="flex-1 relative">
								<textarea
									ref={inputRef}
									value={input}
									onChange={e => setInput(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											send();
										}
									}}
									placeholder={mode === 'qa' 
										? documentId 
											? "Ask a question about your document..." 
											: "Ask a question or upload a document first..."
										: documentId
											? "Click Send to summarize the uploaded document, or type text to summarize..."
											: "Paste text to summarize or upload a document..."
									}
									className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									rows={Math.min(Math.max(input.split('\n').length, 1), 4)}
									disabled={loading}
								/>
							</div>
							<button
								onClick={send}
								disabled={loading || (!input.trim() && (mode === 'qa' || !documentId))}
								className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
							>
								{loading ? (
									<>
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
										Thinking...
									</>
								) : (
									<>
										<span>➤</span>
										Send
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Right Insights Panel */}
			<InsightsPanel 
				documentId={documentId}
				onSummarize={() => handleInsightAction('summarize')}
				onExtractKeyPoints={() => handleInsightAction('keypoints')}
				onGenerateTasks={() => handleInsightAction('tasks')}
				loading={loading}
			/>
		</div>
	);
}

export default function App() {
	return (
		<ThemeProvider>
			<AppContent />
		</ThemeProvider>
	);
}


