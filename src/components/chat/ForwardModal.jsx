import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { X, Search, Check, Loader2, Share2, AlertCircle } from 'lucide-react';

export default function ForwardModal({ messageToForward, onClose }) {
  const { contacts, forwardMessageToContacts } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUids, setSelectedUids] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!messageToForward) return null;

  const filteredContacts = contacts.filter((contact) => {
    const name = contact.displayName || '';
    const email = contact.email || '';
    const term = searchTerm.toLowerCase();
    return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
  });

  const toggleSelect = (uid) => {
    if (selectedUids.includes(uid)) {
      setSelectedUids(selectedUids.filter((id) => id !== uid));
    } else {
      setSelectedUids([...selectedUids, uid]);
    }
  };

  const handleForward = async () => {
    if (selectedUids.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const targetContacts = contacts.filter((c) => selectedUids.includes(c.uid));

    try {
      const results = await forwardMessageToContacts(messageToForward, targetContacts);

      const failures = results.filter(
        (r) => !r.messageWriteSuccess || !r.chatSummarySuccess
      );

      if (failures.length === 0) {
        onClose();
      } else {
        const failedNames = failures
          .map((f) => f.contact.displayName || f.contact.email || 'Contact')
          .join(', ');
        setErrorMsg(`Failed to forward to: ${failedNames}. Please check permissions and try again.`);
      }
    } catch (err) {
      setErrorMsg(`Forward error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPreviewText = () => {
    if (messageToForward.type === 'image') return '📷 Photo';
    if (messageToForward.type === 'voice') return '🎤 Voice Message';
    return messageToForward.text || 'Message';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[#E2E8F0] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-[#4752C4] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            <h3 className="font-bold text-base">Forward Message</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Content Preview */}
        <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2">
          <span className="font-semibold text-[#0F172A] shrink-0">Content:</span>
          <p className="truncate italic text-[#334155]">{getPreviewText()}</p>
        </div>

        {/* Search Contacts */}
        <div className="p-3 border-b border-[#E2E8F0] relative">
          <Search className="w-4 h-4 text-[#64748B] absolute left-6 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-[#EF4444]/10 border-b border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredContacts.length === 0 ? (
            <p className="text-center text-xs text-[#64748B] py-8">No contacts found</p>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedUids.includes(contact.uid);
              return (
                <div
                  key={contact.uid}
                  onClick={() => toggleSelect(contact.uid)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-[#5865F2]/10 border border-[#5865F2]/30'
                      : 'hover:bg-[#F1F5F9] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#5865F2] text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
                      {contact.profileImageUrl ? (
                        <img
                          src={contact.profileImageUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        contact.displayName?.charAt(0)?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0F172A] truncate">
                        {contact.displayName || 'Contact'}
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate">
                        {contact.status || 'Offline'}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-[#5865F2] border-[#5865F2] text-white'
                        : 'border-[#CBD5E1] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-3 border-t border-[#E2E8F0] bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={selectedUids.length === 0 || isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#5865F2] text-white hover:bg-[#4752C4] disabled:opacity-50 flex items-center gap-1.5 transition shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Forwarding...</span>
              </>
            ) : (
              <span>Forward {selectedUids.length > 0 ? `(${selectedUids.length})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
