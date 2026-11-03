import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Helper to extract title snippet from prompt text (max 35 chars).
 */
const generateTitleSnippet = (text) => {
  const trimmed = (text || '').trim();
  if (!trimmed) return 'New Conversation';
  return trimmed.length > 35 ? trimmed.substring(0, 35).trim() + '...' : trimmed;
};

/**
 * 1. Creates a new persistent AI conversation document and saves the initial user message.
 *
 * @param {string} userId - Current authenticated user's UID.
 * @param {string|object} firstMessage - Raw text or message object of the first user prompt.
 * @returns {Promise<string>} The generated conversationId.
 */
export const createConversation = async (userId, firstMessage) => {
  if (!userId) {
    throw new Error('User ID is required to create a conversation.');
  }

  const promptText = typeof firstMessage === 'string'
    ? firstMessage.trim()
    : (firstMessage?.text || '').trim();

  const imageUrl = typeof firstMessage === 'object' ? (firstMessage?.imageUrl || null) : null;
  const title = generateTitleSnippet(promptText);
  const now = Date.now();

  const convRef = doc(collection(db, 'users', userId, 'aiConversations'));
  const conversationId = convRef.id;

  const msgRef = doc(collection(db, 'users', userId, 'aiConversations', conversationId, 'messages'));
  const messageId = msgRef.id;

  const convData = {
    conversationId,
    title,
    createdAt: now,
    updatedAt: now,
    lastMessageText: promptText || 'Attached Image'
  };

  const firstMsgData = {
    messageId,
    text: promptText,
    imageUrl: imageUrl || null,
    isUser: true,
    timestamp: now
  };

  const batch = writeBatch(db);
  batch.set(convRef, convData);
  batch.set(msgRef, firstMsgData);

  await batch.commit();
  return conversationId;
};

/**
 * 2. Saves a user or bot message to a conversation and updates the conversation's updatedAt & lastMessageText.
 * Uses message.messageId as the Firestore document ID if provided, ensuring in-place updates.
 *
 * @param {string} userId - Current user's UID.
 * @param {string} conversationId - Active AI conversation ID.
 * @param {object} message - Message object { messageId, text, imageUrl, isUser, timestamp }.
 * @returns {Promise<object>} The saved message data.
 */
export const saveMessage = async (userId, conversationId, message) => {
  if (!userId || !conversationId || !message) {
    throw new Error('Missing required parameters for saveMessage.');
  }

  const now = Date.now();
  const text = (message.text || '').trim();
  const imageUrl = message.imageUrl || null;
  const isUser = !!message.isUser;
  const timestamp = message.timestamp || now;

  const messagesColRef = collection(db, 'users', userId, 'aiConversations', conversationId, 'messages');
  const msgRef = message.messageId
    ? doc(messagesColRef, message.messageId)
    : doc(messagesColRef);

  const messageId = msgRef.id;

  const msgData = {
    messageId,
    text,
    imageUrl,
    isUser,
    timestamp
  };

  const convRef = doc(db, 'users', userId, 'aiConversations', conversationId);

  const batch = writeBatch(db);
  batch.set(msgRef, msgData, { merge: true });
  batch.set(
    convRef,
    {
      updatedAt: now,
      lastMessageText: text || (imageUrl ? 'Attached Image' : 'Message')
    },
    { merge: true }
  );

  await batch.commit();
  return msgData;
};

/**
 * 3. Subscribes in real time to the list of AI conversations for a user, sorted by updatedAt descending.
 *
 * @param {string} userId - Current user's UID.
 * @param {function} callback - Callback receiving the array of conversation objects.
 * @param {function} [onError] - Optional error handler.
 * @returns {function} Unsubscribe function.
 */
export const subscribeToConversations = (userId, callback, onError) => {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const convsRef = collection(db, 'users', userId, 'aiConversations');
  const q = query(convsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const convList = [];
      snapshot.forEach((docSnap) => {
        convList.push({ conversationId: docSnap.id, ...docSnap.data() });
      });
      callback(convList);
    },
    (error) => {
      console.error('Firestore Read Error (subscribeToConversations):', error);
      if (onError) onError(error);
    }
  );
};

/**
 * 4. Subscribes in real time to messages within an AI conversation, sorted by timestamp ascending.
 *
 * @param {string} userId - Current user's UID.
 * @param {string} conversationId - Target AI conversation ID.
 * @param {function} callback - Callback receiving the array of message objects.
 * @param {function} [onError] - Optional error handler.
 * @returns {function} Unsubscribe function.
 */
export const subscribeToMessages = (userId, conversationId, callback, onError) => {
  if (!userId || !conversationId) {
    callback([]);
    return () => {};
  }

  const msgsRef = collection(db, 'users', userId, 'aiConversations', conversationId, 'messages');
  const q = query(msgsRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgList = [];
      snapshot.forEach((docSnap) => {
        msgList.push({ messageId: docSnap.id, ...docSnap.data() });
      });
      callback(msgList);
    },
    (error) => {
      console.error('Firestore Read Error (subscribeToMessages):', error);
      if (onError) onError(error);
    }
  );
};

/**
 * 5. Renames an existing AI conversation document.
 *
 * @param {string} userId - Current user's UID.
 * @param {string} conversationId - AI conversation ID to rename.
 * @param {string} newTitle - The new title text.
 */
export const renameConversation = async (userId, conversationId, newTitle) => {
  if (!userId || !conversationId) {
    throw new Error('Missing parameters for renameConversation.');
  }

  const trimmedTitle = (newTitle || '').trim();
  if (!trimmedTitle) {
    throw new Error('Conversation title cannot be empty.');
  }

  const convRef = doc(db, 'users', userId, 'aiConversations', conversationId);
  await updateDoc(convRef, {
    title: trimmedTitle,
    updatedAt: Date.now()
  });
};

/**
 * 6. Deletes an AI conversation document and all of its sub-collection messages safely.
 * Deletes sub-collection messages in chunks of maximum 400 documents per writeBatch to prevent
 * exceeding Firestore's 500-operation batch write limit.
 *
 * @param {string} userId - Current user's UID.
 * @param {string} conversationId - AI conversation ID to delete.
 */
export const deleteConversation = async (userId, conversationId) => {
  if (!userId || !conversationId) {
    throw new Error('Missing parameters for deleteConversation.');
  }

  const msgsRef = collection(db, 'users', userId, 'aiConversations', conversationId, 'messages');
  const snapshot = await getDocs(msgsRef);
  const docs = snapshot.docs;

  // Delete sub-collection messages in safe chunks of 400 documents
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunkBatch = writeBatch(db);
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    chunk.forEach((docSnap) => {
      chunkBatch.delete(docSnap.ref);
    });
    await chunkBatch.commit();
  }

  // Delete parent conversation document after message deletion succeeds
  const convRef = doc(db, 'users', userId, 'aiConversations', conversationId);
  await deleteDoc(convRef);
};

/**
 * 7. Updates lastMessageText and updatedAt timestamp for a conversation.
 *
 * @param {string} userId - Current user's UID.
 * @param {string} conversationId - AI conversation ID.
 * @param {string} text - Updated snippet text.
 */
export const updateConversationLastMessage = async (userId, conversationId, text) => {
  if (!userId || !conversationId) {
    throw new Error('Missing parameters for updateConversationLastMessage.');
  }

  const convRef = doc(db, 'users', userId, 'aiConversations', conversationId);
  await updateDoc(convRef, {
    lastMessageText: (text || '').trim() || 'Message',
    updatedAt: Date.now()
  });
};
