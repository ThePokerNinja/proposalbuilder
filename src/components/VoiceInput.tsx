import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, RemoteParticipant, LocalAudioTrack, RemoteAudioTrack, Track, createLocalAudioTrack, DisconnectReason, ConnectionQuality } from 'livekit-client';
import { X } from 'lucide-react';

interface VoiceInputProps {
  onFormDataUpdate: (data: {
    jobTitle?: string;
    projectCategory?: string;
    projectPriority?: 'urgent' | 'within-month' | 'no-rush';
    projectName?: string;
    projectSummary?: string;
  }) => void;
  onQuestionAnswer?: (questionId: string, value: string | string[] | number) => void;
  onFocusField?: (fieldIndex: number) => void;
  onFocusQuestion?: (questionId: string) => void;
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  onConnectionStateChange?: (state: { isConnected: boolean; isConnecting: boolean; isListening: boolean }) => void;
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
      allIds?: string[];
      allTexts?: { id: string; text: string }[];
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

interface QuestionAnswerMessage {
  type: 'question_answer';
  data: {
    questionId: string;
    value: string | string[] | number;
  };
}

interface FocusMessage {
  type: 'focus';
  data: {
    field?: 'jobTitle' | 'projectCategory' | 'projectPriority' | 'projectName' | 'projectSummary';
    questionId?: string;
  };
}

type AgentMessage = FormDataMessage | TranscriptMessage | QuestionAnswerMessage | FocusMessage;

export function VoiceInput({ onFormDataUpdate, onQuestionAnswer, onFocusField, onFocusQuestion, onTranscript, onError, agentContext, onConnectionStateChange }: VoiceInputProps) {
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
  const [_agentAudioTrack, setAgentAudioTrack] = useState<RemoteAudioTrack | null>(null);
  const [agentEnergy] = useState(0);
  const [, setIsAgentActive] = useState(false);
  const agentActivityTimeoutRef = useRef<number | null>(null);
  const [imageReloadKey, setImageReloadKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Function to reload the agent-orb.gif image
  const reloadAgentOrb = useCallback(() => {
    setImageReloadKey(prev => prev + 1);
  }, []);

  // Expose reload function to window for manual reloading
  useEffect(() => {
    (window as any).__reloadAgentOrb = reloadAgentOrb;
    return () => {
      delete (window as any).__reloadAgentOrb;
    };
  }, [reloadAgentOrb]);

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
    
    // Only send if room is connected and local participant is ready
    if (roomRef.current.state !== 'connected' || !roomRef.current.localParticipant) {
      console.log('Room not ready for context publishing, will retry after connection');
      return;
    }

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

      // Don't send context here - wait until room is connected

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

          // Handle question answer updates from agent
          if ((parsed as AgentMessage).type === 'question_answer') {
            const msg = parsed as QuestionAnswerMessage;
            if (onQuestionAnswer) {
              onQuestionAnswer(msg.data.questionId, msg.data.value);
            }
            console.log('Question answered:', msg.data.questionId, msg.data.value);
            return;
          }

          // Handle focus messages from agent (which field/question to highlight)
          if ((parsed as AgentMessage).type === 'focus') {
            const msg = parsed as FocusMessage;
            if (msg.data.field && onFocusField) {
              // Map field names to indices: 0=jobTitle, 1=projectCategory, 2=projectPriority, 3=projectName, 4=projectSummary
              const fieldMap: Record<string, number> = {
                'jobTitle': 0,
                'projectCategory': 1,
                'projectPriority': 2,
                'projectName': 3,
                'projectSummary': 4,
              };
              const fieldIndex = fieldMap[msg.data.field];
              if (fieldIndex !== undefined) {
                onFocusField(fieldIndex);
              }
            }
            if (msg.data.questionId && onFocusQuestion) {
              onFocusQuestion(msg.data.questionId);
            }
            console.log('Agent focusing on:', msg.data);
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
        markAgentActive();
      });

      // Listen for participant disconnection
      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Agent disconnected:', participant.identity);
        // Clean up tracks from this participant
        participant.trackPublications.forEach((pub) => {
          if (pub.track) {
            pub.track.detach();
            if (pub.trackSid) {
              remoteAudioTracksRef.current.delete(pub.trackSid);
            }
          }
        });
        setAgentAudioTrack(null);
      });

      // Handle disconnection events
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log('LiveKit room disconnected, reason:', reason);
        console.log('Disconnect details:', { 
          reason, 
          wasConnected: isConnected, 
          wasListening: isListening,
          roomState: room.state 
        });
        
        // Update state when room disconnects (could be server-side, network, or error)
        setIsConnected(false);
        setIsListening(false);
        setIsConnecting(false);
        setAgentAudioTrack(null);
        // Notify parent of connection state change
        if (onConnectionStateChange) {
          onConnectionStateChange({ isConnected: false, isConnecting: false, isListening: false });
        }
        
        // Clean up audio tracks
        remoteAudioTracksRef.current.forEach((track) => {
          track.detach();
        });
        remoteAudioTracksRef.current.clear();
        
        // Clean up audio element
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.srcObject = null;
          if (audioElementRef.current.parentNode) {
            audioElementRef.current.parentNode.removeChild(audioElementRef.current);
          }
          audioElementRef.current = null;
        }
        
        // Show error if it was an unexpected disconnect (not user-initiated)
        if (reason && reason !== DisconnectReason.CLIENT_INITIATED) {
          const reasonText = typeof reason === 'string' ? reason : JSON.stringify(reason);
          setError(`Connection lost: ${reasonText}. The agent may have encountered an error. Please try connecting again.`);
        }
      });
      
      // Listen for room errors
      room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
        console.log('Room metadata changed:', metadata);
      });
      
      // Listen for connection quality changes (might indicate issues)
      room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (participant && participant !== room.localParticipant) {
          console.log('Agent connection quality:', quality, participant.identity);
          if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) {
            console.warn('Agent connection quality is poor, connection may be unstable');
          }
        }
      });

      // Listen for remote tracks (agent's audio)
      room.on(RoomEvent.TrackSubscribed, async (track) => {
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
            audioElementRef.current.setAttribute('playsinline', 'true');
            audioElementRef.current.setAttribute('preload', 'auto');
            document.body.appendChild(audioElementRef.current);
          }
          
          // Attach track to audio element
          track.attach(audioElementRef.current);
          
          // Ensure audio plays (browsers may block autoplay)
          try {
            if (audioElementRef.current.paused) {
              await audioElementRef.current.play();
              console.log('Agent audio playback started');
            }
          } catch (err) {
            console.warn('Audio autoplay blocked, user interaction required:', err);
            // Try to play on next user interaction
            const playOnInteraction = async () => {
              try {
                if (audioElementRef.current && audioElementRef.current.paused) {
                  await audioElementRef.current.play();
                  console.log('Agent audio playback started after user interaction');
                }
              } catch (e) {
                console.error('Failed to play audio after interaction:', e);
              }
              document.removeEventListener('click', playOnInteraction);
              document.removeEventListener('touchstart', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction, { once: true });
            document.addEventListener('touchstart', playOnInteraction, { once: true });
          }
          
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
      console.log('Connecting to LiveKit room...');
      await room.connect(url, token);
      console.log('Successfully connected to LiveKit room');
      setIsConnected(true);
      setIsConnecting(false);

      // Send initial context now that room is connected
      if (agentContext) {
        // Small delay to ensure connection is fully established
        setTimeout(() => {
          sendAgentContext(agentContext);
        }, 100);
      }

      // Enable microphone
      console.log('Starting microphone...');
      await startListening();
      console.log('Microphone started, ready for conversation');
    } catch (err) {
      console.error('Error connecting to LiveKit:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to voice service';
      setError(errorMessage);
      setIsConnecting(false);
      setIsConnected(false);
      
      // Clean up on connection failure
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
        } catch (disconnectErr) {
          console.warn('Error disconnecting after failed connection:', disconnectErr);
        }
        roomRef.current = null;
      }
      
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
    console.log('=== handleToggleConnection CALLED ===', { 
      isConnected, 
      isConnecting, 
      isDisconnecting, 
      roomState: roomRef.current?.state,
      connectToRoomExists: typeof connectToRoom === 'function'
    });

    // Only prevent if actively connecting or disconnecting
    if (isConnecting || isDisconnecting) {
      console.log('Blocked: already connecting or disconnecting');
      return;
    }

    // If connected, allow disconnect
    if (isConnected) {
      console.log('Disconnecting...');
      try {
        await disconnect();
        console.log('Disconnected successfully');
      } catch (err) {
        console.error('Error in disconnect:', err);
      }
      return;
    }

    // Otherwise, connect
    console.log('Connecting...');
    if (typeof connectToRoom !== 'function') {
      console.error('connectToRoom is not a function!', connectToRoom);
      alert('Connection function not available. Please refresh the page.');
      return;
    }
    try {
      setIsConnecting(true);
      console.log('Calling connectToRoom...');
      await connectToRoom();
      console.log('Connection successful!');
    } catch (err) {
      console.error('Error in connect:', err);
      setIsConnecting(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Connection error details:', errorMsg);
      alert(`Failed to connect: ${errorMsg}`);
    }
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
  // const isAgentSpeaking = isConnected && agentAudioTrack !== null; // Reserved for future use
  
  // Determine agent state: speaking (has audio track) vs listening (connected but not speaking)
  // const isAgentSpeaking = isConnected && agentAudioTrack !== null; // Reserved for future use
  
  // Keep a subtle scale effect when connected.
  const popScale = isConnected ? 1 + agentEnergy * 0.4 : 1;
  
  // Expose connection state to parent for status display
  // Use refs to track previous values and only update when they actually change
  const prevStateRef = useRef({ isConnected, isConnecting, isListening });
  useEffect(() => {
    const prevState = prevStateRef.current;
    const hasChanged = 
      prevState.isConnected !== isConnected ||
      prevState.isConnecting !== isConnecting ||
      prevState.isListening !== isListening;
    
    if (hasChanged && onConnectionStateChange) {
      prevStateRef.current = { isConnected, isConnecting, isListening };
      onConnectionStateChange({ 
        isConnected, 
        isConnecting, 
        isListening 
      });
    }
  }, [isConnected, isConnecting, isListening, onConnectionStateChange]);

  // Mark functions as used to avoid TypeScript errors (kept for potential future use)
  void stopListening;
  void disconnect;

  return (
    <div className="relative z-[100] w-full flex justify-center">
      <button
        type="button"
        className="relative w-80 h-80 flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-150 border-0 bg-transparent p-0"
        style={{ transform: `scale(${popScale})` }}
        onClick={(e) => {
          console.log('=== CLICK DETECTED ON AGENT ORB ===', { 
            isConnected, 
            isConnecting, 
            isDisconnecting,
            target: e.target,
            currentTarget: e.currentTarget,
            handleToggleConnectionType: typeof handleToggleConnection
          });
          e.preventDefault();
          e.stopPropagation();
          console.log('Calling handleToggleConnection...');
          if (typeof handleToggleConnection === 'function') {
            handleToggleConnection();
          } else {
            console.error('handleToggleConnection is not a function!', handleToggleConnection);
          }
        }}
        onMouseEnter={() => {
          console.log('Mouse enter on agent orb');
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          console.log('Mouse leave on agent orb');
          setIsHovered(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleConnection();
          }
        }}
        aria-label="Connect to voice agent"
      >
        {/* Dramatic white light hover effect behind agent - glow only, no ring */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
          <div
            className={`w-56 h-56 rounded-full bg-white blur-3xl transition-all duration-500 ${
              isHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-95'
            }`}
            style={{
              boxShadow: isHovered 
                ? '0 0 80px rgba(255,255,255,0.95), 0 0 140px rgba(255,255,255,0.8), 0 0 200px rgba(255,255,255,0.6)'
                : 'none',
            }}
          />
        </div>

        {/* Visualizer – ALWAYS show the provided agent GIF inside a circular mask */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-40 h-40 rounded-full overflow-hidden pointer-events-none">
            <img
              key={imageReloadKey}
              src={`${import.meta.env.BASE_URL}assets/agent-orb2.gif${imageReloadKey > 0 ? `?v=${imageReloadKey}` : ''}`}
              alt="Agent active animation"
              className="w-full h-full object-cover transform scale-[1.5] pointer-events-none"
              draggable={false}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
              onError={() => {
                // Force reload on error
                setImageReloadKey(prev => prev + 1);
              }}
            />
          </div>
        </div>

        {/* Logo centered on top of sphere / black hole – no radial ring or white border */}
        <img
          src={`${import.meta.env.BASE_URL}assets/logo.png`}
          alt="Logo"
          className="relative z-20 h-40 w-40 object-contain pointer-events-none"
          draggable={false}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Connection Status Indicator */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-0.5 pointer-events-none">
          {isConnecting && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/90 backdrop-blur-sm rounded-full text-white text-xs font-medium shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Connecting...</span>
            </div>
          )}
          {isConnected && !isConnecting && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm rounded-full text-white text-xs font-medium shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Connected</span>
            </div>
          )}
        </div>

        {/* No visible button – entire sphere is the click target */}
      </button>
    </div>
  );
}
