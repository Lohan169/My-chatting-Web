import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';

import { db } from './firebaseConfig';

// Registered users - for searching users.
export const subscribeToUsers = (currentUserId, callback, onError) => {
  const usersRef = collection(db, 'users');

  return onSnapshot(usersRef, (snapshot) => {
    const usersList = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      if (docSnap.id !== currentUserId && !data.isBlocked) {
        usersList.push({ uid: docSnap.id, ...data });
      }
    });

    callback(usersList);
  }, (error) => {
    if (onError) onError(error);
  });
};

// Existing Admin Panel user subscription.
export const subscribeAllUsers = (callback, onError) => {
  const usersRef = collection(db, 'users');

  return onSnapshot(usersRef, (snapshot) => {
    const usersList = [];

    snapshot.forEach((docSnap) => {
      usersList.push({ uid: docSnap.id, ...docSnap.data() });
    });

    callback(usersList);
  }, (error) => {
    if (onError) onError(error);
  });
};

// Subscribe to a single user profile.
export const subscribeToUserDoc = (userId, callback, onError) => {
  if (!userId) return () => {};

  const userRef = doc(db, 'users', userId);

  return onSnapshot(userRef, (docSnap) => {
    callback(
      docSnap.exists()
        ? { uid: docSnap.id, ...docSnap.data() }
        : null
    );
  }, (error) => {
    if (onError) onError(error);
  });
};

// Subscribe only to explicitly saved contacts.
export const subscribeToContacts = (userId, callback, onError) => {
  if (!userId) return () => {};

  const contactsRef = collection(db, 'users', userId, 'contacts');
  const contactMetadata = new Map();
  const profileCache = new Map();
  const profileUnsubs = new Map();

  let active = true;

  const emitContacts = () => {
    if (!active) return;

    const contacts = Array.from(contactMetadata.entries())
      .filter(([uid]) => profileCache.has(uid))
      .map(([uid, metadata]) => ({
        ...profileCache.get(uid),
        ...metadata,
        uid
      }))
      .sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));

    callback(contacts);
  };

  const unsubscribeContacts = onSnapshot(contactsRef, (snapshot) => {
    const existingIds = new Set(snapshot.docs.map((item) => item.id));

    for (const [uid, unsubscribe] of profileUnsubs.entries()) {
      if (!existingIds.has(uid)) {
        unsubscribe();
        profileUnsubs.delete(uid);
        profileCache.delete(uid);
        contactMetadata.delete(uid);
      }
    }

    snapshot.forEach((contactDoc) => {
      const uid = contactDoc.id;

      contactMetadata.set(uid, {
        ...contactDoc.data(),
        uid
      });

      if (!profileUnsubs.has(uid)) {
        const profileRef = doc(db, 'users', uid);

        const unsubscribeProfile = onSnapshot(profileRef, (profileDoc) => {
          if (profileDoc.exists()) {
            profileCache.set(uid, {
              uid,
              ...profileDoc.data()
            });
          } else {
            profileCache.delete(uid);
          }

          emitContacts();
        }, (error) => {
          if (onError) onError(error);
        });

        profileUnsubs.set(uid, unsubscribeProfile);
      }
    });

    emitContacts();
  }, (error) => {
    if (onError) onError(error);
  });

  return () => {
    active = false;
    unsubscribeContacts();

    profileUnsubs.forEach((unsubscribe) => unsubscribe());
    profileUnsubs.clear();
    profileCache.clear();
    contactMetadata.clear();
  };
};

// Add a registered user to the current user's contacts.
export const addContact = async (currentUserId, targetUser) => {
  if (!currentUserId || !targetUser?.uid) {
    throw new Error('User information is missing');
  }

  if (currentUserId === targetUser.uid) {
    throw new Error('You cannot add yourself');
  }

  const targetRef = doc(db, 'users', targetUser.uid);
  const targetSnapshot = await getDoc(targetRef);

  if (!targetSnapshot.exists()) {
    throw new Error('User does not exist');
  }

  if (targetSnapshot.data().isBlocked) {
    throw new Error('This user is unavailable');
  }

  const contactRef = doc(
    db,
    'users',
    currentUserId,
    'contacts',
    targetUser.uid
  );

  await setDoc(contactRef, {
    uid: targetUser.uid,
    addedAt: Date.now()
  }, { merge: true });
};

// Remove a contact without deleting chat history.
export const removeContact = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    throw new Error('User information is missing');
  }

  const contactRef = doc(
    db,
    'users',
    currentUserId,
    'contacts',
    targetUserId
  );

  await deleteDoc(contactRef);
};

// Existing Admin block functionality.
export const toggleUserBlockStatus = async (userId, newBlockedStatus) => {
  if (!userId) throw new Error('User ID is required');

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isBlocked: newBlockedStatus });
};

// Existing Admin role functionality.
export const toggleUserAdminStatus = async (userId, newAdminStatus) => {
  if (!userId) throw new Error('User ID is required');

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isAdmin: newAdminStatus });
};

// Existing profile update functionality.
export const updateUserProfile = async (userId, profileData) => {
  if (!userId) throw new Error('User ID is required');

  const userRef = doc(db, 'users', userId);

  await setDoc(
    userRef,
    { ...profileData, updatedAt: Date.now() },
    { merge: true }
  );
};

// Existing personal block list.
export const subscribeToBlockedUsers = (userId, callback, onError) => {
  if (!userId) return () => {};

  const blockedRef = collection(db, 'users', userId, 'blockedUsers');

  return onSnapshot(blockedRef, (snapshot) => {
    callback(snapshot.docs.map((item) => ({
      uid: item.id,
      ...item.data()
    })));
  }, (error) => {
    if (onError) onError(error);
  });
};

export const blockContact = async (currentUserId, targetUser) => {
  if (!currentUserId || !targetUser?.uid) {
    throw new Error('User information is missing');
  }

  const blockedRef = doc(
    db,
    'users',
    currentUserId,
    'blockedUsers',
    targetUser.uid
  );

  await setDoc(blockedRef, {
    uid: targetUser.uid,
    displayName: targetUser.displayName || 'User',
    blockedAt: Date.now()
  }, { merge: true });
};

export const unblockContact = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) {
    throw new Error('User information is missing');
  }

  const blockedRef = doc(
    db,
    'users',
    currentUserId,
    'blockedUsers',
    targetUserId
  );

  await deleteDoc(blockedRef);
};

// Subscribe to chats hidden only by the current user.
export const subscribeToHiddenChats = (userId, callback, onError) => {
  if (!userId) return () => {};

  const hiddenRef = collection(db, 'users', userId, 'hiddenChats');

  return onSnapshot(hiddenRef, (snapshot) => {
    callback(snapshot.docs.map((item) => item.id));
  }, (error) => {
    if (onError) onError(error);
  });
};

// Hide a conversation from the current user's chat list only.
export const hideChat = async (userId, chatId) => {
  if (!userId || !chatId) throw new Error('User ID and chat ID are required');

  await setDoc(doc(db, 'users', userId, 'hiddenChats', chatId), {
    chatId,
    hiddenAt: Date.now()
  });
};

// Restore a previously hidden conversation.
export const unhideChat = async (userId, chatId) => {
  if (!userId || !chatId) throw new Error('User ID and chat ID are required');

  await deleteDoc(doc(db, 'users', userId, 'hiddenChats', chatId));
};

// Check whether the other user has blocked the current user in real time.
export const subscribeToIncomingBlock = (currentUserId, otherUserId, callback, onError) => {
  if (!currentUserId || !otherUserId) {
    callback(false);
    return () => {};
  }

  const incomingBlockRef = doc(
    db,
    'users',
    otherUserId,
    'blockedUsers',
    currentUserId
  );

  return onSnapshot(
    incomingBlockRef,
    (snapshot) => callback(snapshot.exists()),
    (error) => {
      if (onError) onError(error);
    }
  );
};

// Check both directions before sending any message or attachment.
export const hasBlockedEitherWay = async (currentUserId, otherUserId) => {
  if (!currentUserId || !otherUserId) {
    throw new Error('User information is missing');
  }

  const [outgoingBlock, incomingBlock] = await Promise.all([
    getDoc(doc(db, 'users', currentUserId, 'blockedUsers', otherUserId)),
    getDoc(doc(db, 'users', otherUserId, 'blockedUsers', currentUserId))
  ]);

  return outgoingBlock.exists() || incomingBlock.exists();
};
