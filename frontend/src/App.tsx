import { useState, useRef, useEffect } from 'react';
import ChatBubble from './components/ChatBubble';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [mode, setMode] = useState<'qa' | 'summarize'>('qa');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setDocumentId(data.document_id);
      
      const newDoc: UploadedDoc = {
        id: data.document_id,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        uploadDate: new Date()
      };
      setUploadedDocs(prev => [newDoc, ...prev]);
      
      const systemMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Document "${file.name}" uploaded successfully (${data.characters?.toLocaleString() || 'unknown'} characters)`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      if (mode === 'summarize') {
        const formData = new FormData();
        if (documentId) {
          formData.append('document_id', documentId);
        } else {
          formData.append('text', userMessage.content);
        }
        
        const response = await fetch(`${API_URL}/summarize`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Summarization failed');
        
        const data = await response.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.summary || 'No summary available',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Q&A mode - use the new /chat endpoint with Meta LLaMA
        const chatHistory = messages
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));

        const chatRequest = {
          message: userMessage.content,
          history: chatHistory
        };
        
        const response = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequest),
        });
        
        if (!response.ok) throw new Error('Chat failed');
        
        const data = await response.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response || 'No response available',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('text')) return '📃';
    if (type.includes('image')) return '🖼️';
    return '📁';
  };

  const newChat = () => {
    setMessages([]);
    setDocumentId(null);
  };

  return (
    <div className={`h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Left Sidebar - 20% */}
      <div className="w-1/5 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={newChat}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            New Chat
          </button>
        </div>

        {/* Mode Selection */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'qa' | 'summarize')}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="qa">💬 Q&A Chat</option>
            <option value="summarize">📝 Summarize</option>
          </select>
        </div>

        {/* File Upload */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload Document
          </label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
            disabled={uploading}
          />
          {uploading && (
            <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
              Uploading...
            </div>
          )}
        </div>

        {/* Uploaded Documents */}
        <div className="flex-1 overflow-auto p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Uploaded Documents
          </h3>
          {uploadedDocs.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No documents uploaded
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setDocumentId(doc.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    documentId === doc.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-xl">{getFileIcon(doc.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {doc.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatFileSize(doc.size)} • {doc.uploadDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chat History Section */}
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Chat History
            </h3>
            <div className="space-y-1">
              <div className="p-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                Previous conversation 1
              </div>
              <div className="p-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                Previous conversation 2
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Chat Area - 60% */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            GenAI Research Assistant
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {mode === 'qa' ? '💬 Q&A Mode' : '📝 Summarize Mode'}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Upload a document and ask questions, or paste text to summarize.
                </p>
                <div className="flex justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <span>Enter = Send</span>
                  <span>Shift+Enter = New line</span>
                  <span>Ctrl+K = Focus input</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              {loading && (
                <div className="flex justify-start mb-6 animate-fadeIn">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-sm font-semibold">
                      AI
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  mode === 'qa'
                    ? documentId
                      ? 'Ask a question about your document...'
                      : 'Ask a question or upload a document first...'
                    : documentId
                    ? 'Click Send to summarize the uploaded document, or type text to summarize...'
                    : 'Paste text to summarize or upload a document...'
                }
                className="w-full p-4 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={Math.min(Math.max(input.split('\n').length, 1), 4)}
                disabled={loading}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && (mode === 'qa' || !documentId))}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
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

      {/* Right Insights Panel - 20% */}
      <div className="w-1/5 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Insights
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Quick actions for your document
          </p>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {!documentId ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Upload a document to see insights
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setMode('summarize');
                  setInput('');
                  sendMessage();
                }}
                disabled={loading}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📝</div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      Summarize Document
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Generate a concise summary
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMode('summarize');
                  setInput('Extract the key points from this document');
                  setTimeout(() => sendMessage(), 100);
                }}
                disabled={loading}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">🔑</div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      Extract Key Points
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Identify main points and insights
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMode('summarize');
                  setInput('Generate actionable tasks from this document');
                  setTimeout(() => sendMessage(), 100);
                }}
                disabled={loading}
                className="w-full p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      Generate Tasks
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Create actionable items
                    </div>
                  </div>
                </div>
              </button>
            </>
          )}

          {/* Placeholder insights boxes */}
          <div className="mt-8 space-y-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Document Stats
              </h4>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {documentId ? 'Document loaded' : 'No document selected'}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Recent Insights
              </h4>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Insights will appear here
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: Use keyboard shortcuts to navigate faster
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;


