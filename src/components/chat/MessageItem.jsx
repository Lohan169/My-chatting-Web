import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { formatTime } from '../../utils/timeUtil';
import ForwardModal from './ForwardModal';
import {
  Check,
  CheckCheck,
  EyeOff,
  Bot,
  CornerDownRight,
  Reply,
  X,
  Mic,
  Play,
  Pause,
  Share2,
  Trash2,
  MoreVertical,
  Download,
  Smile
} from 'lucide-react';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

function VoicePlayer({ audioUrl, duration, isSentByMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const formatSecs = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatVoiceDuration = (ms) => {
    if (!ms) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`my-1 flex items-center gap-3 p-2.5 rounded-xl border w-full min-w-[210px] ${
      isSentByMe ? 'bg-[#0F172A]/20 border-white/10' : 'bg-[#E2E8F0] border-[#CBD5E1]'
    }`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white flex items-center justify-center shrink-0 shadow-md transition"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-1 h-3.5">
          <Mic className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
          <span className={`text-[11px] font-semibold ${isSentByMe ? 'text-white' : 'text-[#0F172A]'}`}>
            Voice Message
          </span>
        </div>
        <div className={`text-[10px] font-mono mt-0.5 ${isSentByMe ? 'text-white/80' : 'text-[#64748B]'}`}>
          {isPlaying
            ? `${formatSecs(currentTime)} / ${formatSecs((duration || 0) / 1000)}`
            : formatVoiceDuration(duration)}
        </div>
      </div>
    </div>
  );
}

export default function MessageItem({ message }) {
  const { currentUser } = useAuth();
  const {
    setReplyMessage,
    reactToMessage,
    deleteForMe,
    deleteForEveryone
  } = useChat();

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);

  const isSentByMe = message.senderId === currentUser?.uid;

  if (message.deleted) {
    return (
      <div className={`flex my-1.5 ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
        <div className="px-3 py-1.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] text-xs italic flex items-center gap-1.5 shadow-xs">
          <EyeOff className="w-3.5 h-3.5 text-[#64748B]" />
          <span>{message.text || 'This message was deleted'}</span>
        </div>
      </div>
    );
  }

  const handleDownloadImage = async (url) => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `IMG_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.warn('Direct image download fallback triggered:', err);
      window.open(url, '_blank');
    }
  };

  const renderStatusTicks = () => {
    if (!isSentByMe) return null;
    if (message.status === 2) {
      return <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" title="Seen" />;
    }
    if (message.status === 1) {
      return <CheckCheck className="w-3.5 h-3.5 text-white/80" title="Delivered" />;
    }
    return <Check className="w-3.5 h-3.5 text-white/80" title="Sent" />;
  };

  const handleReactionClick = async (emoji) => {
    setShowReactionsPicker(false);
    setShowMenu(false);
    await reactToMessage(message.messageId, emoji);
  };

  const handleDeleteMeClick = async () => {
    setShowMenu(false);
    await deleteForMe(message.messageId);
  };

  const handleDeleteEveryoneClick = async () => {
    setShowMenu(false);
    await deleteForEveryone(message);
  };

  return (
    <>
      <div className={`group flex flex-col my-1.5 ${isSentByMe ? 'items-end' : 'items-start'}`}>
        <div className="relative flex items-center gap-2 max-w-[80%] sm:max-w-[65%]">
          {/* Action Menu Trigger / Quick Options for Sent Messages */}
          {isSentByMe && (
            <div className="relative opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
              <button
                onClick={() => setShowReactionsPicker(!showReactionsPicker)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReplyMessage(message)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsForwardModalOpen(true)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="Forward"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Reaction Picker Popover */}
              {showReactionsPicker && (
                <div className="absolute bottom-full mb-1 right-0 z-30 bg-white border border-[#E2E8F0] rounded-2xl p-1.5 shadow-xl flex items-center gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className="p-1 hover:bg-[#F1F5F9] rounded-lg text-base transition transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute bottom-full mb-1 right-0 z-30 bg-white border border-[#E2E8F0] rounded-xl py-1 shadow-xl min-w-[140px] text-xs">
                  <button
                    onClick={handleDeleteMeClick}
                    className="w-full text-left px-3 py-1.5 text-[#0F172A] hover:bg-[#F1F5F9] flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Delete for me</span>
                  </button>
                  {isSentByMe && (
                    <button
                      onClick={handleDeleteEveryoneClick}
                      className="w-full text-left px-3 py-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />
                      <span>Delete for everyone</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chat Bubble: Sent #5865F2 vs Received #F1F5F9 */}
          <div
            className={`w-full rounded-2xl p-3 shadow-sm border ${
              isSentByMe
                ? 'bg-[#5865F2] border-[#5865F2]/50 text-white rounded-br-xs'
                : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A] rounded-bl-xs'
            }`}
          >
            {/* Forwarded Badge */}
            {message.isForwarded && (
              <div className={`text-[10px] italic font-medium flex items-center gap-1 mb-1 ${
                isSentByMe ? 'text-white/80' : 'text-[#64748B]'
              }`}>
                <Share2 className="w-3 h-3" />
                <span>Forwarded</span>
              </div>
            )}

            {/* Reply Quoted Preview */}
            {message.replyMessageId && (
              <div className={`mb-2 p-2 rounded-lg border-l-2 border-[#06B6D4] text-xs ${
                isSentByMe ? 'bg-[#0F172A]/20' : 'bg-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#06B6D4]">
                  <CornerDownRight className="w-3 h-3" />
                  <span>{message.replySenderName || 'Replying'}</span>
                </div>
                <p className={`text-[11px] truncate mt-0.5 ${isSentByMe ? 'text-white/80' : 'text-[#64748B]'}`}>
                  {message.replyMessage}
                </p>
              </div>
            )}

            {/* AI Tag */}
            {message.isAi && (
              <div className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] font-semibold mb-1.5 border border-[#8B5CF6]/30">
                <Bot className="w-3 h-3" />
                <span>AI Assistant</span>
              </div>
            )}

            {/* Image Attachment */}
            {message.type === 'image' && message.imageUrl && (
              <div className="mb-2 rounded-xl overflow-hidden border border-black/10 bg-black/5 relative cursor-pointer">
                {!imageLoaded && (
                  <div className="w-full h-48 bg-[#E2E8F0] animate-pulse flex items-center justify-center text-xs text-[#64748B]">
                    Loading photo...
                  </div>
                )}
                <img
                  src={message.imageUrl}
                  alt="Attachment"
                  onLoad={() => setImageLoaded(true)}
                  onClick={() => setIsLightboxOpen(true)}
                  className={`max-h-72 w-full object-cover transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                  }`}
                />
              </div>
            )}

            {/* Voice Attachment */}
            {(message.type?.toLowerCase() === 'voice' || message.audioUrl) && (
              <VoicePlayer
                audioUrl={message.audioUrl || message.audio}
                duration={message.duration}
                isSentByMe={isSentByMe}
              />
            )}

            {/* Message Text Body */}
            {message.text && message.text !== 'Photo' && message.text !== 'Forwarded Photo' && (
              <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                isSentByMe ? 'text-white' : 'text-[#0F172A]'
              }`}>{message.text}</p>
            )}

            {/* Message Footer: Timestamp, Edited badge, and Ticks */}
            <div className={`flex items-center justify-end gap-1.5 mt-1 text-[11px] ${
              isSentByMe ? 'text-white/80' : 'text-[#64748B]'
            }`}>
              {message.edited && <span>(edited)</span>}
              <span>{formatTime(message.timestamp)}</span>
              {renderStatusTicks()}
            </div>

            {/* Emoji Reactions Badges */}
            {message.reactions && Object.keys(message.reactions).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-black/10">
                {Object.entries(message.reactions).map(([uid, emoji]) => (
                  <span
                    key={uid}
                    onClick={() => handleReactionClick(emoji)}
                    className={`text-xs px-1.5 py-0.5 rounded-md shadow-2xs cursor-pointer border transition ${
                      uid === currentUser?.uid
                        ? 'bg-[#5865F2]/20 border-[#5865F2] font-bold'
                        : 'bg-white/60 border-transparent'
                    }`}
                    title={uid === currentUser?.uid ? 'Your reaction' : 'Reaction'}
                  >
                    {emoji}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Menu Trigger / Quick Options for Received Messages */}
          {!isSentByMe && (
            <div className="relative opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
              <button
                onClick={() => setShowReactionsPicker(!showReactionsPicker)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setReplyMessage(message)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsForwardModalOpen(true)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="Forward"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#5865F2] transition shadow-xs"
                title="More actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Reaction Picker Popover */}
              {showReactionsPicker && (
                <div className="absolute bottom-full mb-1 left-0 z-30 bg-white border border-[#E2E8F0] rounded-2xl p-1.5 shadow-xl flex items-center gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReactionClick(emoji)}
                      className="p-1 hover:bg-[#F1F5F9] rounded-lg text-base transition transform hover:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute bottom-full mb-1 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl py-1 shadow-xl min-w-[140px] text-xs">
                  <button
                    onClick={handleDeleteMeClick}
                    className="w-full text-left px-3 py-1.5 text-[#0F172A] hover:bg-[#F1F5F9] flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Delete for me</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Forward Modal */}
      {isForwardModalOpen && (
        <ForwardModal
          messageToForward={message}
          onClose={() => setIsForwardModalOpen(false)}
        />
      )}

      {/* Full Screen Image Lightbox Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(message.imageUrl);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <img
            src={message.imageUrl}
            alt="Full Preview"
            className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
