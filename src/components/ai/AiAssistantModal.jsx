import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { uploadImageToCloudinary } from '../../utils/cloudinaryUtil';
import { formatTime } from '../../utils/timeUtil';
import { renderMessageText } from '../../utils/textUtil';
import AiMarkdownRenderer from './AiMarkdownRenderer';
import {
  createConversation,
  saveMessage,
  subscribeToConversations,
  subscribeToMessages,
  renameConversation,
  deleteConversation
} from '../../firebase/aiHistoryService';
import {
  X,
  Bot,
  Plus,
  Image as ImageIcon,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  User,
  Trash2,
  History,
  Edit2,
  Check,
  MessageSquare
} from 'lucide-react';

const AI_CHAT_ENDPOINT = 'https://chat-ai-worker.chat-ai-md.workers.dev/chat';

export default function AiAssistantModal({ onClose }) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Rename & Delete States
  const [editingConvId, setEditingConvId] = useState(null);
  const [renameInputText, setRenameInputText] = useState('');
  const [deletingConvId, setDeletingConvId] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const activeBotMsgIdRef = useRef(null);

  // 1. Subscribe to Conversation List
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToConversations(
      currentUser.uid,
      (convList) => {
        setConversations(convList);
      },
      (err) => {
        console.warn('AI Conversations Read Error:', err.message);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // 2. Subscribe to Messages for Active Conversation
  useEffect(() => {
    if (!currentUser || !activeConversationId) {
      // Welcome message for new unsaved session
      setMessages([
        {
          id: 'welcome',
          text: "Hello! I am your AI Assistant 🤖\n\nI can assist you with:\n• Bangla & English conversations\n• Education & Mathematics\n• Coding & Programming\n• Translation & Writing\n• Image Analysis & Vision\n\nHow can I help you today?",
          isUser: false,
          timestamp: Date.now()
        }
      ]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      currentUser.uid,
      activeConversationId,
      (fetchedMsgs) => {
        if (fetchedMsgs && fetchedMsgs.length > 0) {
          const mapped = fetchedMsgs.map((m) => ({
            id: m.messageId,
            text: m.text,
            imageUrl: m.imageUrl,
            isUser: m.isUser,
            timestamp: m.timestamp
          }));
         setMessages((prev) => {
  const activeBotId = activeBotMsgIdRef.current;

  const pendingBot = prev.find(
    (m) => m.id === activeBotId && activeBotId
  );

  const baseMessages = mapped.length > 0
    ? mapped
    : [{
        id: 'welcome',
        text: "Hello! I am your AI Assistant 🤖\n\nI can assist you with:\n• Bangla & English conversations\n• Education & Mathematics\n• Coding & Programming\n• Translation & Writing\n• Image Analysis & Vision\n\nHow can I help you today?",
        isUser: false,
        timestamp: Date.now()
      }];

  if (!pendingBot || mapped.some((m) => m.id === pendingBot.id)) {
    return baseMessages;
  }

  return [...baseMessages, pendingBot];
}); 
        } else {
          setMessages([
            {
              id: 'welcome',
              text: "Hello! I am your AI Assistant 🤖\n\nI can assist you with:\n• Bangla & English conversations\n• Education & Mathematics\n• Coding & Programming\n• Translation & Writing\n• Image Analysis & Vision\n\nHow can I help you today?",
              isUser: false,
              timestamp: Date.now()
            }
          ]);
        }
      },
      (err) => {
        console.warn('AI Messages Read Error:', err.message);
      }
    );

    return unsubscribe;
  }, [activeConversationId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Invalid file type. Please select an image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size exceeds 10MB limit.');
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    clearImage();
    setInput('');
    setErrorMsg('');
    setIsHistoryDrawerOpen(false);
  };

  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    setEditingConvId(conv.conversationId);
    setRenameInputText(conv.title || '');
  };

  const handleSaveRename = async (e, convId) => {
    e.stopPropagation();
    if (!renameInputText.trim()) return;

    try {
      await renameConversation(currentUser.uid, convId, renameInputText.trim());
      setEditingConvId(null);
      setRenameInputText('');
    } catch (err) {
      setErrorMsg(`Failed to rename: ${err.message}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingConvId) return;

    try {
      await deleteConversation(currentUser.uid, deletingConvId);
      if (activeConversationId === deletingConvId) {
        setActiveConversationId(null);
      }
      setDeletingConvId(null);
    } catch (err) {
      setErrorMsg(`Failed to delete conversation: ${err.message}`);
      setDeletingConvId(null);
    }
  };










  const handleSend = async (e) => {
    e.preventDefault();

    const promptText = input.trim();

    if (!promptText && !selectedFile) {
      setErrorMsg('Please enter a prompt or attach an image.');
      return;
    }

    if (isSending) return;

    setIsSending(true);
    setErrorMsg('');

    const currentPreview = previewUrl;
    const currentFile = selectedFile;

    setInput('');
    clearImage();

    let targetConvId = activeConversationId;
    let botMsgId = null;

    try {
      // 1. Upload image if attached
      let uploadedImageUrl = null;

      if (currentFile) {
        uploadedImageUrl = await uploadImageToCloudinary(
          currentFile,
          'ai_web_chat'
        );
      }

      // 2. Prepare user message
      const userMsgId = 'user_' + Date.now();

      const userMsgData = {
        messageId: userMsgId,
        text: promptText,
        imageUrl: uploadedImageUrl || currentPreview,
        isUser: true,
        timestamp: Date.now()
      };

      // 3. Show user message immediately
      setMessages((prev) => [...prev, userMsgData]);

      // 4. Show AI loading message immediately
      botMsgId = 'bot_' + Date.now();
      activeBotMsgIdRef.current = botMsgId;

      const botLoadingMsg = {
        id: botMsgId,
        text: 'Thinking...',
        isUser: false,
        timestamp: Date.now() + 1,
        isLoading: true
      };

      setMessages((prev) => [...prev, botLoadingMsg]);

      // 5. Save user message in background.
      // Firestore failure must NOT stop the AI request.
      const historySavePromise = (async () => {
        try {
          if (!targetConvId) {
            targetConvId = await createConversation(
              currentUser.uid,
              userMsgData
            );

            setActiveConversationId(targetConvId);
          } else {
            await saveMessage(
              currentUser.uid,
              targetConvId,
              userMsgData
            );
          }

          return targetConvId;
        } catch (historyErr) {
          console.error('User history save error:', historyErr);
          setErrorMsg(
            'Notice: AI History could not be saved. AI chat will continue.'
          );
          return null;
        }
      })();

      // 6. Get Firebase ID token
      const idToken = await currentUser.getIdToken(false);

      // 7. Prepare previous conversation history
      const historyArray = messages
        .filter(
          (m) =>
            m.id !== 'welcome' &&
            !m.id?.startsWith('welcome') &&
            !m.isLoading
        )
        .map((m) => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text || '[Attachment]'
        }));

      // 8. Send request to AI Worker
      const res = await fetch(AI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          imageUrl: uploadedImageUrl,
          history: historyArray
        })
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server error ${res.status}`
        );
      }

      let fullResponseText = '';

      // 9. Handle streaming response
      if (contentType.includes('text/event-stream')) {
        if (!res.body) {
          throw new Error('Streaming response body is empty.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processSSELine = (line) => {
          if (!line.startsWith('data:')) return;

          const dataText = line.slice(5).trim();

          if (!dataText || dataText === '[DONE]') return;

          try {
            const parsed = JSON.parse(dataText);

            if (parsed.error) {
              throw new Error(parsed.error);
            }

            const chunk =
              parsed.response ||
              parsed.choices?.[0]?.delta?.content ||
              parsed.delta?.content ||
              parsed.text ||
              '';

            if (typeof chunk === 'string' && chunk.length > 0) {
              fullResponseText += chunk;

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMsgId
                    ? {
                        ...m,
                        text: fullResponseText,
                        isLoading: false
                      }
                    : m
                )
              );
            }
          } catch (err) {
            if (err.message !== 'Unexpected end of JSON input') {
              console.error('AI Stream Parse Error:', err);
            }
          }
        };

        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            processSSELine(line.trim());
          }
        }

        buffer += decoder.decode();

        if (buffer.trim()) {
          processSSELine(buffer.trim());
        }

        if (!fullResponseText) {
          throw new Error('AI returned an empty response.');
        }
      } else {
        // 10. Handle normal JSON response
        const data = await res.json();

        if (data.status === 'success') {
          fullResponseText = data.response || 'No response received.';

          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    text: fullResponseText,
                    isLoading: false
                  }
                : m
            )
          );
        } else {
          throw new Error(data.message || 'AI response failed.');
        }
      }

      // 11. Wait for user history save, but only AFTER AI response
      const savedConvId = await historySavePromise;

      // 12. Save completed AI response to Firestore
      if (savedConvId) {
        try {
          await saveMessage(currentUser.uid, savedConvId, {
            messageId: botMsgId,
            text: fullResponseText,
            imageUrl: null,
            isUser: false,
            timestamp: Date.now()
          });
        } catch (historyErr) {
          console.error('AI history save error:', historyErr);

          setErrorMsg(
            'Notice: AI replied, but the response could not be saved to History.'
          );
        }
      }

      activeBotMsgIdRef.current = null;

    } catch (err) {
      console.error('AI Chat Error:', err);

      const errMsg =
        err.message || 'Failed to connect to AI Assistant';

      if (botMsgId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  text: `Error: ${errMsg}`,
                  isLoading: false,
                  isError: true
                }
              : m
          )
        );
      }

      activeBotMsgIdRef.current = null;

    } finally {
      setIsSending(false);
    }
  };




















  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-[#0F172A] border-0 sm:border border-[#334155] rounded-none sm:rounded-3xl w-full h-full sm:h-[90vh] sm:max-w-4xl flex overflow-hidden shadow-2xl relative">
        {/* Slide-over History Drawer / Sidebar */}
        <div
          className={`bg-[#1E293B] border-r border-[#334155] flex flex-col shrink-0 transition-all duration-300 z-20 ${
            isHistoryDrawerOpen
              ? 'absolute sm:relative inset-y-0 left-0 w-72 h-full shadow-2xl sm:shadow-none'
              : 'hidden sm:flex w-64'
          }`}
        >
          {/* History Header */}
          <div className="p-3.5 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <History className="w-4 h-4 text-[#38BDF8]" />
              <span>History</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewChat}
                disabled={isSending}
                className="p-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold flex items-center gap-1 transition"
                title="Start New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>

              <button
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="sm:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-white"
                title="Close History"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[#334155]/30">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-[#94A3B8] text-xs space-y-1">
                <MessageSquare className="w-6 h-6 mx-auto opacity-40 text-[#38BDF8]" />
                <p className="font-semibold text-white">No history yet</p>
                <p className="text-[11px]">Start a conversation to save your history.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.conversationId === activeConversationId;
                const isEditing = editingConvId === conv.conversationId;

                return (
                  <div
                    key={conv.conversationId}
                    onClick={() => {
                      if (!isEditing) {
                        setActiveConversationId(conv.conversationId);
                        setIsHistoryDrawerOpen(false);
                      }
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 group ${
                      isSelected
                        ? 'bg-[#5865F2]/20 border border-[#5865F2]/50 text-white font-semibold'
                        : 'hover:bg-[#0F172A]/50 text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={renameInputText}
                            onChange={(e) => setRenameInputText(e.target.value)}
                            className="w-full bg-[#0F172A] border border-[#38BDF8] rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={(e) => handleSaveRename(e, conv.conversationId)}
                            className="p-1 text-[#22C55E] hover:bg-white/10 rounded-md"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-semibold truncate leading-tight">
                            {conv.title || 'Conversation'}
                          </p>
                          <p className="text-[10px] opacity-70 truncate mt-0.5">
                            {formatTime(conv.updatedAt || conv.createdAt)}
                          </p>
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={(e) => handleStartRename(e, conv)}
                          className="p-1 text-[#94A3B8] hover:text-[#38BDF8] rounded-md hover:bg-white/10"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingConvId(conv.conversationId);
                          }}
                          className="p-1 text-[#94A3B8] hover:text-[#EF4444] rounded-md hover:bg-white/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main AI Chat Content Container */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-[#0F172A] relative">
          {/* Header Toolbar */}
          <div className="h-[65px] px-3 sm:px-5 bg-[#4752C4] border-b border-[#334155] flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <button
                onClick={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1 text-xs font-bold bg-white/10"
                title="Toggle History"
              >
                <History className="w-4 h-4 text-[#38BDF8]" />
                <span className="hidden sm:inline">History</span>
              </button>

              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm relative">
                <Sparkles className="w-5 h-5 text-[#38BDF8] animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white leading-tight truncate">
                    AI Assistant
                  </h3>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#38BDF8] text-[9px] sm:text-[10px] font-bold shrink-0">
                    ChatGPT & Llama-3
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/80 truncate">
                  Bangla, English, Math, Code & Vision
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={handleNewChat}
                disabled={isSending}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1 transition"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="px-4 py-2 bg-[#EF4444]/10 border-b border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg('')} className="underline font-bold text-[11px]">
                Dismiss
              </button>
            </div>
          )}

          {/* Message Feed Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#0F172A] min-w-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3 ${
                  msg.isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!msg.isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 sm:p-3.5 shadow-sm border ${
                    msg.isUser
                      ? 'bg-[#5865F2] border-[#5865F2]/50 text-white rounded-br-xs'
                      : msg.isError
                      ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444] rounded-bl-xs'
                      : 'bg-[#1E293B] border-[#334155] text-[#F8FAFC] rounded-bl-xs'
                  }`}
                >
                  {!msg.isUser && (
                    <p className="text-[10px] font-bold text-[#38BDF8] mb-1">AI Assistant</p>
                  )}

                  {msg.imageUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-h-60 bg-black/20">
                      <img
                        src={msg.imageUrl}
                        alt="Attachment"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {msg.isLoading ? (
                    <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
                      <span>Thinking...</span>
                    </div>
                  ) : msg.isUser ? (
                    <p className="text-[16px] leading-[1.6] whitespace-pre-wrap break-words">
                      {renderMessageText(msg.text, true, 'default')}
                    </p>
                  ) : (
                    <AiMarkdownRenderer content={msg.text} />
                  )}

                  <p
                    className={`text-[10px] text-right mt-1.5 ${
                      msg.isUser ? 'text-white/70' : 'text-[#64748B]'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>

                {msg.isUser && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center shrink-0 mt-1">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="User"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Selected Attachment Banner */}
          {selectedFile && (
            <div className="p-3 bg-[#1E293B] border-t border-[#334155] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Attachment preview"
                    className="w-12 h-12 rounded-xl object-cover border border-[#334155] shrink-0"
                  />
                )}
                <div className="min-w-0 text-xs">
                  <p className="font-semibold text-white truncate">{selectedFile.name}</p>
                  <p className="text-[#94A3B8] text-[11px]">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB - Vision Analysis
                  </p>
                </div>
              </div>

              <button
                onClick={clearImage}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-white/10 transition shrink-0"
                title="Remove Photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Controls Bar */}
          <form
            onSubmit={handleSend}
            className="p-2.5 sm:p-3 bg-[#1E293B] border-t border-[#334155] flex items-center gap-2 shrink-0"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              className="p-2.5 rounded-2xl bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 transition disabled:opacity-40 shrink-0"
              title="Attach Photo for AI Vision Analysis"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedFile
                    ? 'Ask AI to analyze this photo...'
                    : 'Ask AI anything in Bangla or English...'
                }
                disabled={isSending}
                className="w-full bg-[#0F172A] border border-[#334155] rounded-2xl py-2.5 px-4 text-[16px] text-white placeholder-[#64748B] placeholder:text-[15px] focus:outline-none focus:border-[#38BDF8] transition disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={(!input.trim() && !selectedFile) || isSending}
              className="w-10 h-10 rounded-2xl bg-[#38BDF8] hover:bg-[#0284C7] active:scale-95 text-[#0F172A] disabled:opacity-40 flex items-center justify-center transition shrink-0 shadow-md"
              title="Send to AI"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5 font-bold" />
              )}
            </button>
          </form>
        </div>

        {/* Delete Confirmation Modal */}
        {deletingConvId && (
          <div
            onClick={() => setDeletingConvId(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative"
            >
              <h3 className="font-bold text-base text-white">Delete Conversation?</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Are you sure you want to delete this AI conversation? All message history will be permanently deleted.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeletingConvId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] transition shadow-md"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
