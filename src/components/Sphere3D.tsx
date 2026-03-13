import { useEffect, useRef, useState } from 'react';
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';

interface Sphere3DProps {
  audioTrack?: LocalAudioTrack | RemoteAudioTrack | null;
  isActive: boolean;
  color: 'blue' | 'yellow';
  onEnergyChange?: (value: number) => void;
}

export function Sphere3D({ audioTrack, isActive, color, onEnergyChange }: Sphere3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [volume, setVolume] = useState(0);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!audioTrack || !canvasRef.current) {
      setVolume(0);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
        if (onEnergyChange) onEnergyChange(0);
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const energy = average / 255;
      setVolume(energy);
      if (onEnergyChange) onEnergyChange(energy);

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [audioTrack, isActive, onEnergyChange]);

  const baseColor = color === 'yellow' ? '#FFD700' : '#3b82f6';
  const glowColor = color === 'yellow' ? '#FFC700' : '#60a5fa';
  // Make intensity react more strongly to voice energy
  const intensity = isActive ? 0.3 + volume * 0.9 : 0.2;

  // Animate rotation continuously
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      const speed = isActive && volume > 0.1 ? 0.02 + (volume * 0.03) : 0.01;
      rotationRef.current.y += speed;
      rotationRef.current.x += speed * 0.5;
      setRotation({ x: rotationRef.current.x, y: rotationRef.current.y });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isActive, volume]);

  // Animate internal wave phase for continuous motion
  useEffect(() => {
    let id: number;
    const loop = () => {
      setPhase((p) => p + 0.12);
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: '1000px' }}>
      <div 
        className="relative w-40 h-40"
        style={{
          transform: `rotateY(${rotation.y * 57.3}deg) rotateX(${rotation.x * 57.3}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Outer glow sphere */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${glowColor}40, ${baseColor}20, transparent 70%)`,
            boxShadow: `
              0 0 ${30 * intensity}px ${baseColor}80,
              0 0 ${60 * intensity}px ${baseColor}60,
              0 0 ${90 * intensity}px ${baseColor}40,
              inset 0 0 ${40 * intensity}px ${glowColor}60
            `,
            animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none',
            filter: `blur(${2 * intensity}px)`
          }}
        />
        
        {/* Main sphere with 3D effect */}
        <div 
          className="absolute inset-2 rounded-full"
          style={{
            background: `radial-gradient(circle at ${30 + volume * 25}% ${30 + volume * 25}%, ${glowColor}, ${baseColor}, ${baseColor}80)`,
            boxShadow: `
              0 0 ${20 * intensity}px ${baseColor},
              0 0 ${40 * intensity}px ${baseColor}80,
              inset -20px -20px 40px ${baseColor}40,
              inset 20px 20px 40px ${glowColor}60
            `,
            // Stronger breathing/pulsing with voice
            transform: `scale(${1 + volume * 0.35})`,
            transition: 'transform 0.1s ease-out'
          }}
        />
        
        {/* Inner core highlight */}
        <div 
          className="absolute inset-6 rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${glowColor}CC, ${baseColor}80)`,
            boxShadow: `inset 0 0 ${30 * intensity}px ${glowColor}`,
            opacity: intensity * 0.9
          }}
        />

        {/* Wave ribbon band – inspired by reference visual */}
        <div className="absolute inset-8" style={{ transform: 'rotateX(65deg)' }}>
          <div
            className="absolute left-1/2 top-1/2 w-full h-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${glowColor}, #a5f3fc, ${glowColor})`,
              filter: 'blur(10px)',
              opacity: 0.35 + volume * 0.65,
              transform: `translateY(${Math.sin(phase) * 10}px) scaleY(${0.7 + volume * 0.9})`,
              boxShadow: `0 0 ${22 * intensity}px ${glowColor}`,
            }}
          />
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.7; 
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.08);
            filter: brightness(1.3);
          }
        }
      `}</style>
    </div>
  );
}
