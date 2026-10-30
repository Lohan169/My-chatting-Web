import React from 'react';
import { CornerDownRight, X } from 'lucide-react';

export default function ReplyPreview({ replyMessage, onCancel }) {
  if (!replyMessage) return null;

  return (
    <div className="px-4 py-2 bg-[#1E293B] border-t border-[#334155] flex items-center justify-between">
      <div className="flex items-center gap-2 overflow-hidden border-l-2 border-[#06B6D4] pl-2">
        <CornerDownRight className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
        <div className="truncate text-xs">
          <span className="font-semibold text-[#06B6D4]">{replyMessage.senderName}</span>
          <p className="text-[#94A3B8] truncate text-[11px]">{replyMessage.text || 'Message'}</p>
        </div>
      </div>
      <button
        onClick={onCancel}
        className="p-1 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#0F172A] transition"
        title="Cancel Reply"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
