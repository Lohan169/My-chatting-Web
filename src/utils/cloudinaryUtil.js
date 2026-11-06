export const uploadImageToCloudinary = (file, chatId, onProgress, onXhrCreated) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided for upload'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Please select an image file.'));
      return;
    }

    // 10MB file size limit
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      reject(new Error('Image size exceeds 10MB limit. Please choose a smaller photo.'));
      return;
    }

    const cloudName = 'bgrvouaj';
    const uploadPreset = 'Chatting_upload';
    const folder = `chat_images/${chatId}`;

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    if (onXhrCreated) {
      onXhrCreated(xhr);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('Cloudinary response missing secure_url'));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Cloudinary'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Upload failed with status ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during image upload'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload cancelled by user'));
    };

    xhr.open('POST', url, true);
    xhr.send(formData);
  });
};

export const uploadVoiceToCloudinary = (audioBlob, chatId, onProgress, onXhrCreated) => {
  return new Promise((resolve, reject) => {
    if (!audioBlob) {
      reject(new Error('No audio recording provided for upload'));
      return;
    }

    const cloudName = 'bgrvouaj';
    const uploadPreset = 'Chatting_upload';
    const folder = 'Chatting/VoiceMessages';

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_message.webm');
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    if (onXhrCreated) {
      onXhrCreated(xhr);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('Cloudinary response missing secure_url'));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Cloudinary'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Upload failed with status ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during voice upload'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload cancelled by user'));
    };

    xhr.open('POST', url, true);
    xhr.send(formData);
  });
};

export const uploadDocumentToCloudinary = (file, chatId, onProgress, onXhrCreated) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided for upload'));
      return;
    }

    // 25MB file size limit
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      reject(new Error('Document size exceeds 25MB limit. Please choose a smaller file.'));
      return;
    }

    const cloudName = 'bgrvouaj';
    const uploadPreset = 'Chatting_upload';
    const folder = `chat_documents/${chatId}`;

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    if (onXhrCreated) {
      onXhrCreated(xhr);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.secure_url) {
            resolve(response.secure_url);
          } else {
            reject(new Error('Cloudinary response missing secure_url'));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Cloudinary'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error?.message || `Upload failed with status ${xhr.status}`));
        } catch (e) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during document upload'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload cancelled by user'));
    };

    xhr.open('POST', url, true);
    xhr.send(formData);
  });
};

// Upload profile image to Cloudinary
export const uploadProfileImageToCloudinary = async (file, userId) => {
  if (!file) {
    throw new Error('No profile image selected');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image');
  }

  const MAX_SIZE = 10 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    throw new Error('Profile image must be smaller than 10MB');
  }

  if (!userId) {
    throw new Error('User ID is required');
  }

  const cloudName = 'bgrvouaj';
  const uploadPreset = 'Chatting_upload';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', `profile_images/${userId}`);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Profile image upload failed');
  }

  return result.secure_url;
};

