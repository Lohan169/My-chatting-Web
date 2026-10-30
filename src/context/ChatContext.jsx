import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUsers } from '../firebase/userService';
import {
  subscribeToUserChats,
  subscribeToMessages,
  getChatId,
  sendTextMessage,
  sendImageMessage,
  sendVoiceMessage,
  addReaction,
  deleteMessageForMe,
  deleteMessageForEveryone,
  forwardMessage,
  subscribeToAiSettings,
  updateAiSettings
} from '../firebase/chatService';
import { uploadImageToCloudinary, uploadVoiceToCloudinary } from '../utils/cloudinaryUtil';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState([]);
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

  // Subscribe to Contacts
  useEffect(() => {
    if (!currentUser) return;
    setLoadingContacts(true);

    const unsubscribe = subscribeToUsers(
      currentUser.uid,
      (userList) => {
        setContacts(userList);
        setLoadingContacts(false);
      },
      (error) => {
        console.error("Firestore Permission Error (Contacts):", error);
        setPermissionError(`Contacts read error: ${error.message}`);
        setLoadingContacts(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to User Chats (depends on currentUser & contacts)
  useEffect(() => {
    if (!currentUser || contacts.length === 0) {
      setChats([]);
      setLoadingChats(false);
      return;
    }

    setLoadingChats(true);

    const unsubscribe = subscribeToUserChats(
      currentUser.uid,
      contacts,
      (chatList) => {
        setChats(chatList);
        setLoadingChats(false);
      },
      (error) => {
        console.warn("Firestore Read Warning (Chats):", error);
        setLoadingChats(false);
      }
    );

    return unsubscribe;
  }, [currentUser, contacts]);

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

  const selectContact = (contact) => {
    setActiveContact(contact);
    setActiveReplyMessage(null);
    if (currentUser && contact) {
      const calculatedChatId = getChatId(currentUser.uid, contact.uid);
      setActiveChatId(calculatedChatId);
    }
  };

  const selectChat = (chat, otherUser) => {
    setActiveContact(otherUser);
    setActiveReplyMessage(null);
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

  const sendMessage = async (text) => {
    if (!currentUser || !activeContact || !activeChatId) {
      throw new Error('Active contact or session missing');
    }
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
    const idToken = await currentUser.getIdToken(false);
    return await forwardMessage(sourceMessage, targetContacts, currentUser.uid, idToken);
  };

  const value = {
    contacts,
    chats,
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
    reactToMessage,
    deleteForMe,
    deleteForEveryone,
    forwardMessageToContacts,
    toggleAiAutoReply
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
