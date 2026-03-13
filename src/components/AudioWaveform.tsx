import { useEffect, useRef, useState } from 'react';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

interface AudioWaveformProps {
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | null;
  isActive: boolean;
  color?: string;
}

export function AudioWaveform({ audioTrack, isActive, color = '#3b82f6' }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [volume, setVolume] = useState(0);

  useEffect(() => {
    if (!audioTrack || !canvasRef.current) {
      setVolume(0);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get audio stream from track
    const stream = audioTrack.mediaStream;
    if (!stream) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive || !analyserRef.current) {
        setVolume(0);
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      setVolume(average / 255);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform bars
      const barCount = 20;
      const barWidth = canvas.width / barCount;
      const barSpacing = 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.8;
        
        const x = i * (barWidth + barSpacing);
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}80`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - barSpacing, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [audioTrack, isActive, color]);

  // Update canvas size
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = 200;
      canvasRef.current.height = 40;
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-10"
      style={{ opacity: isActive ? 1 : 0.3 }}
    />
  );
}
