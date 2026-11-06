import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUsers, subscribeToContacts, addContact as saveContact, removeContact as deleteContact, subscribeToHiddenChats, hideChat as saveHiddenChat, unhideChat as restoreHiddenChat, subscribeToBlockedUsers, subscribeToIncomingBlock, hasBlockedEitherWay, blockContact as saveBlockedContact, unblockContact as removeBlockedContact } from '../firebase/userService';
import {
  subscribeToUserChats,
  subscribeToMessages,
  getChatId,
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  sendDocumentMessage,
  addReaction,
  deleteMessageForMe,
  deleteMessageForEveryone,
  forwardMessage,
  subscribeToAiSettings,
  updateAiSettings
} from '../firebase/chatService';
import {
  uploadImageToCloudinary,
  uploadVoiceToCloudinary,
  uploadDocumentToCloudinary
} from '../utils/cloudinaryUtil';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [hiddenChatIds, setHiddenChatIds] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeReplyMessage, setActiveReplyMessage] = useState(null);
  const [aiSettings, setAiSettings] = useState({ enabled: false, state: 'OFF' });
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [blockedUserIds, setBlockedUserIds] = useState([]);
  const [activeContactBlockedYou, setActiveContactBlockedYou] = useState(false);

  // Subscribe only to explicitly saved Contacts.
  useEffect(() => {
    if (!currentUser) {
      setContacts([]);
      setLoadingContacts(false);
      return;
    }

    setLoadingContacts(true);
    const unsubscribe = subscribeToContacts(
      currentUser.uid,
      (contactList) => {
        setContacts(contactList);
        setLoadingContacts(false);
      },
      (error) => {
        console.error('Firestore Permission Error (Contacts):', error);
        setPermissionError(`Contacts read error: ${error.message}`);
        setLoadingContacts(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to registered users for search.
  useEffect(() => {
    if (!currentUser) {
      setRegisteredUsers([]);
      return;
    }

    const unsubscribe = subscribeToUsers(
      currentUser.uid,
      (userList) => setRegisteredUsers(userList),
      (error) => console.error('Registered users read error:', error)
    );

    return unsubscribe;
  }, [currentUser]);
  // Subscribe to current user's personal block list
  useEffect(() => {
    if (!currentUser) {
      setBlockedUserIds([]);
      return;
    }

    const unsubscribe = subscribeToBlockedUsers(
      currentUser.uid,
      (blockedUsers) => setBlockedUserIds(blockedUsers.map((item) => item.uid)),
      (error) => console.error('Personal block list read error:', error)
    );

    return unsubscribe;
  }, [currentUser]);
  // Subscribe to whether the active contact has blocked the current user.
  useEffect(() => {
    if (!currentUser?.uid || !activeContact?.uid) {
      setActiveContactBlockedYou(false);
      return;
    }

    const unsubscribe = subscribeToIncomingBlock(
      currentUser.uid,
      activeContact.uid,
      (blocked) => setActiveContactBlockedYou(blocked),
      (error) => console.error('Incoming block status read error:', error)
    );

    return unsubscribe;
  }, [currentUser?.uid, activeContact?.uid]);
  // Subscribe to this user's hidden conversations.
  useEffect(() => {
    if (!currentUser) {
      setHiddenChatIds([]);
      return;
    }

    const unsubscribe = subscribeToHiddenChats(
      currentUser.uid,
      (ids) => setHiddenChatIds(ids),
      (error) => console.error('Hidden chats read error:', error)
    );

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to chats independently of saved Contacts.
  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);
    const unsubscribe = subscribeToUserChats(
      currentUser.uid,
      (chatList) => {
        setChats(chatList.filter((chat) => !hiddenChatIds.includes(chat.chatId)));
        setLoadingChats(false);
      },
      (error) => {
        console.warn('Firestore Read Warning (Chats):', error);
        setPermissionError(`Chats read error: ${error.message}`);
        setLoadingChats(false);
      }
    );

    return unsubscribe;
  }, [currentUser, hiddenChatIds]);
  // Subscribe to Messages for Active Chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const unsubscribe = subscribeToMessages(
      activeChatId,
      (msgList) => {
        const visibleMessages = msgList.filter(
          (m) => !m.deletedFor || !Array.isArray(m.deletedFor) || !m.deletedFor.includes(currentUser?.uid)
        );
        setMessages(visibleMessages);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Firestore Permission Error (Messages):", error);
        setPermissionError(`Messages read error: ${error.message}`);
        setLoadingMessages(false);
      }
    );

    return unsubscribe;
  }, [activeChatId, currentUser]);

  // Subscribe to AI Settings for Active Chat & Current User
  useEffect(() => {
    if (!activeChatId || !currentUser) {
      setAiSettings({ enabled: false, state: 'OFF' });
      return;
    }

    const unsubscribe = subscribeToAiSettings(
      activeChatId,
      currentUser.uid,
      (settings) => {
        setAiSettings(settings);
      },
      (error) => {
        console.warn('AI Settings read warning:', error.message);
      }
    );

    return unsubscribe;
  }, [activeChatId, currentUser]);

  const addContactToList = async (user) => {
    if (!currentUser || !user?.uid) throw new Error('Select a registered user first');
    await saveContact(currentUser.uid, user);
  };

  const removeContactFromList = async (userId) => {
    if (!currentUser || !userId) throw new Error('Select a contact first');
    await deleteContact(currentUser.uid, userId);
  };

  const hideConversation = async (chatId) => {
    if (!currentUser || !chatId) throw new Error('Select a conversation first');
    await saveHiddenChat(currentUser.uid, chatId);
  };

  const unhideConversation = async (chatId) => {
    if (!currentUser || !chatId) return;
    await restoreHiddenChat(currentUser.uid, chatId);
  };
  const selectContact = (contact) => {
    setActiveContact(contact);
    setActiveReplyMessage(null);
    if (currentUser && contact) {
      const calculatedChatId = getChatId(currentUser.uid, contact.uid);
      restoreHiddenChat(currentUser.uid, calculatedChatId).catch((error) =>
        console.warn('Could not restore hidden conversation:', error)
      );
      setActiveChatId(calculatedChatId);
    }
  };

  const selectChat = (chat, otherUser) => {
    setActiveContact(otherUser);
    setActiveReplyMessage(null);
    restoreHiddenChat(currentUser.uid, chat.chatId).catch((error) =>
      console.warn('Could not restore hidden conversation:', error)
    );
    setActiveChatId(chat.chatId);
  };
  const setReplyMessage = (msg) => {
    if (!msg) {
      setActiveReplyMessage(null);
      return;
    }
    const senderName = msg.senderId === currentUser?.uid ? 'You' : (activeContact?.displayName || 'Sender');
    setActiveReplyMessage({ ...msg, senderName });
  };

  const cancelReply = () => {
    setActiveReplyMessage(null);
  };

  const toggleAiAutoReply = async (enabled) => {
    if (!activeChatId || !currentUser) return;
    if (enabled) {
      await updateAiSettings(activeChatId, currentUser.uid, {
        enabled: true,
        state: 'WAITING',
        lastUserActivity: Date.now()
      });
    } else {
      await updateAiSettings(activeChatId, currentUser.uid, {
        enabled: false,
        state: 'OFF'
      });
    }
  };

  const isActiveContactBlocked = Boolean(
    activeContact?.uid &&
    (blockedUserIds.includes(activeContact.uid) || activeContactBlockedYou)
  );

  const ensureContactNotBlocked = async (targetUserId) => {
    const blocked = await hasBlockedEitherWay(currentUser.uid, targetUserId);

    if (blocked) {
      throw new Error('Messaging is unavailable because one of you has blocked the other.');
    }
  };

  const blockActiveContact = async () => {
    if (!currentUser || !activeContact) throw new Error('No active contact selected');
    await saveBlockedContact(currentUser.uid, activeContact);
  };

  const unblockActiveContact = async () => {
    if (!currentUser || !activeContact) throw new Error('No active contact selected');
    await removeBlockedContact(currentUser.uid, activeContact.uid);
  };
  const sendMessage = async (text) => {
    if (!currentUser || !activeContact || !activeChatId) {
      throw new Error('Active contact or session missing');
    }
    await ensureContactNotBlocked(activeContact.uid);
    const idToken = await currentUser.getIdToken(false);
    const result = await sendTextMessage(
      activeChatId,
      currentUser.uid,
      activeContact.uid,
      text,
      activeReplyMessage,
      idToken
    );
    setActiveReplyMessage(null);
    return result;
  };

  const sendImage = async (file, onProgress, onXhrCreated) => {
    if (!currentUser || !activeContact || !activeChatId) {
      throw new Error('Active contact or session missing');
    }

    await ensureContactNotBlocked(activeContact.uid);
    const imageUrl = await uploadImageToCloudinary(file, activeChatId, onProgress, onXhrCreated);
    const idToken = await currentUser.getIdToken(false);

    const result = await sendImageMessage(
      activeChatId,
      currentUser.uid,
      activeContact.uid,
      imageUrl,
      activeReplyMessage,
      idToken
    );

    setActiveReplyMessage(null);
    return result;
  };

  const sendVoice = async (audioBlob, duration, onProgress, onXhrCreated) => {
    if (!currentUser || !activeContact || !activeChatId) {
      throw new Error('Active contact or session missing');
    }

    await ensureContactNotBlocked(activeContact.uid);
    const audioUrl = await uploadVoiceToCloudinary(audioBlob, activeChatId, onProgress, onXhrCreated);
    const idToken = await currentUser.getIdToken(false);

    const result = await sendVoiceMessage(
      activeChatId,
      currentUser.uid,
      activeContact.uid,
      audioUrl,
      duration,
      activeReplyMessage,
      idToken
    );

    setActiveReplyMessage(null);
    return result;
  };

  const sendDocument = async (file, fileName, fileSize, fileType, onProgress, onXhrCreated) => {
    if (!currentUser || !activeContact || !activeChatId) {
      throw new Error('Active contact or session missing');
    }

    await ensureContactNotBlocked(activeContact.uid);
    const fileUrl = await uploadDocumentToCloudinary(file, activeChatId, onProgress, onXhrCreated);
    const idToken = await currentUser.getIdToken(false);

    const ext = (fileName || file.name || '').split('.').pop().toLowerCase();

    const result = await sendDocumentMessage(
      activeChatId,
      currentUser.uid,
      activeContact.uid,
      fileUrl,
      fileName || file.name,
      fileSize || file.size,
      ext || fileType || 'document',
      activeReplyMessage,
      idToken
    );

    setActiveReplyMessage(null);
    return result;
  };

  const reactToMessage = async (messageId, emoji) => {
    if (!activeChatId || !currentUser || !messageId || !emoji) return;
    await addReaction(activeChatId, messageId, currentUser.uid, emoji);
  };

  const deleteForMe = async (messageId) => {
    if (!activeChatId || !currentUser || !messageId) return;
    await deleteMessageForMe(activeChatId, messageId, currentUser.uid);
  };

  const deleteForEveryone = async (message) => {
    if (!activeChatId || !currentUser || !message) return;
    await deleteMessageForEveryone(activeChatId, message.messageId, currentUser.uid, message);
  };

  const forwardMessageToContacts = async (sourceMessage, targetContacts) => {
    if (!currentUser || !sourceMessage || !targetContacts || targetContacts.length === 0) {
      throw new Error('Missing parameters for forwarding');
    }
    const blockChecks = await Promise.all(
      targetContacts.map(async (contact) => ({
        contact,
        blocked: await hasBlockedEitherWay(currentUser.uid, contact.uid)
      }))
    );
    const blockedTargets = blockChecks.filter((item) => item.blocked);
    if (blockedTargets.length > 0) {
      throw new Error('Forwarding is unavailable because one or more recipients have a block between you.');
    }
    const idToken = await currentUser.getIdToken(false);
    return await forwardMessage(sourceMessage, targetContacts, currentUser.uid, idToken);
  };

  const value = {
    contacts,
    registeredUsers,
    chats,
    addContactToList,
    removeContactFromList,
    hideConversation,
    unhideConversation,
    activeContact,
    activeChatId,
    messages,
    activeReplyMessage,
    aiSettings,
    loadingContacts,
    loadingChats,
    loadingMessages,
    permissionError,
    selectContact,
    selectChat,
    setReplyMessage,
    cancelReply,
    sendMessage,
    sendImage,
    sendVoice,
    sendDocument,
    reactToMessage,
    deleteForMe,
    deleteForEveryone,
    forwardMessageToContacts,
    toggleAiAutoReply,
    blockedUserIds,
    isActiveContactBlocked,
    activeContactBlockedYou,
    blockActiveContact,
    unblockActiveContact
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
