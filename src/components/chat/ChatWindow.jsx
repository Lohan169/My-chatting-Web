import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import ContactProfilePanel from './ContactProfilePanel';
import { MessageSquare, Shield, Loader2, AlertTriangle, ArrowLeft, Menu, Bot, Sparkles } from 'lucide-react';

export default function ChatWindow({ onOpenMobileSidebar }) {
  const {
    activeContact,
    messages,
    loadingMessages,
    permissionError,
    selectContact,
    aiSettings,
    toggleAiAutoReply,
    isActiveContactBlocked,
    blockActiveContact,
    unblockActiveContact
  } = useChat();

  const [isContactProfileOpen, setIsContactProfileOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
      const timeoutId = setTimeout(() => scrollToBottom(true), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, activeContact?.uid, loadingMessages]);

  if (permissionError) {
    return (
      <div className="flex-1 bg-[#FFFFFF] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-2">Firestore Read Restricted</h2>
        <p className="text-xs text-[#64748B] max-w-md leading-relaxed mb-4">
          {permissionError}
        </p>
        <span className="text-[11px] text-[#64748B] bg-[#F1F5F9] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
          Note: Firestore Security Rules strictly enforce read limits.
        </span>
      </div>
    );
  }

  if (!activeContact) {
    return (
      <div className="flex-1 bg-[#FFFFFF] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] flex items-center justify-center mb-4 shadow-xl">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">Chatting Web</h2>
        <p className="text-xs text-[#64748B] max-w-sm leading-relaxed mb-6">
          Select a contact or active conversation from the sidebar to view and send messages.
        </p>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-xs font-semibold text-[#22C55E]">
          <Shield className="w-4 h-4" />
          <span>Real-Time Encrypted Session</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#FFFFFF] flex flex-col h-full overflow-hidden w-full min-w-0">
      {/* Chat Header matching Android chatHeader #4752C4 */}
      <div className="h-[60px] px-3 sm:px-4 bg-[#4752C4] border-b border-[#334155] flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => selectContact(null)}
            className="md:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 shrink-0"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 shrink-0"
              title="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsContactProfileOpen(true)}
            className="flex items-center gap-2 sm:gap-3 min-w-0 text-left rounded-xl hover:bg-white/10 p-1.5 -ml-1.5 transition cursor-pointer"
            title="View contact profile"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 border border-white flex items-center justify-center text-white font-bold overflow-hidden relative shadow-sm shrink-0">
              {activeContact.profileImageUrl || activeContact.photoURL ? (
                <img src={activeContact.profileImageUrl || activeContact.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                activeContact.displayName?.charAt(0)?.toUpperCase() || 'U'
              )}
              {activeContact.status === 'Online' && (
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#22C55E] border-2 border-[#1E293B] absolute bottom-0 right-0 shadow-sm"></span>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs">
                {activeContact.displayName || 'User'}
              </h2>
              <p className="text-[11px] sm:text-[12px] text-white/80 truncate">{activeContact.status || 'Offline'}</p>
            </div>
          </button>
        </div>

        {/* Right Side: AI Auto-Reply Toggle & Clear Status Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {aiSettings?.enabled && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-semibold">
              <Bot className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>
                {aiSettings?.state === 'PROCESSING'
                  ? 'AI Generating...'
                  : aiSettings?.state === 'RESPONDED'
                  ? 'AI Responded'
                  : 'AI Active'}
              </span>
              {aiSettings?.state === 'PROCESSING' && (
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-ping ml-0.5"></span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => toggleAiAutoReply(!aiSettings?.enabled)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1 transition shadow-xs shrink-0 ${
              aiSettings?.enabled
                ? 'bg-[#38BDF8] border-[#38BDF8] text-[#0F172A] hover:bg-[#0284C7] hover:text-white'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
            title={aiSettings?.enabled ? 'Disable AI Auto-Reply for this chat' : 'Enable AI Auto-Reply for this chat'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI {aiSettings?.enabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {isContactProfileOpen && (
        <ContactProfilePanel
          contact={activeContact}
          messages={messages}
          isBlocked={isActiveContactBlocked}
          onBlock={blockActiveContact}
          onUnblock={unblockActiveContact}
          onClose={() => setIsContactProfileOpen(false)}
        />
      )}

      {/* Messages Feed on Pure White #FFFFFF */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2 bg-[#FFFFFF] min-w-0"
      >
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full text-[#64748B]">
            <Loader2 className="w-6 h-6 animate-spin text-[#5865F2]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#64748B] text-xs">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-[#5865F2]" />
            <p className="font-semibold text-[#0F172A]">No messages in this chat yet</p>
            <p className="mt-1 text-[11px] text-[#64748B]">Type a message below to start the conversation.</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageItem key={msg.messageId} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input Bar */}
      <MessageInput />
    </div>
  );
}



