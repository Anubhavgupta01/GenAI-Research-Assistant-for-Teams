import { useEffect, useMemo, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Message = {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	mode: 'qa' | 'summarize';
};

export default function App() {
	const [documentId, setDocumentId] = useState<string | null>(null);
	const [mode, setMode] = useState<'qa' | 'summarize'>('qa');
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [uploading, setUploading] = useState(false);
	const [loading, setLoading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		fetch(`${API_URL}/health`).catch(() => {});
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
			setMessages(m => [{ id: crypto.randomUUID(), role: 'system', content: `File uploaded (chars: ${data.characters}).`, mode }, ...m]);
		} catch (e: any) {
			setMessages(m => [{ id: crypto.randomUUID(), role: 'system', content: `Upload error: ${e.message}`, mode }, ...m]);
		} finally {
			setUploading(false);
		}
	}

	async function send() {
		if (!input.trim()) return;
		const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input, mode };
		setMessages(m => [userMessage, ...m]);
		setInput('');
		setLoading(true);
		try {
			if (mode === 'summarize') {
				const form = new FormData();
				if (documentId) form.append('document_id', documentId);
				else form.append('text', userMessage.content);
				const res = await fetch(`${API_URL}/summarize`, { method: 'POST', body: form });
				const data = await res.json();
				setMessages(m => [{ id: crypto.randomUUID(), role: 'assistant', content: data.summary, mode }, ...m]);
			} else {
				const form = new FormData();
				form.append('question', userMessage.content);
				if (documentId) form.append('document_id', documentId);
				else form.append('context', '');
				const res = await fetch(`${API_URL}/qa`, { method: 'POST', body: form });
				const data = await res.json();
				setMessages(m => [{ id: crypto.randomUUID(), role: 'assistant', content: data.answer, mode }, ...m]);
			}
		} catch (e: any) {
			setMessages(m => [{ id: crypto.randomUUID(), role: 'system', content: `Error: ${e.message}`, mode }, ...m]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen flex flex-col">
			<header className="border-b border-white/10 bg-[var(--panel)]">
				<div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
					<h1 className="font-semibold">GenAI Research Assistant</h1>
					<div className="flex items-center gap-2">
						<select value={mode} onChange={e => setMode(e.target.value as any)} className="bg-transparent border border-white/20 rounded px-2 py-1">
							<option value="qa">Q&A</option>
							<option value="summarize">Summarize</option>
						</select>
						<button onClick={() => setDocumentId(null)} className="text-sm text-[var(--muted)] hover:text-white">Clear doc</button>
					</div>
				</div>
			</header>
			<main className="flex-1">
				<div className="mx-auto max-w-5xl px-4 py-6 grid gap-6 md:grid-cols-[320px_1fr]">
					<section className="bg-[var(--panel)]/60 rounded border border-white/10 p-4 h-fit">
						<h2 className="font-medium mb-3">Document</h2>
						<div className="space-y-3">
							<input ref={fileInputRef} type="file" className="block w-full text-sm" onChange={e => e.target.files && e.target.files[0] && handleUpload(e.target.files[0])} disabled={uploading} />
							{documentId ? (
								<div className="text-sm text-[var(--muted)]">document_id: {documentId}</div>
							) : (
								<div className="text-sm text-[var(--muted)]">No document uploaded. You can still summarize ad-hoc text.</div>
							)}
						</div>
					</section>
					<section className="bg-[var(--panel)]/60 rounded border border-white/10 p-4 flex flex-col">
						<div className="flex-1 overflow-auto flex flex-col-reverse gap-3">
							{messages.map(m => (
								<div key={m.id} className="rounded p-3 border border-white/10">
									<div className="text-xs uppercase tracking-wide text-[var(--muted)] mb-1">{m.role}</div>
									<div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
								</div>
							))}
						</div>
						<div className="mt-3 flex items-center gap-2">
							<input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
								className="flex-1 bg-transparent border border-white/20 rounded px-3 py-2" placeholder={mode === 'qa' ? 'Ask a question…' : 'Paste text to summarize (or use uploaded doc)…'} />
							<button onClick={send} disabled={loading} className="px-3 py-2 rounded bg-white text-black disabled:opacity-50">{loading ? '…' : 'Send'}</button>
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}


