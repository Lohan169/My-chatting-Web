import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const subscribeToUsers = (currentUserId, callback, onError) => {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const usersList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== currentUserId && !data.isBlocked) {
          usersList.push({ uid: docSnap.id, ...data });
        }
      });
      callback(usersList);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const subscribeToUserDoc = (userId, callback, onError) => {
  if (!userId) return () => {};
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ uid: docSnap.id, ...docSnap.data() });
      } else {
        callback(null);
      }
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const subscribeAllUsers = (callback, onError) => {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const usersList = [];
      snapshot.forEach((docSnap) => {
        usersList.push({ uid: docSnap.id, ...docSnap.data() });
      });
      callback(usersList);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const toggleUserBlockStatus = async (userId, newBlockedStatus) => {
  if (!userId) throw new Error('User ID is required');
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isBlocked: newBlockedStatus });
};

export const toggleUserAdminStatus = async (userId, newAdminStatus) => {
  if (!userId) throw new Error('User ID is required');
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isAdmin: newAdminStatus });
};
