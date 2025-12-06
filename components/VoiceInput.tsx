import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onAudioCaptured: (blob: Blob) => void;
  disabled: boolean;
  isProcessing: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onAudioCaptured, disabled, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      // Visualizer setup
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
      source.connect(analyserRef.current);

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onAudioCaptured(blob);
        // Cleanup visualizer
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      drawVisualizer();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyserRef.current!.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Simple circular pulse effect
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const radius = 20 + (average / 5); // Base radius + volume modulation

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.2)'; // Orange-ish
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(234, 88, 12, 0.5)';
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };
    render();
  };

  return (
    <div className="relative flex items-center justify-center">
      {isRecording && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-white p-2 rounded-full shadow-lg border border-stone-100 z-10">
            <canvas ref={canvasRef} width={100} height={100} className="w-16 h-16 rounded-full" />
        </div>
      )}

      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={`
          w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all
          ${isRecording 
            ? 'bg-red-500 text-white hover:bg-red-600 scale-110' 
            : 'bg-stone-800 text-stone-50 hover:bg-stone-700'
          }
          ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" size={24} />
        ) : isRecording ? (
          <Square size={24} fill="currentColor" />
        ) : (
          <Mic size={24} />
        )}
      </button>
    </div>
  );
};
