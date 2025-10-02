import React from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  // Simple markdown rendering
  const renderContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .replace(/\n/g, '<br>');
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fadeIn">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 text-yellow-800 dark:text-yellow-200 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-6 animate-fadeIn ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
            isUser ? 'bg-blue-500' : 'bg-gray-500'
          }`}>
            {isUser ? 'U' : 'AI'}
          </div>
        </div>

        {/* Message bubble */}
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-md' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
        }`}>
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
          />
          <div className={`text-xs mt-2 opacity-70 ${
            isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;