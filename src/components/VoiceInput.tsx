import { useState, useEffect, useRef } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalAudioTrack, RemoteAudioTrack, Track, createLocalAudioTrack } from 'livekit-client';
import { X } from 'lucide-react';

interface VoiceInputProps {
  onFormDataUpdate: (data: {
    jobTitle?: string;
    projectCategory?: string;
    projectPriority?: 'urgent' | 'within-month' | 'no-rush';
    projectName?: string;
    projectSummary?: string;
  }) => void;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  // High-level UI + proposal context so the agent can act as a senior guide
  agentContext?: {
    flowStep: 'intro' | 'research' | 'questions';
    pageTitle: string;
    projectName: string;
    projectSummary: string;
    jobTitle: string;
    projectCategory: string;
    projectPriority: 'urgent' | 'within-month' | 'no-rush' | '';
    questions: {
      total: number;
      currentIndex: number;
      currentId: string | null;
      currentText: string | null;
    };
    answersSummary: {
      id: string;
      value: string | string[] | number | boolean;
    }[];
    estimateSummary: {
      totalHours: number;
      timelineWeeks: number;
    } | null;
    showEstimate: boolean;
  };
}

interface FormDataMessage {
  type: 'form_data';
  data: {
    jobTitle?: string;
    projectCategory?: string;
    projectPriority?: 'urgent' | 'within-month' | 'no-rush';
    projectName?: string;
    projectSummary?: string;
  };
}

interface TranscriptMessage {
  type: 'transcript';
  text: string;
  isFinal: boolean;
}

type AgentMessage = FormDataMessage | TranscriptMessage;

export function VoiceInput({ onFormDataUpdate, onTranscript, onError, agentContext }: VoiceInputProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localAudioTrackRef = useRef<LocalAudioTrack | null>(null);
  const remoteAudioTracksRef = useRef<Map<string, RemoteAudioTrack>>(new Map());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [agentAudioTrack, setAgentAudioTrack] = useState<RemoteAudioTrack | null>(null);
  const [agentEnergy] = useState(0);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const agentActivityTimeoutRef = useRef<number | null>(null);

  // Mark the agent as visually active for a short window; refreshed on each event
  const markAgentActive = () => {
    setIsAgentActive(true);
    if (agentActivityTimeoutRef.current !== null) {
      window.clearTimeout(agentActivityTimeoutRef.current);
    }
    agentActivityTimeoutRef.current = window.setTimeout(() => {
      setIsAgentActive(false);
      agentActivityTimeoutRef.current = null;
    }, 1500);
  };

  // Helper: send structured UI/proposal context to the agent so it always
  // knows where the user is and what they are looking at.
  const sendAgentContext = (context: VoiceInputProps['agentContext']) => {
    if (!roomRef.current || !context) return;

    try {
      const payload = {
        type: 'ui_context',
        context,
      };
      const encoded = new TextEncoder().encode(JSON.stringify(payload));
      // Default is reliable delivery; no need to pass kind explicitly
      roomRef.current.localParticipant.publishData(encoded).catch((err) => {
        console.error('Failed to publish context to agent:', err);
      });
    } catch (err) {
      console.error('Error serializing context for agent:', err);
    }
  };

  // Connect to LiveKit room
  const connectToRoom = async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get access token from backend
      // Vite proxy handles /api in development, or use full URL in production
      const tokenResponse = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: `proposal-builder-${Date.now()}`,
          participantName: 'user',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get LiveKit token. Make sure your backend is running.');
      }

      const responseData = await tokenResponse.json();
      const token = responseData.token as string;
      const url = responseData.url as string;

      // Validate token and url
      if (!token) {
        throw new Error('Invalid token received from server');
      }
      if (!url) {
        throw new Error('Invalid URL received from server');
      }

      // Create room and connect
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // As soon as we have a room, send initial context so the agent
      // understands what page/step the user is on.
      if (agentContext) {
        sendAgentContext(agentContext);
      }

      // Listen for data messages from agent (transcripts + structured form data)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        const raw = new TextDecoder().decode(payload);

        try {
          const parsed = JSON.parse(raw) as AgentMessage | Record<string, unknown>;

          // Handle structured form data from agent
          if ((parsed as AgentMessage).type === 'form_data') {
            const msg = parsed as FormDataMessage;
            onFormDataUpdate(msg.data);
            if (msg.data.projectName || msg.data.projectSummary) {
              setTranscript('');
            }
            return;
          }

          // Handle explicit transcript messages
          if ((parsed as AgentMessage).type === 'transcript') {
            const msg = parsed as TranscriptMessage;
            setTranscript(msg.text);
            markAgentActive();
            if (onTranscript) {
              onTranscript(msg.text);
            }
            return;
          }

          // Fallback: try to extract any reasonable text field from arbitrary payloads
          const anyMsg = parsed as Record<string, unknown>;
          const candidateText =
            (typeof anyMsg.text === 'string' && anyMsg.text) ||
            (typeof anyMsg.message === 'string' && anyMsg.message) ||
            (typeof anyMsg.content === 'string' && anyMsg.content);

          if (candidateText) {
            setTranscript(candidateText);
            markAgentActive();
            if (onTranscript) {
              onTranscript(candidateText);
            }
            return;
          }
        } catch {
          // Not JSON – treat raw string as transcript
          const text = raw.trim();
          if (text) {
            setTranscript(text);
            markAgentActive();
            if (onTranscript) {
              onTranscript(text);
            }
          }
        }
      });

      // Listen for remote participants (the agent)
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Agent connected:', participant.identity);
      });

      // Log disconnect reasons
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('LiveKit room disconnected, reason:', reason);
      });

      // Listen for remote tracks (agent's audio)
      room.on(RoomEvent.TrackSubscribed, (track) => {
        console.log('Track subscribed:', track.kind);

        if (track.kind === Track.Kind.Audio && track instanceof RemoteAudioTrack) {
          // Store the track
          if (track.sid) {
            remoteAudioTracksRef.current.set(track.sid, track);
          }
          setAgentAudioTrack(track); // Update state for waveform
          markAgentActive();
          
          // Create or get audio element
          if (!audioElementRef.current) {
            audioElementRef.current = document.createElement('audio');
            audioElementRef.current.autoplay = true;
            document.body.appendChild(audioElementRef.current);
          }
          
          // Attach track to audio element
          track.attach(audioElementRef.current);
          console.log('Agent audio track attached to audio element');
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach();
          if (track.sid) {
            remoteAudioTracksRef.current.delete(track.sid);
          }
          setAgentAudioTrack(null);
          console.log('Agent audio track unsubscribed');
        }
      });

      // Connect to room
      await room.connect(url, token);
      setIsConnected(true);
      setIsConnecting(false);

      // Enable microphone
      await startListening();
    } catch (err) {
      console.error('Error connecting to LiveKit:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to voice service';
      setError(errorMessage);
      setIsConnecting(false);
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage));
      }
    }
  };

  // Whenever high-level UI/proposal context changes while connected,
  // push an updated snapshot to the agent so it can guide the user.
  useEffect(() => {
    if (!isConnected || !agentContext) return;
    sendAgentContext(agentContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, JSON.stringify(agentContext)]);

  // Start listening (enable microphone)
  const startListening = async () => {
    if (!roomRef.current || isListening) return;

    try {
      // Create local audio track directly
          const localTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      localAudioTrackRef.current = localTrack as LocalAudioTrack;
      await roomRef.current.localParticipant.publishTrack(localAudioTrackRef.current);
      setIsListening(true);
    } catch (err) {
      console.error('Error starting microphone:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Provide more helpful error message
      if (errorMessage.includes('denied') || errorMessage.includes('permission') || errorMessage.includes('NotAllowedError')) {
        setError('Microphone access denied. Click the lock/microphone icon in your browser\'s address bar and allow microphone access, then refresh the page.');
      } else {
        setError(`Microphone error: ${errorMessage}. Please check your microphone settings and try again.`);
      }
      
      if (onError) {
        onError(err instanceof Error ? err : new Error('Microphone access denied'));
      }
    }
  };

  // Stop listening (kept for potential future use)
  const stopListening = async () => {
    if (localAudioTrackRef.current && roomRef.current) {
      localAudioTrackRef.current.stop();
      await roomRef.current.localParticipant.unpublishTrack(localAudioTrackRef.current);
      localAudioTrackRef.current = null;
      setIsListening(false);
    }
  };

  // Disconnect from room (kept for potential future use)
  const disconnect = async () => {
    console.log('Disconnect called, current state:', { isConnected, isListening, roomExists: !!roomRef.current });
    
    // Prevent multiple disconnect calls
    if (isDisconnecting) {
      console.log('Already disconnecting, skipping...');
      return;
    }
    
    setIsDisconnecting(true);
    
    try {
      // Detach and cleanup remote audio tracks
      remoteAudioTracksRef.current.forEach((track) => {
        track.detach();
      });
      remoteAudioTracksRef.current.clear();
      
      // Remove audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
        if (audioElementRef.current.parentNode) {
          audioElementRef.current.parentNode.removeChild(audioElementRef.current);
        }
        audioElementRef.current = null;
      }
      
      // Stop listening first
      if (localAudioTrackRef.current) {
        try {
          localAudioTrackRef.current.stop();
          if (roomRef.current) {
            await roomRef.current.localParticipant.unpublishTrack(localAudioTrackRef.current);
          }
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
        localAudioTrackRef.current = null;
      }
      
      // Disconnect from room
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
          console.log('Room disconnected successfully');
        } catch (e) {
          console.warn('Error disconnecting room:', e);
        }
        roomRef.current = null;
      }
    } catch (e) {
      console.error('Error during disconnect:', e);
    } finally {
      // Always reset state, even if errors occurred
      setIsConnected(false);
      setIsListening(false);
      setIsConnecting(false);
      setTranscript('');
      setError(null);
      setIsDisconnecting(false);
      setAgentAudioTrack(null);
      console.log('Disconnect complete, state reset');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup audio tracks
      remoteAudioTracksRef.current.forEach((track) => {
        track.detach();
      });
      remoteAudioTracksRef.current.clear();
      
      // Remove audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
        if (audioElementRef.current.parentNode) {
          audioElementRef.current.parentNode.removeChild(audioElementRef.current);
        }
        audioElementRef.current = null;
      }

      // Clear any pending agent activity timeout
      if (agentActivityTimeoutRef.current !== null) {
        window.clearTimeout(agentActivityTimeoutRef.current);
      }
    };
  }, []);

  // Connect on click (one-way; disconnect handled elsewhere if needed)
  const handleToggleConnection = async () => {
    console.log('Button clicked, current state:', { isConnected, isConnecting, isDisconnecting });

    if (isConnected || isConnecting || isDisconnecting) {
      return;
    }

    connectToRoom().catch((err) => {
      console.error('Error in connect:', err);
    });
  };

  if (error) {
    return (
      <div className="relative z-50 max-w-sm mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1">Connection Error</h3>
              <p className="text-xs text-red-700">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  connectToRoom();
                }}
                className="mt-2 text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine agent state: speaking (has audio track) vs listening (connected but not speaking)
  const isAgentSpeaking = isConnected && agentAudioTrack !== null;
  
  // Keep a subtle scale effect when connected.
  const popScale = isConnected ? 1 + agentEnergy * 0.4 : 1;

  // Mark functions as used to avoid TypeScript errors (kept for potential future use)
  void stopListening;
  void disconnect;

  return (
    <div className="relative z-50 w-full flex justify-center group pointer-events-auto">
      {/* Dramatic white light hover effect behind agent */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
        <div
          className="w-56 h-56 rounded-full bg-white blur-3xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
          style={{
            boxShadow: '0 0 80px rgba(255,255,255,0.95), 0 0 140px rgba(255,255,255,0.8), 0 0 200px rgba(255,255,255,0.6)',
          }}
        />
      </div>
      <div
        className="relative z-10 p-0 w-80 h-80 flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-150 pointer-events-auto bg-transparent border-none shadow-none"
        style={{ transform: `scale(${popScale})` }}
        onClick={() => {
          if (isConnecting || isDisconnecting) return;
          handleToggleConnection();
        }}
      >

        {/* Visualizer – ALWAYS show the provided agent GIF inside a circular mask */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`relative w-40 h-40 rounded-full overflow-hidden ${
              isConnected && isAgentActive
                ? isAgentSpeaking
                  ? 'agent-pulse-fast agent-strobe-yellow'
                  : 'agent-pulse-fast agent-strobe-blue'
                : ''
            }`}
          >
            <img
              src={`${import.meta.env.BASE_URL}assets/agent-orb.gif`}
              alt="Agent active animation"
              className="w-full h-full object-cover transform scale-[1.5]"
            />
          </div>

          {/* Strobe + pulse animations for agent states */}
          <style>{`
            @keyframes strobeYellow {
              0%, 100% {
                box-shadow: 0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,255,0,0.6), 0 0 60px rgba(255,215,0,0.4);
              }
              50% {
                box-shadow: 0 0 50px rgba(255,215,0,1), 0 0 100px rgba(255,255,0,0.9), 0 0 150px rgba(255,215,0,0.7);
              }
            }
            @keyframes strobeBlue {
              0%, 100% {
                box-shadow: 0 0 20px rgba(59,130,246,0.8), 0 0 40px rgba(37,99,235,0.6), 0 0 60px rgba(59,130,246,0.4);
              }
              50% {
                box-shadow: 0 0 50px rgba(59,130,246,1), 0 0 100px rgba(37,99,235,0.9), 0 0 150px rgba(59,130,246,0.7);
              }
            }
            .agent-strobe-yellow {
              animation: strobeYellow 0.6s ease-in-out infinite;
            }
            .agent-strobe-blue {
              animation: strobeBlue 0.6s ease-in-out infinite;
            }
            @keyframes pulseFast {
              0% {
                transform: scale(0.9);
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(0.9);
              }
            }
            .agent-pulse-fast {
              animation: pulseFast 0.25s ease-in-out infinite;
            }
          `}</style>
        </div>

        {/* Logo centered on top of sphere / black hole – no radial ring or white border */}
        <img
          src={`${import.meta.env.BASE_URL}assets/logo.png`}
          alt="Logo"
          className="relative h-40 w-40 object-contain pointer-events-none"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* No visible button – entire sphere is the click target */}
      </div>
    </div>
  );
}
