import React from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { formatChatTime } from '../../utils/timeUtil';
import {
  MessageSquare, Users, Loader2, User as UserIcon,
  UserPlus, UserMinus, EyeOff
} from 'lucide-react';

export default function ChatList({ activeTab, searchQuery }) {
  const { currentUser } = useAuth();

  const {
    contacts,
    registeredUsers,
    chats,
    activeContact,
    selectContact,
    selectChat,
    addContactToList,
    removeContactFromList,
    hideConversation,
    loadingContacts,
    loadingChats
  } = useChat();

  const query = (searchQuery || '').toLowerCase().trim();

  if (activeTab === 'chats') {
    if (loadingChats) {
      return (
        <div className="flex items-center justify-center p-8 text-[#94A3B8]">
          <Loader2 className="w-5 h-5 animate-spin text-[#5865F2]" />
        </div>
      );
    }

    const filteredChats = chats.filter((chat) => {
      const otherUserId = chat.user1Id === currentUser?.uid
        ? chat.user2Id
        : chat.user1Id;

      const otherUser = registeredUsers.find((u) => u.uid === otherUserId);
      const name = otherUser?.displayName || chat.otherUserName || 'User';

      return name.toLowerCase().includes(query) ||
        (chat.lastMessage || '').toLowerCase().includes(query);
    });

    if (filteredChats.length === 0) {
      return (
        <div className="p-8 text-center text-[#94A3B8] text-xs">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#5865F2]" />
          <p className="font-semibold text-[#F8FAFC]">No active conversations found</p>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Switch to Contacts tab to start a conversation.
          </p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-[#334155]/40">
        {filteredChats.map((chat) => {
          const otherUserId = chat.user1Id === currentUser?.uid
            ? chat.user2Id
            : chat.user1Id;

          const otherUser = registeredUsers.find((u) => u.uid === otherUserId) || {
            uid: otherUserId,
            displayName: chat.otherUserName || 'User',
            profileImageUrl: chat.otherUserProfileImage
          };

          const isSelected = activeContact?.uid === otherUser.uid;

          return (
            <div
              key={chat.chatId}
              onClick={() => selectChat(chat, otherUser)}
              className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
                isSelected
                  ? 'bg-[#5865F2]/20 border-l-4 border-[#5865F2]'
                  : 'hover:bg-[#0F172A]/40'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-[#0F172A] border border-white flex items-center justify-center text-[#5865F2] shrink-0 font-bold overflow-hidden relative shadow-sm">
                {otherUser.profileImageUrl ? (
                  <img src={otherUser.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  otherUser.displayName?.charAt(0)?.toUpperCase() || <UserIcon className="w-5 h-5" />
                )}
                {otherUser.status === 'Online' && (
                  <span className="w-3 h-3 rounded-full bg-[#22C55E] border-2 border-[#1E293B] absolute bottom-0 right-0 shadow-sm"></span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-[#F8FAFC] truncate">
                    {otherUser.displayName || 'User'}
                  </h3>
                  {chat.lastMessageTimestamp > 0 && (
                    <span className="text-[11px] text-[#94A3B8] font-medium shrink-0 ml-2">
                      {formatChatTime(chat.lastMessageTimestamp)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94A3B8] truncate leading-tight">
                  {chat.lastMessage || 'No messages yet'}
                </p>
              </div>

              <button
                type="button"
                title="Hide conversation"
                onClick={(event) => {
                  event.stopPropagation();
                  hideConversation(chat.chatId).catch((error) =>
                    console.error('Could not hide conversation:', error)
                  );
                }}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-[#334155]/50 transition shrink-0"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  // Contacts tab: search registered users; otherwise show saved contacts.
  if (loadingContacts && !query) {
    return (
      <div className="flex items-center justify-center p-8 text-[#94A3B8]">
        <Loader2 className="w-5 h-5 animate-spin text-[#5865F2]" />
      </div>
    );
  }

  const filteredContacts = query
    ? registeredUsers.filter((user) =>
        (user.displayName || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query)
      )
    : contacts;

  if (filteredContacts.length === 0) {
    return (
      <div className="p-8 text-center text-[#94A3B8] text-xs">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#8B5CF6]" />
        <p className="font-semibold text-[#F8FAFC]">
          {query ? 'No registered users found' : 'No saved contacts'}
        </p>
        <p className="mt-1 text-[11px] text-[#64748B]">
          {query ? 'Try another name or email.' : 'Search for users to add contacts.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#334155]/40">
      {filteredContacts.map((contact) => {
        const isSelected = activeContact?.uid === contact.uid;
        const isSaved = contacts.some((saved) => saved.uid === contact.uid);

        return (
          <div
            key={contact.uid}
            onClick={() => selectContact(contact)}
            className={`p-3.5 flex items-center gap-3 cursor-pointer transition ${
              isSelected
                ? 'bg-[#5865F2]/20 border-l-4 border-[#5865F2]'
                : 'hover:bg-[#0F172A]/40'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-[#0F172A] border border-white flex items-center justify-center text-[#5865F2] shrink-0 font-bold overflow-hidden relative shadow-sm">
              {contact.profileImageUrl ? (
                <img src={contact.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                contact.displayName?.charAt(0)?.toUpperCase() || <UserIcon className="w-5 h-5" />
              )}
              {contact.status === 'Online' && (
                <span className="w-3 h-3 rounded-full bg-[#22C55E] border-2 border-[#1E293B] absolute bottom-0 right-0 shadow-sm"></span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-bold text-[#F8FAFC] truncate">
                {contact.displayName || 'User'}
              </h3>
              <p className="text-[11px] text-[#94A3B8] truncate leading-tight">
                {contact.email}
              </p>
            </div>

            {isSaved ? (
              <button
                type="button"
                title="Remove contact"
                onClick={(event) => {
                  event.stopPropagation();
                  removeContactFromList(contact.uid).catch((error) =>
                    console.error('Could not remove contact:', error)
                  );
                }}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-[#334155]/50 transition shrink-0"
              >
                <UserMinus className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                title="Add contact"
                onClick={(event) => {
                  event.stopPropagation();
                  addContactToList(contact).catch((error) =>
                    console.error('Could not add contact:', error)
                  );
                }}
                className="p-2 rounded-lg text-[#94A3B8] hover:text-[#22C55E] hover:bg-[#334155]/50 transition shrink-0"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
