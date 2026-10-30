export const formatTime = (timeInMillis) => {
  if (!timeInMillis) return '';
  const date = new Date(timeInMillis);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatChatTime = (timeInMillis) => {
  if (!timeInMillis) return '';
  const now = new Date();
  const date = new Date(timeInMillis);

  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  if (isToday) {
    return formatTime(timeInMillis);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();

  if (isYesterday) {
    return 'Yesterday';
  }

  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: '2-digit' });
};

export const formatLastSeen = (timeInMillis) => {
  if (!timeInMillis) return 'Offline';
  const diff = Date.now() - timeInMillis;
  if (diff < 60000) {
    return 'Online / Just now';
  }
  const date = new Date(timeInMillis);
  const now = new Date();
  if (now.getDate() === date.getDate() && now.getMonth() === date.getMonth() && now.getFullYear() === date.getFullYear()) {
    return `Last seen today at ${formatTime(timeInMillis)}`;
  }
  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${formatTime(timeInMillis)}`;
};
