import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth';
import { auth } from './firebaseConfig';

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const registerUser = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

// Update Firebase Authentication profile
export const updateAuthProfile = async (user, profileData) => {
  if (!user) throw new Error('User is required');

  await updateProfile(user, {
    displayName: profileData.displayName,
    photoURL: profileData.photoURL
  });

  return user;
};

