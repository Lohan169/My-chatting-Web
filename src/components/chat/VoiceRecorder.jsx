import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, Loader2 } from 'lucide-react';

export default function VoiceRecorder({ onSendVoice, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const mediaStreamRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const xhrRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  const startRecording = async () => {
    setError('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);

    } catch (err) {
      console.error('Failed to access microphone:', err);
      setError('Microphone access denied or unsupported browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleCancel = () => {
    cleanupResources();
    if (onCancel) onCancel();
  };

  const togglePreviewPlay = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob || isUploading) return;

    const durationMs = recordingTime * 1000;
    if (durationMs < 1000) {
      setError('Voice message is too short (min 1 second).');
      return;
    }

    try {
      setError('');
      setIsUploading(true);
      setUploadProgress(0);

      await onSendVoice(
        audioBlob,
        durationMs,
        (progress) => setUploadProgress(progress),
        (xhr) => { xhrRef.current = xhr; }
      );

      handleCancel();
    } catch (err) {
      console.error('Failed to send voice message:', err);
      if (err.message !== 'Upload cancelled by user') {
        setError(err.message || 'Failed to send voice message');
      }
    } finally {
      setIsUploading(false);
      xhrRef.current = null;
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-3">
      {error ? (
        <div className="flex-1 flex items-center justify-between text-xs text-[#EF4444]">
          <span>{error}</span>
          <button onClick={handleCancel} className="underline text-[#64748B] hover:text-[#0F172A]">Close</button>
        </div>
      ) : !isRecording && !audioBlob ? (
        <div className="flex-1 flex items-center justify-between">
          <span className="text-xs text-[#64748B]">Ready to record voice note...</span>
          <button
            type="button"
            onClick={startRecording}
            className="px-3.5 py-1.5 rounded-full bg-[#4752C4] hover:bg-[#3B44A1] text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
          >
            <Mic className="w-4 h-4 animate-pulse text-[#EF4444]" />
            <span>Start Recording</span>
          </button>
        </div>
      ) : isRecording ? (
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF4444]"></span>
            </span>
            <span className="text-xs font-mono font-bold text-[#EF4444]">
              Recording... {formatTimer(recordingTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 rounded-full text-[#64748B] hover:text-[#EF4444] hover:bg-[#F1F5F9] transition"
              title="Discard Recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-1.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      ) : (
        /* Recorded Preview State */
        <div className="flex-1 flex items-center justify-between gap-3">
          {audioUrl && (
            <audio
              ref={audioPreviewRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
              className="hidden"
            />
          )}

          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="w-8 h-8 rounded-full bg-[#5865F2] text-white flex items-center justify-center shrink-0 shadow-md"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div>
              <p className="text-xs font-semibold text-[#0F172A]">
                Voice Note ({formatTimer(recordingTime)})
              </p>
              {isUploading && (
                <div className="w-28 bg-[#E2E8F0] rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-[#5865F2] h-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isUploading}
              className="p-2 rounded-full text-[#64748B] hover:text-[#EF4444] hover:bg-[#F1F5F9] transition disabled:opacity-40"
              title="Discard"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isUploading}
              className="px-3.5 py-1.5 rounded-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#5865F2]/30 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isUploading ? 'Sending...' : 'Send Voice'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
