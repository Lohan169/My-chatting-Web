import React, { useState, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import ReplyPreview from './ReplyPreview';
import VoiceRecorder from './VoiceRecorder';
import {
  Loader2,
  Image as ImageIcon,
  Mic,
  X,
  ArrowRight,
  Plus,
  Paperclip
} from 'lucide-react';

const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'ps1', 'msi', 'jar', 'vbs', 'scr', 'pif', 'cpl', 'gadget', 'app', 'dmg'];

export default function MessageInput() {
  const { sendMessage, sendImage, sendVoice, sendDocument, activeReplyMessage, cancelReply, isActiveContactBlocked } = useChat();
  const [text, setText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const xhrRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let errorText = '';
    const newItems = [];

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        errorText = 'Some files were skipped: invalid image type.';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        errorText = 'Some files were skipped: image size exceeds 10MB limit.';
        return;
      }
      const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const previewUrl = URL.createObjectURL(file);
      newItems.push({ id, file, previewUrl, progress: 0 });
    });

    if (errorText) setError(errorText);
    else setError('');

    if (newItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDocFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let errorText = '';
    const newItems = [];

    files.forEach((file) => {
      const ext = (file.name || '').split('.').pop().toLowerCase();

      if (BLOCKED_EXTENSIONS.includes(ext)) {
        errorText = `Executable file "${file.name}" is blocked for security reasons.`;
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        errorText = `Document "${file.name}" exceeds 25MB limit.`;
        return;
      }

      const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
      newItems.push({ id, file, name: file.name, size: file.size, ext, progress: 0 });
    });

    if (errorText) setError(errorText);
    else setError('');

    if (newItems.length > 0) {
      setSelectedDocs((prev) => [...prev, ...newItems]);
    }

    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
  };

  const removeFile = (id) => {
    setSelectedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const removeDoc = (id) => {
    setSelectedDocs((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllFiles = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    selectedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setSelectedFiles([]);
    setSelectedDocs([]);
    setIsSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');

    if (isActiveContactBlocked) {
      setError('Messaging is unavailable because one of you has blocked the other.');
      return;
    }

    // Send Photo Attachments
    if (selectedFiles.length > 0) {
      setIsSending(true);
      const itemsToSend = [...selectedFiles];
      const remainingItems = [];
      let lastErr = '';

      for (const item of itemsToSend) {
        try {
          await sendImage(
            item.file,
            (progress) => {
              setSelectedFiles((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, progress } : i))
              );
            },
            (xhr) => { xhrRef.current = xhr; }
          );
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        } catch (err) {
          console.error('Failed to send image item:', err);
          if (err.message !== 'Upload cancelled by user') {
            lastErr = err.message || 'Failed to send image';
            remainingItems.push({ ...item, progress: 0 });
          }
        }
      }

      setSelectedFiles(remainingItems);
      setIsSending(false);
      if (lastErr) setError(lastErr);
      return;
    }

    // Send Document Attachments
    if (selectedDocs.length > 0) {
      setIsSending(true);
      const docsToSend = [...selectedDocs];
      const remainingDocs = [];
      let lastErr = '';

      for (const docItem of docsToSend) {
        try {
          await sendDocument(
            docItem.file,
            docItem.name,
            docItem.size,
            docItem.ext,
            (progress) => {
              setSelectedDocs((prev) =>
                prev.map((d) => (d.id === docItem.id ? { ...d, progress } : d))
              );
            },
            (xhr) => { xhrRef.current = xhr; }
          );
        } catch (err) {
          console.error('Failed to send document:', err);
          if (err.message !== 'Upload cancelled by user') {
            lastErr = err.message || 'Failed to send document';
            remainingDocs.push({ ...docItem, progress: 0 });
          }
        }
      }

      setSelectedDocs(remainingDocs);
      setIsSending(false);
      if (lastErr) setError(lastErr);
      return;
    }

    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    try {
      setIsSending(true);
      await sendMessage(trimmed);
      setText('');
    } catch (err) {
      console.error('Failed to send text message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoice = async (audioBlob, duration, onProgress, onXhrCreated) => {
    try {
      if (isActiveContactBlocked) {
        setError('Voice messaging is unavailable because one of you has blocked the other.');
        return;
      }
      setError('');
      await sendVoice(audioBlob, duration, onProgress, onXhrCreated);
      setIsRecordingVoice(false);
    } catch (err) {
      console.error('Failed to send voice message:', err);
      if (err.message !== 'Upload cancelled by user') {
        setError(err.message || 'Failed to send voice message');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="shrink-0 bg-[#F8FAFC] border-t border-[#E2E8F0]">
      {/* Quoted Reply Preview */}
      <ReplyPreview replyMessage={activeReplyMessage} onCancel={cancelReply} />

      {/* Voice Recorder Overlay Mode */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoice={handleSendVoice}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <>
          {/* Multi-Photo Preview Gallery */}
          {selectedFiles.length > 0 && (
            <div className="p-3 bg-white border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#5B5CF0]" />
                  <span>Selected Photos ({selectedFiles.length})</span>
                </span>
                <button
                  type="button"
                  onClick={clearAllFiles}
                  className="text-[11px] font-semibold text-[#EF4444] hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {selectedFiles.map((item) => (
                  <div
                    key={item.id}
                    className="relative group shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#E2E8F0] bg-black/5"
                  >
                    <img
                      src={item.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    {isSending && item.progress > 0 && item.progress < 100 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">{item.progress}%</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      disabled={isSending}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-[#EF4444] transition"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Add More Photos Card */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSending || isActiveContactBlocked}
                  className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#5B5CF0] bg-[#F1F5F9] hover:bg-white flex flex-col items-center justify-center text-[#64748B] hover:text-[#5B5CF0] transition"
                  title="Add More Photos"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-semibold mt-0.5">Add More</span>
                </button>
              </div>
            </div>
          )}

          {/* Document Preview Gallery */}
          {selectedDocs.length > 0 && (
            <div className="p-3 bg-white border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#5B5CF0]" />
                  <span>Selected Documents ({selectedDocs.length})</span>
                </span>
                <button
                  type="button"
                  onClick={clearAllFiles}
                  className="text-[11px] font-semibold text-[#EF4444] hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {selectedDocs.map((docItem) => (
                  <div
                    key={docItem.id}
                    className="relative shrink-0 p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center gap-2.5 min-w-[200px] max-w-[260px]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#5865F2]/10 text-[#5865F2] font-bold text-xs uppercase flex items-center justify-center shrink-0">
                      {docItem.ext}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0F172A] truncate" title={docItem.name}>
                        {docItem.name}
                      </p>
                      <p className="text-[10px] text-[#64748B]">
                        {(docItem.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      {isSending && docItem.progress > 0 && docItem.progress < 100 && (
                        <div className="w-full bg-[#E2E8F0] rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-[#5B5CF0] h-full transition-all duration-150"
                            style={{ width: `${docItem.progress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDoc(docItem.id)}
                      disabled={isSending}
                      className="p-1 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#E2E8F0] transition shrink-0"
                      title="Remove Document"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add More Documents Button */}
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={isSending || isActiveContactBlocked}
                  className="shrink-0 p-2.5 rounded-xl border-2 border-dashed border-[#CBD5E1] hover:border-[#5B5CF0] bg-[#F1F5F9] hover:bg-white flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#5B5CF0] font-semibold transition"
                  title="Add More Documents"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add More</span>
                </button>
              </div>
            </div>
          )}

          {isActiveContactBlocked && (
            <div className="px-4 py-2 bg-[#FEF2F2] text-[#B91C1C] text-xs border-b border-[#FECACA]">
              Messaging and file sharing are unavailable because one of you has blocked the other.
            </div>
          )}
          {/* Error Banner */}
          {error && (
            <div className="px-4 py-1.5 bg-[#EF4444]/10 text-[#EF4444] text-[11px] border-b border-[#EF4444]/20 flex items-center justify-between">
              <span>Error: {error}</span>
              <button onClick={() => setError('')} className="underline font-medium ml-2">Dismiss</button>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-2 sm:p-2.5 bg-[#F8FAFC] flex items-center gap-2 sm:gap-2.5">
            {/* Hidden Image File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              disabled={isActiveContactBlocked}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Hidden Document File Input */}
            <input
              type="file"
              ref={docInputRef}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar,.7z,.json,.xml,.pages,.numbers,.key,.rtf,.odt,.ods,.odp"
              disabled={isActiveContactBlocked}
              multiple
              onChange={handleDocFileChange}
              className="hidden"
            />

            {/* Photo Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || isActiveContactBlocked}
              className="p-2 sm:p-2.5 rounded-full text-[#64748B] hover:text-[#5B5CF0] hover:bg-white transition disabled:opacity-40 shrink-0"
              title="Attach Photo"
            >
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Document/Paperclip Button */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              disabled={isSending || isActiveContactBlocked}
              className="p-2 sm:p-2.5 rounded-full text-[#64748B] hover:text-[#5B5CF0] hover:bg-white transition disabled:opacity-40 shrink-0"
              title="Attach Document or File"
            >
              <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* White Rounded Pill-Shaped Message Input */}
            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedFiles.length > 0
                    ? `Selected ${selectedFiles.length} photo(s)...`
                    : selectedDocs.length > 0
                    ? `Selected ${selectedDocs.length} document(s)...`
                    : "Type a message..."
                }
                disabled={isSending || isActiveContactBlocked || selectedFiles.length > 0 || selectedDocs.length > 0}
                className="w-full bg-white border border-[#E2E8F0] rounded-full py-2.5 px-4 text-[15px] text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#5B5CF0] focus:ring-2 focus:ring-[#5B5CF0]/20 transition shadow-xs disabled:opacity-50"
              />
            </div>

            {/* Mic Button */}
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              disabled={isSending || isActiveContactBlocked || selectedFiles.length > 0 || selectedDocs.length > 0}
              className="p-2 sm:p-2.5 rounded-full bg-[#4752C4] hover:bg-[#3B44A1] text-white transition disabled:opacity-40 shadow-md shrink-0"
              title="Record Voice Message"
            >
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Inline Send Button */}
            <button
              type="submit"
              disabled={isActiveContactBlocked || (!text.trim() && selectedFiles.length === 0 && selectedDocs.length === 0) || isSending}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#5B5CF0] hover:bg-[#4A4BCF] active:scale-95 hover:scale-105 hover:shadow-lg hover:shadow-[#5B5CF0]/30 text-white disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100 transition-all duration-200 ease-out shadow-md shadow-[#5B5CF0]/25 flex items-center justify-center shrink-0"
              title="Send Message"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <ArrowRight className="w-5 h-5 text-white" />
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
