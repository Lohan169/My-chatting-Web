import React, { useEffect, useState } from 'react';
import { X, Camera, User, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateAuthProfile } from '../../firebase/authService';
import { updateUserProfile } from '../../firebase/userService';
import { uploadProfileImageToCloudinary } from '../../utils/cloudinaryUtil';

export default function AccountPanel({ onClose }) {
  const { currentUser, userProfile } = useAuth();

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || currentUser?.displayName || ''
  );

  const [about, setAbout] = useState(userProfile?.about || '');

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(
    userProfile?.profileImageUrl || currentUser?.photoURL || ''
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!selectedFile) return;

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB.');
      return;
    }

    setError('');
    setSuccess('');
    setSelectedFile(file);
  };

  const handleSave = async () => {
    const cleanName = displayName.trim();

    if (!cleanName) {
      setError('Display name cannot be empty.');
      return;
    }

    if (!currentUser?.uid) {
      setError('User authentication not found.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let photoURL =
        userProfile?.profileImageUrl ||
        currentUser.photoURL ||
        '';

      if (selectedFile) {
        photoURL = await uploadProfileImageToCloudinary(
          selectedFile,
          currentUser.uid
        );
      }

      await updateAuthProfile(currentUser, {
        displayName: cleanName,
        photoURL: photoURL || null
      });

      await updateUserProfile(currentUser.uid, {
        displayName: cleanName,
        profileImageUrl: photoURL,
        about: about.trim()
      });

      setSuccess('Profile updated successfully!');

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#4752C4]">
          <div>
            <h2 className="text-lg font-bold text-white">Account Settings</h2>
            <p className="text-xs text-white/75">Manage your profile</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-white hover:bg-white/15 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28 rounded-full border-4 border-[#5865F2] bg-[#0F172A] overflow-hidden flex items-center justify-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-[#94A3B8]" />
              )}
            </div>

            <label className="mt-3 cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#334155] hover:bg-[#475569] text-white text-sm font-semibold transition">
              <Camera className="w-4 h-4" />
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                disabled={saving}
              />
            </label>

            <p className="text-[11px] text-[#94A3B8] mt-2">
              JPG, PNG or other image formats · Max 10MB
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E2E8F0] mb-2">
              Display Name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              disabled={saving}
              placeholder="Enter your name"
              className="w-full bg-[#0F172A] border border-[#475569] rounded-xl px-4 py-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#5865F2] transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E2E8F0] mb-2">
              About
            </label>

            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={160}
              rows={3}
              disabled={saving}
              placeholder="Write something about yourself..."
              className="w-full resize-none bg-[#0F172A] border border-[#475569] rounded-xl px-4 py-3 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#5865F2] transition"
            />

            <p className="text-[11px] text-[#94A3B8] mt-1 text-right">
              {about.length}/160 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#E2E8F0] mb-2">
              Email Address
            </label>

            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="w-full bg-[#0F172A]/60 border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#94A3B8] cursor-not-allowed"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg p-3">
              {success}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-[#475569] text-[#CBD5E1] hover:bg-[#334155] text-sm font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

