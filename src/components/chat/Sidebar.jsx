import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import ChatList from './ChatList';
import AdminPanel from '../admin/AdminPanel';
import AiAssistantModal from '../ai/AiAssistantModal';
import AccountPanel from './AccountPanel';
import { MessageSquare, Users, Search, LogOut, User as UserIcon, Shield, Sparkles, X } from 'lucide-react';

export default function Sidebar({ onCloseMobile }) {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

  return (
    <>
      <div className="w-full h-full bg-[#1E293B] border-r border-[#334155] flex flex-col shrink-0">
        {/* User Header matching Android Toolbar #4752C4 */}
        <div className="h-[60px] px-4 bg-[#4752C4] border-b border-[#334155] flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 overflow-hidden cursor-pointer" onClick={() => setIsAccountPanelOpen(true)} title="Edit Profile">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white flex items-center justify-center text-white shrink-0 font-bold overflow-hidden shadow-sm">
              {userProfile?.profileImageUrl || currentUser?.photoURL ? (
                <img src={userProfile?.profileImageUrl || currentUser?.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                currentUser?.displayName?.charAt(0)?.toUpperCase() || <UserIcon className="w-5 h-5" />
              )}
            </div>
            <div className="truncate">
              <h2 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                {userProfile?.displayName || currentUser?.displayName || 'User'}
              </h2>
              <p className="text-[11px] sm:text-[12px] text-white/80 truncate">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsAiAssistantOpen(true)}
              className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition flex items-center gap-1 text-xs font-bold bg-white/10 shadow-xs"
              title="Open AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-[#38BDF8] animate-pulse" />
              <span className="hidden sm:inline">AI</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/15 transition flex items-center gap-1 text-xs font-bold bg-white/10 shadow-xs"
                title="Open Admin Panel"
              >
                <Shield className="w-4 h-4 text-[#38BDF8]" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
                title="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#334155] bg-[#0F172A]/40">
          <div className="relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tab === 'chats' ? 'Search conversations...' : 'Search users by name or email...'}
              className="w-full bg-[#0F172A] border border-[#334155] rounded-full py-2 pl-9 pr-3 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#5865F2] transition"
            />
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#334155] p-1.5 bg-[#0F172A]/30">
          <button
            onClick={() => setTab('chats')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              tab === 'chats'
                ? 'bg-[#5865F2] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setTab('contacts')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              tab === 'contacts'
                ? 'bg-[#5865F2] text-white shadow-md'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contacts</span>
          </button>
        </div>

        {/* Chat / Contact List */}
        <div className="flex-1 overflow-y-auto" onClick={() => { if (onCloseMobile) onCloseMobile(); }}>
          <ChatList activeTab={tab} searchQuery={searchQuery} />
        </div>
      </div>

      {/* Account Panel Modal Overlay */}
      {isAccountPanelOpen && (
        <AccountPanel onClose={() => setIsAccountPanelOpen(false)} />
      )}

      {/* AI Assistant Modal Overlay */}
      {isAiAssistantOpen && (
        <AiAssistantModal onClose={() => setIsAiAssistantOpen(false)} />
      )}

      {/* Admin Panel Modal Overlay */}
      {isAdminPanelOpen && (
        <AdminPanel onClose={() => setIsAdminPanelOpen(false)} />
      )}
    </>
  );
}



