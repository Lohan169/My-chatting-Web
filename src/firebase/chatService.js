import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  updateDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const AI_WORKER_URL = 'https://chat-ai-worker.chat-ai-md.workers.dev';

export const getChatId = (userId1, userId2) => {
  if (!userId1 || !userId2) return 'default_chat';
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

export const notifyAiWorker = async (chatId, messageId, recipientId, idToken) => {
  if (!chatId || !messageId || !recipientId || !idToken) return;
  try {
    await fetch(`${AI_WORKER_URL}/notify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatId, messageId, recipientId })
    });
  } catch (e) {
    console.warn('AI Worker notification warning:', e.message);
  }
};

export const updateAiSettings = async (chatId, userId, settings) => {
  if (!chatId || !userId) return;
  const docRef = doc(db, 'chats', chatId, 'aiSettings', userId);
  await setDoc(docRef, settings, { merge: true });
};

export const subscribeToAiSettings = (chatId, userId, callback, onError) => {
  if (!chatId || !userId) return () => {};
  const docRef = doc(db, 'chats', chatId, 'aiSettings', userId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback({ enabled: false, state: 'OFF' });
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const subscribeToUserChats = (currentUserId, contacts, callback, onError) => {
  if (!currentUserId || !contacts || contacts.length === 0) {
    callback([]);
    return () => {};
  }

  let chatsMap = new Map();
  let unsubscribes = [];

  contacts.forEach((contact) => {
    if (!contact.uid) return;
    const chatId = getChatId(currentUserId, contact.uid);
    const chatDocRef = doc(db, 'chats', chatId);

    const unsub = onSnapshot(
      chatDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          chatsMap.set(chatId, { chatId, ...data });
        } else {
          chatsMap.delete(chatId);
        }

        const sortedChats = Array.from(chatsMap.values()).sort(
          (a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0)
        );
        callback(sortedChats);
      },
      (error) => {
        console.warn(`Firestore read error for chat ${chatId}:`, error.message);
        if (onError) onError(error);
      }
    );

    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
};

export const subscribeToMessages = (chatId, callback, onError) => {
  if (!chatId) return () => {};

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messagesList = [];
      snapshot.forEach((docSnap) => {
        messagesList.push({ messageId: docSnap.id, ...docSnap.data() });
      });
      callback(messagesList);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const sendTextMessage = async (chatId, currentUserId, recipientId, text, replyMessage = null, idToken = null) => {
  const trimmedText = text ? text.trim() : '';
  if (!trimmedText) {
    throw new Error('Message text cannot be empty');
  }

  if (!chatId || !currentUserId || !recipientId) {
    throw new Error('Missing required message parameters');
  }

  const batch = writeBatch(db);

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  const messageId = messageRef.id;
  const timestamp = Date.now();

  const messageData = {
    messageId,
    senderId: currentUserId,
    receiverId: recipientId,
    text: trimmedText,
    imageUrl: '',
    audioUrl: '',
    duration: 0,
    type: 'text',
    timestamp,
    status: 0,
    edited: false,
    deleted: false,
    reactions: {},
    isForwarded: false,
    isAi: false
  };

  if (replyMessage) {
    messageData.replyMessageId = replyMessage.messageId || '';
    messageData.replySenderName = replyMessage.senderId === currentUserId ? 'You' : (replyMessage.senderName || 'Sender');
    messageData.replyMessage = replyMessage.text || 'Message';
    messageData.replyType = replyMessage.type || 'text';
  }

  batch.set(messageRef, messageData);

  const user1Id = currentUserId < recipientId ? currentUserId : recipientId;
  const user2Id = currentUserId < recipientId ? recipientId : currentUserId;

  const chatRef = doc(db, 'chats', chatId);
  const chatData = {
    chatId,
    user1Id,
    user2Id,
    lastMessage: trimmedText,
    lastMessageTimestamp: timestamp,
    lastSenderId: currentUserId,
    lastMessageSenderId: currentUserId
  };

  batch.set(chatRef, chatData, { merge: true });

  const aiSettingsRef = doc(db, 'chats', chatId, 'aiSettings', currentUserId);
  batch.set(
    aiSettingsRef,
    { lastUserActivity: timestamp, state: 'PAUSED', lastIncomingMessageId: messageId },
    { merge: true }
  );

  await batch.commit();

  if (idToken) {
    notifyAiWorker(chatId, messageId, recipientId, idToken);
  }

  return messageData;
};

export const sendImageMessage = async (chatId, currentUserId, recipientId, imageUrl, replyMessage = null, idToken = null) => {
  if (!imageUrl) {
    throw new Error('Image URL is required to send a photo message');
  }

  if (!chatId || !currentUserId || !recipientId) {
    throw new Error('Missing required message parameters');
  }

  const batch = writeBatch(db);

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  const messageId = messageRef.id;
  const timestamp = Date.now();

  const messageData = {
    messageId,
    senderId: currentUserId,
    receiverId: recipientId,
    text: 'Photo',
    imageUrl,
    audioUrl: '',
    duration: 0,
    type: 'image',
    timestamp,
    status: 0,
    edited: false,
    deleted: false,
    reactions: {},
    isForwarded: false,
    isAi: false
  };

  if (replyMessage) {
    messageData.replyMessageId = replyMessage.messageId || '';
    messageData.replySenderName = replyMessage.senderId === currentUserId ? 'You' : (replyMessage.senderName || 'Sender');
    messageData.replyMessage = replyMessage.text || (replyMessage.type === 'image' ? '🖼️ Photo' : 'Message');
    messageData.replyType = replyMessage.type || 'text';
  }

  batch.set(messageRef, messageData);

  const user1Id = currentUserId < recipientId ? currentUserId : recipientId;
  const user2Id = currentUserId < recipientId ? recipientId : currentUserId;

  const chatRef = doc(db, 'chats', chatId);
  const chatData = {
    chatId,
    user1Id,
    user2Id,
    lastMessage: '📷 Photo',
    lastMessageTimestamp: timestamp,
    lastSenderId: currentUserId,
    lastMessageSenderId: currentUserId
  };

  batch.set(chatRef, chatData, { merge: true });

  const aiSettingsRef = doc(db, 'chats', chatId, 'aiSettings', currentUserId);
  batch.set(
    aiSettingsRef,
    { lastUserActivity: timestamp, state: 'PAUSED', lastIncomingMessageId: messageId },
    { merge: true }
  );

  await batch.commit();

  if (idToken) {
    notifyAiWorker(chatId, messageId, recipientId, idToken);
  }

  return messageData;
};

export const sendVoiceMessage = async (chatId, currentUserId, recipientId, audioUrl, duration, replyMessage = null, idToken = null) => {
  if (!audioUrl) {
    throw new Error('Audio URL is required to send a voice message');
  }

  if (!chatId || !currentUserId || !recipientId) {
    throw new Error('Missing required message parameters');
  }

  const batch = writeBatch(db);

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  const messageId = messageRef.id;
  const timestamp = Date.now();

  const messageData = {
    messageId,
    senderId: currentUserId,
    receiverId: recipientId,
    text: '',
    imageUrl: '',
    audioUrl,
    duration: Math.round(duration || 0),
    type: 'voice',
    timestamp,
    status: 0,
    edited: false,
    deleted: false,
    reactions: {},
    isForwarded: false,
    isAi: false
  };

  if (replyMessage) {
    messageData.replyMessageId = replyMessage.messageId || '';
    messageData.replySenderName = replyMessage.senderId === currentUserId ? 'You' : (replyMessage.senderName || 'Sender');
    messageData.replyMessage = replyMessage.text || (replyMessage.type === 'voice' ? '🎤 Voice message' : 'Message');
    messageData.replyType = replyMessage.type || 'text';
  }

  batch.set(messageRef, messageData);

  const user1Id = currentUserId < recipientId ? currentUserId : recipientId;
  const user2Id = currentUserId < recipientId ? recipientId : currentUserId;

  const chatRef = doc(db, 'chats', chatId);
  const chatData = {
    chatId,
    user1Id,
    user2Id,
    lastMessage: '🎤 Voice message',
    lastMessageTimestamp: timestamp,
    lastSenderId: currentUserId,
    lastMessageSenderId: currentUserId
  };

  batch.set(chatRef, chatData, { merge: true });

  const aiSettingsRef = doc(db, 'chats', chatId, 'aiSettings', currentUserId);
  batch.set(
    aiSettingsRef,
    { lastUserActivity: timestamp, state: 'PAUSED', lastIncomingMessageId: messageId },
    { merge: true }
  );

  await batch.commit();

  if (idToken) {
    notifyAiWorker(chatId, messageId, recipientId, idToken);
  }

  return messageData;
};

export const sendDocumentMessage = async (
  chatId,
  currentUserId,
  recipientId,
  fileUrl,
  fileName,
  fileSize,
  fileType,
  replyMessage = null,
  idToken = null
) => {
  if (!fileUrl || !fileName) {
    throw new Error('File URL and filename are required to send a document');
  }

  if (!chatId || !currentUserId || !recipientId) {
    throw new Error('Missing required message parameters');
  }

  const batch = writeBatch(db);

  const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
  const messageId = messageRef.id;
  const timestamp = Date.now();

  const messageData = {
    messageId,
    senderId: currentUserId,
    receiverId: recipientId,
    text: fileName,
    fileUrl,
    fileName,
    fileSize: fileSize || 0,
    fileType: fileType || 'document',
    imageUrl: '',
    audioUrl: '',
    duration: 0,
    type: 'document',
    timestamp,
    status: 0,
    edited: false,
    deleted: false,
    reactions: {},
    isForwarded: false,
    isAi: false
  };

  if (replyMessage) {
    messageData.replyMessageId = replyMessage.messageId || '';
    messageData.replySenderName = replyMessage.senderId === currentUserId ? 'You' : (replyMessage.senderName || 'Sender');
    messageData.replyMessage = replyMessage.fileName ? `📄 ${replyMessage.fileName}` : (replyMessage.text || 'Document');
    messageData.replyType = replyMessage.type || 'text';
  }

  batch.set(messageRef, messageData);

  const user1Id = currentUserId < recipientId ? currentUserId : recipientId;
  const user2Id = currentUserId < recipientId ? recipientId : currentUserId;

  const chatRef = doc(db, 'chats', chatId);
  const chatData = {
    chatId,
    user1Id,
    user2Id,
    lastMessage: `📄 ${fileName}`,
    lastMessageTimestamp: timestamp,
    lastSenderId: currentUserId,
    lastMessageSenderId: currentUserId
  };

  batch.set(chatRef, chatData, { merge: true });

  const aiSettingsRef = doc(db, 'chats', chatId, 'aiSettings', currentUserId);
  batch.set(
    aiSettingsRef,
    { lastUserActivity: timestamp, state: 'PAUSED', lastIncomingMessageId: messageId },
    { merge: true }
  );

  await batch.commit();

  if (idToken) {
    notifyAiWorker(chatId, messageId, recipientId, idToken);
  }

  return messageData;
};

export const addReaction = async (chatId, messageId, userId, emoji) => {
  if (!chatId || !messageId || !userId || !emoji) {
    throw new Error('Missing reaction parameters');
  }
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(messageRef, {
    [`reactions.${userId}`]: emoji
  });
};

export const deleteMessageForMe = async (chatId, messageId, userId) => {
  if (!chatId || !messageId || !userId) {
    throw new Error('Missing parameters for Delete for Me');
  }
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(messageRef, {
    deletedFor: arrayUnion(userId)
  });
};

export const deleteMessageForEveryone = async (chatId, messageId, currentUserId, message) => {
  if (!chatId || !messageId || !currentUserId || !message) {
    throw new Error('Missing parameters for Delete for Everyone');
  }
  if (message.senderId !== currentUserId) {
    throw new Error('Unauthorized: Only the message sender can delete for everyone');
  }

  let textPlaceholder = 'This message was deleted.';
  if (message.type === 'image') {
    textPlaceholder = '🖼️ This image was deleted.';
  } else if (message.type === 'voice') {
    textPlaceholder = '🎤 This voice message was deleted.';
  } else if (message.type === 'document') {
    textPlaceholder = '📄 This document was deleted.';
  }

  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  await updateDoc(messageRef, {
    deleted: true,
    text: textPlaceholder,
    imageUrl: '',
    audioUrl: '',
    fileUrl: ''
  });
};

export const forwardMessage = async (sourceMessage, targetContacts, currentUserId, idToken = null) => {
  if (!sourceMessage || !targetContacts || targetContacts.length === 0 || !currentUserId) {
    throw new Error('Invalid forwarding arguments');
  }

  const results = [];

  for (const contact of targetContacts) {
    const targetUserId = contact.uid;
    const targetChatId = getChatId(currentUserId, targetUserId);
    const timestamp = Date.now();
    const messageRef = doc(collection(db, 'chats', targetChatId, 'messages'));
    const messageId = messageRef.id;

    let textPayload = sourceMessage.text || '';
    if (sourceMessage.type === 'image') {
      textPayload = 'Forwarded Photo';
    } else if (sourceMessage.type === 'document') {
      textPayload = sourceMessage.fileName || 'Forwarded Document';
    }

    const newMessage = {
      messageId,
      senderId: currentUserId,
      receiverId: targetUserId,
      type: sourceMessage.type || 'text',
      timestamp,
      isForwarded: true,
      status: 0,
      edited: false,
      deleted: false,
      reactions: {},
      isAi: false,
      text: textPayload,
      imageUrl: sourceMessage.imageUrl || '',
      audioUrl: sourceMessage.audioUrl || '',
      duration: sourceMessage.duration || 0,
      fileUrl: sourceMessage.fileUrl || '',
      fileName: sourceMessage.fileName || '',
      fileSize: sourceMessage.fileSize || 0,
      fileType: sourceMessage.fileType || ''
    };

    let lastMsgSummary = 'Forwarded message';
    if (sourceMessage.type === 'text') lastMsgSummary = sourceMessage.text;
    else if (sourceMessage.type === 'image') lastMsgSummary = '📷 Photo';
    else if (sourceMessage.type === 'voice') lastMsgSummary = '🎤 Voice message';
    else if (sourceMessage.type === 'document') lastMsgSummary = `📄 ${sourceMessage.fileName || 'Document'}`;

    const user1Id = currentUserId < targetUserId ? currentUserId : targetUserId;
    const user2Id = currentUserId < targetUserId ? targetUserId : currentUserId;

    const chatRef = doc(db, 'chats', targetChatId);
    const chatData = {
      chatId: targetChatId,
      user1Id,
      user2Id,
      lastMessage: lastMsgSummary,
      lastMessageTimestamp: timestamp,
      lastSenderId: currentUserId,
      lastMessageSenderId: currentUserId
    };

    let messageWriteSuccess = false;
    let chatSummarySuccess = false;
    let errorDetail = null;

    try {
      const batch = writeBatch(db);
      batch.set(messageRef, newMessage);
      batch.set(chatRef, chatData, { merge: true });
      await batch.commit();
      messageWriteSuccess = true;
      chatSummarySuccess = true;

      if (idToken) {
        notifyAiWorker(targetChatId, messageId, targetUserId, idToken);
      }
    } catch (err) {
      errorDetail = err.message;
    }

    results.push({
      contact,
      targetChatId,
      messageWriteSuccess,
      chatSummarySuccess,
      errorDetail
    });
  }

  return results;
};
