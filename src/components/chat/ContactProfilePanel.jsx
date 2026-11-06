import React, { useMemo, useState } from 'react';
import {
  X, User, Circle, Image as ImageIcon,
  FileText, Mic, ExternalLink, Clock, Info, Ban, ShieldCheck
} from 'lucide-react';

const formatLastSeen = (value) => {
  if (!value) return 'Last seen information unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last seen information unavailable';
  return `Last seen ${date.toLocaleString()}`;
};

export default function ContactProfilePanel({ contact, messages = [], onClose, isBlockedByMe = false, isBlockedByThem = false, onBlock, onUnblock }) {
  const [tab, setTab] = useState('overview');

  const shared = useMemo(() => ({
    photos: messages.filter(m => m.type === 'image' && m.imageUrl && !m.deleted),
    documents: messages.filter(m => m.type === 'document' && m.fileUrl && !m.deleted),
    voices: messages.filter(m => (m.type === 'voice' || m.audioUrl) && (m.audioUrl || m.audio) && !m.deleted)
  }), [messages]);

  if (!contact) return null;

  const name = contact.displayName || 'User';
  const photo = contact.profileImageUrl || contact.photoURL;
  const isOnline = contact.status === 'Online';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'photos', label: 'Photos', icon: ImageIcon, count: shared.photos.length },
    { id: 'documents', label: 'Files', icon: FileText, count: shared.documents.length },
    { id: 'voices', label: 'Voice', icon: Mic, count: shared.voices.length }
  ];

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-[420px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-[60px] px-5 bg-[#4752C4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white font-bold">
            <User className="w-5 h-5" />
            Contact Profile
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white hover:bg-white/15"
            title="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-[#E2E8F0]">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-[#EEF2FF] border-4 border-[#E0E7FF] flex items-center justify-center shadow-md">
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-[#5865F2]">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <h2 className="mt-4 text-xl font-bold text-[#0F172A] break-words">
              {name}
            </h2>

            <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${isOnline ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
              <Circle className={`w-2.5 h-2.5 ${isOnline ? 'fill-[#22C55E] text-[#22C55E]' : 'fill-[#94A3B8] text-[#94A3B8]'}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="p-5 border-b border-[#E2E8F0] space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                About
              </p>
              <p className="text-sm text-[#334155]">
                {contact.about || contact.bio || 'No status message available.'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
                Availability
              </p>
              <p className="text-sm text-[#334155]">
                {isOnline ? 'Currently active' : formatLastSeen(contact.lastSeen)}
              </p>
            </div>

            <div className="pt-1">
              {isBlockedByMe ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Unblock ${name}? You will be able to send messages again.`)) {
                      await onUnblock?.();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#16A34A] bg-[#F0FDF4] px-4 py-3 text-sm font-bold text-[#15803D] hover:bg-[#DCFCE7] transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Unblock Contact
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Block ${name}? You will no longer be able to send messages to this contact.`)) {
                      await onBlock?.();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-bold text-[#B91C1C] hover:bg-[#FEE2E2] transition"
                >
                  <Ban className="w-4 h-4" />
                  Block Contact
                </button>
              )}
            </div>
            {isBlockedByThem && (
              <div className="mt-2 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                This contact has blocked you. You cannot send messages or files to this contact.
              </div>
            )}
            <div className="flex items-start gap-2 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>This contact profile is view-only. Only the account owner can manage their own profile.</span>
            </div>
          </div>

          <div className="flex border-b border-[#E2E8F0] overflow-x-auto">
            {tabs.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex-1 min-w-0 py-3 px-2 text-xs font-semibold flex flex-col items-center gap-1 border-b-2 transition ${
                    tab === item.id
                      ? 'border-[#5865F2] text-[#5865F2]'
                      : 'border-transparent text-[#64748B] hover:text-[#334155]'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.count !== undefined && (
                    <span className="text-[10px]">{item.count} items</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {tab === 'overview' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#0F172A]">Shared Content</h3>
                {[
                  { label: 'Photos', count: shared.photos.length, id: 'photos', icon: ImageIcon },
                  { label: 'Documents', count: shared.documents.length, id: 'documents', icon: FileText },
                  { label: 'Voice Messages', count: shared.voices.length, id: 'voices', icon: Mic }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#5865F2] flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="flex-1 text-sm font-semibold text-[#334155]">{item.label}</span>
                      <span className="text-xs text-[#64748B]">{item.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === 'photos' && (
              shared.photos.length ? (
                <div className="grid grid-cols-3 gap-2">
                  {shared.photos.map((item, index) => (
                    <a key={item.messageId || index} href={item.imageUrl} target="_blank" rel="noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0]">
                      <img src={item.imageUrl} alt="Shared photo" className="w-full h-full object-cover hover:scale-105 transition" />
                    </a>
                  ))}
                </div>
              ) : <EmptyContent text="No shared photos yet." />
            )}

            {tab === 'documents' && (
              shared.documents.length ? (
                <div className="space-y-2">
                  {shared.documents.map((item, index) => (
                    <a key={item.messageId || index} href={item.fileUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] text-[#5865F2] flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#334155] truncate">{item.fileName || 'Document'}</p>
                        <p className="text-[11px] text-[#64748B]">{item.fileSize ? `${(item.fileSize / 1048576).toFixed(2)} MB` : 'Shared document'}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#64748B]" />
                    </a>
                  ))}
                </div>
              ) : <EmptyContent text="No shared documents yet." />
            )}

            {tab === 'voices' && (
              shared.voices.length ? (
                <div className="space-y-3">
                  {shared.voices.map((item, index) => (
                    <div key={item.messageId || index} className="p-3 rounded-xl border border-[#E2E8F0]">
                      <div className="flex items-center gap-2 mb-2 text-xs text-[#64748B]">
                        <Mic className="w-4 h-4" />
                        Voice message
                        <span className="ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration || 0}s
                        </span>
                      </div>
                      <audio controls preload="none" src={item.audioUrl || item.audio} className="w-full h-9" />
                    </div>
                  ))}
                </div>
              ) : <EmptyContent text="No shared voice messages yet." />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function EmptyContent({ text }) {
  return (
    <div className="py-12 flex flex-col items-center text-center text-[#94A3B8]">
      <Info className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

