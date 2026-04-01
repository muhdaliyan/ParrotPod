import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, Loader2, Volume2, AlertCircle, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Room,
  RoomEvent,
  Track,
  LocalAudioTrack,
  createLocalAudioTrack,
  ConnectionState,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client';

interface VoiceTestModalProps {
  agentId: number;
  agentName: string;
  onClose: () => void;
}

type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'waiting_agent'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ended'
  | 'error';

const STATUS_LABELS: Record<SessionStatus, string> = {
  idle: 'Ready to connect',
  connecting: 'Connecting to LiveKit...',
  waiting_agent: 'Waiting for agent to join...',
  listening: 'Listening...',
  thinking: 'Agent is thinking...',
  speaking: 'Agent is speaking...',
  ended: 'Session ended',
  error: 'Connection failed',
};

const STATUS_COLORS: Record<SessionStatus, string> = {
  idle: 'text-on-surface-variant',
  connecting: 'text-secondary',
  waiting_agent: 'text-secondary',
  listening: 'text-green-600',
  thinking: 'text-primary',
  speaking: 'text-primary',
  ended: 'text-on-surface-variant',
  error: 'text-error',
};

export default function VoiceTestModal({ agentId, agentName, onClose }: VoiceTestModalProps) {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState<{ role: 'user' | 'agent'; text: string }[]>([]);

  const roomRef = useRef<Room | null>(null);
  const localTrackRef = useRef<LocalAudioTrack | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAnimRef = useRef<number>(0);
  const agentAnimRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const ringGainRef = useRef<GainNode | null>(null);   // master ring gain — set to 0 to silence instantly
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringingRef = useRef(false);

  // ── Traditional US Outgoing Ringback Tone ────────────────────────────────────
  // 440 Hz + 480 Hz for 2 seconds, 4 seconds off.
  const playRingTone = useCallback(() => {
    if (ringingRef.current) return;
    ringingRef.current = true;

    const ring = () => {
      if (!ringingRef.current) return;
      try {
        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;

        // Master gain — we hold a ref so we can silence it immediately
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.08, ctx.currentTime);
        master.connect(ctx.destination);
        ringGainRef.current = master;

        const start = ctx.currentTime;
        const end = start + 2.0; // 2 seconds ring

        const makeOsc = (freq: number) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          const envGain = ctx.createGain();
          envGain.gain.setValueAtTime(0, start);
          envGain.gain.linearRampToValueAtTime(1, start + 0.05); // soft attack
          envGain.gain.setValueAtTime(1, end - 0.05);
          envGain.gain.linearRampToValueAtTime(0, end);          // soft decay
          
          osc.connect(envGain);
          envGain.connect(master);
          osc.start(start);
          osc.stop(end + 0.1);
          return osc;
        };

        makeOsc(440);
        makeOsc(480);

        // Repeat every 6 seconds (2s ring + 4s silence)
        ringTimerRef.current = setTimeout(ring, 6000);
      } catch { /* AudioContext may not be ready */ }
    };

    ring();
  }, []);

  const stopRingTone = useCallback(() => {
    ringingRef.current = false;
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
    // Immediately silence any playing notes via the master gain
    if (ringGainRef.current && audioCtxRef.current) {
      try {
        const ctx = audioCtxRef.current;
        ringGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
        ringGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      } catch { /* ignore */ }
      ringGainRef.current = null;
    }
  }, []);

  // Smoothed bar values stored as refs to avoid React re-render overhead
  const micBarsRef = useRef<number[]>(Array(20).fill(0));
  const agentBarsRef = useRef<number[]>(Array(20).fill(0));
  const micSvgRef = useRef<SVGGElement | null>(null);
  const agentSvgRef = useRef<SVGGElement | null>(null);

  // Render directly to SVG DOM nodes for 60fps without React state updates
  const renderBarsToSvg = (svgGroup: SVGGElement | null, values: number[], color: string) => {
    if (!svgGroup) return;
    const rects = svgGroup.querySelectorAll('rect');
    rects.forEach((rect, i) => {
      const h = Math.max(2, values[i] * 48); // max 48px, centered in 56px container
      const y = (56 - h) / 2;
      rect.setAttribute('height', String(h));
      rect.setAttribute('y', String(y));
    });
  };

  const animateBars = useCallback(
    (analyser: AnalyserNode, barsRef: React.MutableRefObject<number[]>, svgRef: React.MutableRefObject<SVGGElement | null>, rafRef: React.MutableRefObject<number>, isMic: boolean = false) => {
      const SMOOTHING = 0.75;
      const N = 20;

      // Noise gate thresholds (out of 255)
      // Mic picks up more room static, so we set a higher gate to keep it flush when not speaking.
      const NOISE_GATE = isMic ? 12 : 2;

      const tick = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const usable = data.slice(0, Math.floor(data.length * 0.5));
        const bucketSize = Math.max(1, Math.floor(usable.length / N));

        for (let i = 0; i < N; i++) {
          const slice = usable.slice(i * bucketSize, (i + 1) * bucketSize);
          let rawAvg = slice.reduce((a, b) => a + b, 0) / slice.length;
          
          // 1. Noise gate: if average is below threshold, force to 0 to prevent flicker
          if (rawAvg < NOISE_GATE) {
            rawAvg = 0;
          }

          // 2. Normalize to 0.0 - 1.0 range based on remaining volume
          let raw = rawAvg / 255;

          // 3. Logarithmic boost for microphone so normal talking looks full, 
          //    but it never clips past 1.0
          if (isMic && raw > 0) {
            // formula to quickly jump from 0 to high values
            raw = Math.min(1.0, Math.pow(raw, 0.4) * 1.5);
          } else if (!isMic && raw > 0) {
            raw = Math.min(1.0, Math.pow(raw, 0.8) * 1.2);
          }

          barsRef.current[i] = barsRef.current[i] * SMOOTHING + raw * (1 - SMOOTHING);
        }
        renderBarsToSvg(svgRef.current, barsRef.current, '#000');
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    []
  );

  const stopAnimating = useCallback((rafRef: React.MutableRefObject<number>, barsRef: React.MutableRefObject<number[]>, svgRef: React.MutableRefObject<SVGGElement | null>) => {
    cancelAnimationFrame(rafRef.current);
    // Animate to zero smoothly
    let steps = 0;
    const decay = () => {
      barsRef.current = barsRef.current.map(v => v * 0.8);
      renderBarsToSvg(svgRef.current, barsRef.current, '#000');
      if (steps++ < 20) requestAnimationFrame(decay);
    };
    decay();
  }, []);

  // Idle breathing animation
  const idleAnimRef = useRef<number>(0);
  const startIdleAnim = useCallback((svgRef: React.MutableRefObject<SVGGElement | null>, barsRef: React.MutableRefObject<number[]>) => {
    let t = 0;
    const N = 20;
    const tick = () => {
      t += 0.03;
      for (let i = 0; i < N; i++) {
        barsRef.current[i] = 0.04 + 0.03 * Math.sin(t + i * 0.4);
      }
      renderBarsToSvg(svgRef.current, barsRef.current, '#000');
      idleAnimRef.current = requestAnimationFrame(tick);
    };
    idleAnimRef.current = requestAnimationFrame(tick);
  }, []);

  const stopIdleAnim = useCallback(() => {
    cancelAnimationFrame(idleAnimRef.current);
  }, []);

  // Wire a remote audio element and analyser to the agent's audio track
  const attachAgentAudio = useCallback(
    (publication: RemoteTrackPublication) => {
      if (publication.track?.kind !== Track.Kind.Audio) return;
      const mediaTrack = publication.track.mediaStreamTrack;
      if (!mediaTrack) return;

      const audioEl = publication.track.attach() as HTMLAudioElement;
      audioEl.autoplay = true;
      audioEl.volume = 1;
      document.body.appendChild(audioEl);

      try {
        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        const stream = new MediaStream([mediaTrack]);
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        agentAnalyserRef.current = analyser;
        stopIdleAnim();
        animateBars(analyser, agentBarsRef, agentSvgRef, agentAnimRef);
      } catch {
        // analyser optional
      }

      setStatus('speaking');
    },
    [animateBars]
  );

  const startSession = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');
    setTranscript([]);
    playRingTone();

    try {
      // 1. Get token from backend
      const res = await fetch(`http://localhost:8000/api/agents/${agentId}/token`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Backend error' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const { token, room_name, livekit_url, session_id } = await res.json();
      sessionIdRef.current = session_id ?? 0;
      sessionStartRef.current = Date.now();

      if (!livekit_url) throw new Error('LIVEKIT_URL not set in backend .env');

      // 2. Create Room
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      // 3. Room event listeners
      room.on(RoomEvent.Connected, () => {
        setStatus('waiting_agent');
        setTranscript([{ role: 'agent', text: `Connected to room. Waiting for ${agentName} agent worker to join...` }]);
      });

      room.on(RoomEvent.Disconnected, async () => {
        setStatus('ended');
        stopAnimating(micAnimRef, micBarsRef, micSvgRef);
        stopAnimating(agentAnimRef, agentBarsRef, agentSvgRef);
        // Record duration
        if (sessionIdRef.current && sessionStartRef.current) {
          const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
          fetch(`http://localhost:8000/api/sessions/${sessionIdRef.current}/end?duration=${duration}`, {
            method: 'PATCH',
          }).catch(() => {});
        }
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Reconnecting) setStatus('connecting');
      });

      // Remote participant (the agent) events
      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        stopRingTone();  // agent picked up!
        setStatus('listening');
        setTranscript(prev => [...prev, { role: 'agent', text: `${agentName} is ready. Start speaking!` }]);

        // Subscribe to their tracks
        participant.trackPublications.forEach((pub) => {
          if (pub.isSubscribed) attachAgentAudio(pub as RemoteTrackPublication);
        });
      });

      room.on(RoomEvent.TrackSubscribed, (_track, publication, _participant) => {
        stopRingTone();  // definitely stop now — audio is coming in
        attachAgentAudio(publication as RemoteTrackPublication);
        setStatus('speaking');
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        stopAnimating(agentAnimRef, agentBarsRef, agentSvgRef);
        startIdleAnim(agentSvgRef, agentBarsRef);
        setStatus('listening');
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const isAgentSpeaking = speakers.some(s => s.isAgent || s.identity !== room.localParticipant.identity);
        const isUserSpeaking = speakers.some(s => s.identity === room.localParticipant.identity);

        if (isAgentSpeaking) setStatus('speaking');
        else if (isUserSpeaking) setStatus('listening');
        else if (room.state === ConnectionState.Connected) setStatus('listening');
      });

      // 4. Connect to LiveKit
      await room.connect(livekit_url, token);

      // 5. Publish local microphone
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      localTrackRef.current = audioTrack;
      await room.localParticipant.publishTrack(audioTrack);

      // 6. Animate mic waveform
      const micStream = new MediaStream([audioTrack.mediaStreamTrack]);
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      const micSource = ctx.createMediaStreamSource(micStream);
      const micAnalyser = ctx.createAnalyser();
      micAnalyser.fftSize = 512;
      micAnalyser.smoothingTimeConstant = 0.5;
      micSource.connect(micAnalyser);
      micAnalyserRef.current = micAnalyser;
      stopIdleAnim();
      animateBars(micAnalyser, micBarsRef, micSvgRef, micAnimRef, true);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, [agentId, agentName, animateBars, stopAnimating, attachAgentAudio]);

  const endSession = useCallback(async () => {
    // Record duration before disconnecting
    if (sessionIdRef.current && sessionStartRef.current) {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      fetch(`http://localhost:8000/api/sessions/${sessionIdRef.current}/end?duration=${duration}`, {
        method: 'PATCH',
      }).catch(() => {});
      sessionIdRef.current = 0;
      sessionStartRef.current = 0;
    }

    stopRingTone();
    stopAnimating(micAnimRef, micBarsRef, micSvgRef);
    stopAnimating(agentAnimRef, agentBarsRef, agentSvgRef);
    startIdleAnim(micSvgRef, micBarsRef);

    localTrackRef.current?.stop();
    localTrackRef.current = null;

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;

    // Remove any injected audio elements
    document.querySelectorAll('audio[data-livekit]').forEach(el => el.remove());

    setStatus('ended');
  }, [stopAnimating]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Start idle breathing anim on mount
  useEffect(() => {
    startIdleAnim(micSvgRef, micBarsRef);
    startIdleAnim(agentSvgRef, agentBarsRef);
    return () => {
      stopRingTone();
      cancelAnimationFrame(micAnimRef.current);
      cancelAnimationFrame(agentAnimRef.current);
      cancelAnimationFrame(idleAnimRef.current);
      localTrackRef.current?.stop();
      roomRef.current?.disconnect();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const isActive = !['idle', 'ended', 'error'].includes(status);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface-container-lowest w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary p-6 flex items-center justify-between text-on-primary">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Live Voice Test</p>
              <h3 className="text-xl font-bold">{agentName}</h3>
            </div>
          </div>
          <button
            onClick={() => { endSession(); onClose(); }}
            className="hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Waveforms — combined card */}
        <div className="bg-surface-container-low px-8 py-7 space-y-5">

          {/* SVG Waveform Component */}
          {([
            { label: 'You', svgRef: micSvgRef, color: 'var(--color-secondary)', icon: <Mic size={11} /> },
            { label: agentName, svgRef: agentSvgRef, color: 'var(--color-primary)', icon: <Volume2 size={11} /> },
          ] as const).map(({ label, svgRef, color, icon }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {icon}
                {label}
              </div>
              <svg width="100%" height="56" viewBox="0 0 340 56" preserveAspectRatio="none" className="overflow-visible">
                <g ref={svgRef as any}>
                  {Array.from({ length: 20 }, (_, i) => {
                    const BAR_W = 10;
                    const GAP = 7;
                    const totalW = 20 * BAR_W + 19 * GAP;
                    const startX = (340 - totalW) / 2;
                    const x = startX + i * (BAR_W + GAP);
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={27}
                        width={BAR_W}
                        height={2}
                        rx={BAR_W / 2}
                        fill={color}
                        opacity={0.85}
                        style={{ transition: 'height 0.05s ease, y 0.05s ease' }}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          ))}

          {/* Status */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {['connecting', 'waiting_agent'].includes(status) && (
              <Loader2 size={15} className="animate-spin text-secondary" />
            )}
            {status === 'error' && <AlertCircle size={15} className="text-error" />}
            {status === 'listening' && <Radio size={15} className="text-green-600 animate-pulse" />}
            <span className={`text-sm font-bold ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>

          {errorMsg && (
            <div className="bg-error-container text-error text-xs rounded-xl px-4 py-3 text-center">
              {errorMsg}
              {errorMsg.includes('LiveKit') && (
                <p className="mt-1 opacity-70">Make sure LIVEKIT_URL is set in backend/.env</p>
              )}
            </div>
          )}
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="max-h-40 overflow-y-auto px-6 py-4 space-y-2 border-t border-outline-variant/10">
            <AnimatePresence>
              {transcript.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={transcriptEndRef} />
          </div>
        )}

        {/* Worker reminder */}
        <div className="mx-6 mb-4 px-4 py-3 bg-secondary-container/40 rounded-xl text-xs text-on-surface-variant">
          <p className="font-bold mb-0.5">Voice agent worker must be running:</p>
          <code className="text-[10px] opacity-80">python voice_agent.py dev</code>
          <span className="mx-2 opacity-40">|</span>
          <code className="text-[10px] opacity-80">--url wss://... --api-key ... --api-secret ...</code>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          {status === 'idle' || status === 'ended' || status === 'error' ? (
            <button
              onClick={startSession}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Mic size={18} />
              {status === 'error' ? 'Retry Connection' : 'Start Voice Session'}
            </button>
          ) : (
            <button
              onClick={endSession}
              className="w-full py-3 bg-error text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <MicOff size={18} />
              End Session
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
