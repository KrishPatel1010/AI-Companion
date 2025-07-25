import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import React, { Suspense, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { ComponentProps } from 'react';

type RobinModelProps = { expression?: string } & ComponentProps<'primitive'>;
const RobinModel: React.FC<RobinModelProps> = ({ expression = 'neutral', lipSyncPhoneme = '', object, ...props }) => {
  const gltf = useGLTF('/robin.glb')
  const faceMeshesRef = useRef<THREE.Mesh[]>([])
  const blinkIndexRef = useRef<number | null>(null)
  // Map expression to morph target name (update as needed for your model)
  const expressionMorphs: { [key: string]: string } = {
    happy: 'Fcl_ALL_Joy',
    sad: 'Fcl_ALL_Sorrow',
    surprised: 'Fcl_ALL_Surprised',
    angry: 'Fcl_ALL_Angry',
    neutral: 'Fcl_ALL_Neutral',
    A: 'Fcl_MTH_A',
    E: 'Fcl_MTH_E',
    I: 'Fcl_MTH_I',
    O: 'Fcl_MTH_O',
    U: 'Fcl_MTH_U',
  };

  // Track mouse position normalized to [-1, 1]
  const mouse = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    if (!gltf.scene) return;
    faceMeshesRef.current = [];
    blinkIndexRef.current = null;
    gltf.scene.traverse((child: any) => {
      if (child.isMesh && child.morphTargetDictionary) {
        console.log('Mesh with morphs:', child.name);
        console.log('Morph targets:', Object.keys(child.morphTargetDictionary));
      }
      if (
        child.isMesh &&
        child.name.startsWith('Face_(merged)') &&
        child.morphTargetDictionary &&
        child.morphTargetInfluences
      ) {
        faceMeshesRef.current.push(child);
        if (blinkIndexRef.current === null) {
          const dict = child.morphTargetDictionary;
          let blinkName: string | undefined = Object.keys(dict).find((name) => name === 'Fcl_EYE_Close');
          if (!blinkName) {
            blinkName = Object.keys(dict).find((name) => name.toLowerCase().includes('blink') || name.toLowerCase().includes('close'));
          }
          if (blinkName !== undefined) {
            blinkIndexRef.current = dict[blinkName];
            console.log('Blink morph target found:', blinkName, 'at index', blinkIndexRef.current);
          }
        }
      }
    });
  }, [gltf]);

  // Animate blinking and hair
  useFrame((state, delta) => {
    // Blinking (more human-like)
    if (
      faceMeshesRef.current.length > 0 &&
      blinkIndexRef.current !== null
    ) {
      const mesh = faceMeshesRef.current[0];
      if (!mesh.userData.blinkTimer) {
        mesh.userData.blinkTimer = Math.random() * 2.5 + 2.5; // 2.5 to 5 seconds
        mesh.userData.blinkProgress = 0;
      }
      mesh.userData.blinkTimer -= delta;
      let value = 0;
      if (mesh.userData.blinkTimer <= 0) {
        mesh.userData.blinkProgress += delta * 6.7; // ~0.15s blink duration
        if (mesh.userData.blinkProgress < 0.5) {
          value = mesh.userData.blinkProgress * 2;
        } else if (mesh.userData.blinkProgress < 1) {
          value = (1 - mesh.userData.blinkProgress) * 2;
        } else {
          mesh.userData.blinkTimer = Math.random() * 2.5 + 2.5; // 2.5 to 5 seconds
          mesh.userData.blinkProgress = 0;
        }
      }
      faceMeshesRef.current.forEach(m => {
        if (m.morphTargetInfluences) m.morphTargetInfluences[blinkIndexRef.current!] = value;
      });
    }
    // Hair movement (bone-based, gentle sway around rest pose)
    if (gltf.scene) {
      let hairBoneIndex = 0;
      gltf.scene.traverse((child: any) => {
        if (child.isBone && child.name.toLowerCase().includes('hair')) {
          // Store original rotation on first run
          if (!child.userData.restRotation) {
            child.userData.restRotation = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            };
          }
          const t = state.clock.getElapsedTime();
          const phase = hairBoneIndex * 0.7;
          const isTip = child.children.length === 0;
          const amp = isTip ? 0.04 : 0.35; // very subtle
          // Oscillate around the rest pose
          child.rotation.x = child.userData.restRotation.x + Math.sin(t * 0.7 + phase) * amp;
          child.rotation.y = child.userData.restRotation.y + Math.cos(t * 0.5 + phase) * (amp * 0.5);
          child.rotation.z = child.userData.restRotation.z + Math.sin(t * 0.6 + phase) * (amp * 0.7);
          hairBoneIndex++;
        }
      });
    }
    // Ear movement (gentle, natural sway)
    if (gltf.scene) {
      let earBoneIndex = 0;
      gltf.scene.traverse((child: any) => {
        if (child.isBone && child.name.toLowerCase().includes('ear')) {
          // Debug: log ear bone names once
          if (!child.userData.earLogged) {
            console.log('Animating ear bone:', child.name);
            child.userData.earLogged = true;
          }
          // Store original rotation on first run
          if (!child.userData.restRotation) {
            child.userData.restRotation = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            };
          }
          const t = state.clock.getElapsedTime();
          const phase = earBoneIndex * 3;
          const amp = 100; // gentle ear sway
          child.rotation.x = child.userData.restRotation.x + Math.sin(t * 0.8 + phase) * amp;
          child.rotation.y = child.userData.restRotation.y + Math.cos(t * 0.6 + phase) * (amp * 0.5);
          child.rotation.z = child.userData.restRotation.z;
          earBoneIndex++;
        }
      });
    }
    // Head movement (test for ear animation)
    if (gltf.scene) {
      gltf.scene.traverse((child: any) => {
        if (child.isBone && child.name === 'J_Bip_C_Head') {
          // Store original rotation on first run
          if (!child.userData.restRotation) {
            child.userData.restRotation = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            };
          }
          const t = state.clock.getElapsedTime();
          const amp = 0.08; // gentle head sway
          child.rotation.x = child.userData.restRotation.x + Math.sin(t * 0.7) * amp;
          child.rotation.y = child.userData.restRotation.y + Math.cos(t * 0.5) * (amp * 0.5);
          child.rotation.z = child.userData.restRotation.z;
        }
      });
    }

    // Eye tracking
    if (gltf.scene) {
      gltf.scene.traverse((child: any) => {
        if (child.isBone && (child.name === 'J_Adj_L_FaceEye' || child.name === 'J_Adj_R_FaceEye')) {
          // Store original rotation on first run
          if (!child.userData.restRotation) {
            child.userData.restRotation = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            }
          }
          // Limit eye movement range
          const maxX = 0.175, maxY = 0.05
          child.rotation.y = child.userData.restRotation.y + mouse.current.x * maxX
          child.rotation.x = child.userData.restRotation.x - mouse.current.y * maxY
        }
      })
    }
  });

  // Expression effect: set morph target influence when expression changes
  useEffect(() => {
    if (!faceMeshesRef.current.length) return;
    // Reset all expression and mouth morphs
    faceMeshesRef.current.forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        Object.values(expressionMorphs).forEach(morph => {
          const idx = mesh.morphTargetDictionary ? mesh.morphTargetDictionary[morph] : undefined;
          if (typeof idx === 'number' && mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = 0;
        });
      }
    });
    // Handle facial expression
    if (expression !== 'neutral') {
      let expr = expression;
      let blend = 1;
      if (expression.includes(':')) {
        const parts = expression.split(':');
        expr = parts[0];
        blend = parseFloat(parts[1]);
        if (isNaN(blend)) blend = 1;
      }
      faceMeshesRef.current.forEach(mesh => {
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const morph = expressionMorphs[expr];
          const idx = mesh.morphTargetDictionary ? mesh.morphTargetDictionary[morph] : undefined;
          if (typeof idx === 'number' && mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = blend;
        }
      });
    }
  }, [expression]);

  // Lip sync effect
  useEffect(() => {
    if (!faceMeshesRef.current.length) return;
    // Smooth fade for lip sync
    let fadeId: number | null = null;
    faceMeshesRef.current.forEach(mesh => {
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        ['A', 'E', 'I', 'O', 'U'].forEach(p => {
          const idx = mesh.morphTargetDictionary ? mesh.morphTargetDictionary[expressionMorphs[p]] : undefined;
          if (typeof idx === 'number' && mesh.morphTargetInfluences) {
            // If this is the active phoneme, fade in; else fade out
            let target = (p === lipSyncPhoneme && lipSyncPhoneme) ? 0.6 : 0;
            let current = mesh.morphTargetInfluences ? mesh.morphTargetInfluences[idx] || 0 : 0;
            if (Math.abs(current - target) < 0.01) {
              if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = target;
            } else {
              if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = current + (target - current) * 0.4;
              fadeId = window.requestAnimationFrame(() => {
                // trigger another update
                if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[idx] = mesh.morphTargetInfluences[idx];
              });
            }
          }
        });
      }
    });
    return () => { if (fadeId) window.cancelAnimationFrame(fadeId); };
  }, [lipSyncPhoneme]);

  return <primitive object={object} scale={10} position={[0, 0, 0]} {...props} />
}

function App() {
  // Chat state
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimeout = useRef<number | null>(null);
  const [expression, setExpression] = useState<string>('neutral');
  const [lipSyncPhoneme, setLipSyncPhoneme] = useState<string>('');
  const [, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  // On mount, pick the best available voice
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    function pickBestVoice() {
      const voices = window.speechSynthesis.getVoices();
      // Prioritize cute/kind anime-like English female voices
      const preferred = [
        // Google voices (Chrome)
        'en-US-Wavenet-F', 'en-US-Wavenet-C', 'en-US-Wavenet-D',
        'Google UK English Female', 'Google US English',
        // Microsoft voices (Edge/Windows)
        'Microsoft Zira', 'Microsoft Aria', 'Microsoft Jenny',
        // Apple voices (Safari/Mac)
        'Samantha', 'Karen', 'Moira',
        // General
        'Female', 'en-US', 'en-GB',
      ];
      let best: SpeechSynthesisVoice | null = null;
      for (const name of preferred) {
        best = voices.find(v => v.name.includes(name) && v.lang.startsWith('en')) || best;
      }
      // Fallback: any English voice
      if (!best) best = voices.find(v => v.lang.startsWith('en')) || null;
      setVoice(best);
    }
    // Some browsers load voices asynchronously
    window.speechSynthesis.onvoiceschanged = pickBestVoice;
    pickBestVoice();
  }, []);

  // Simple emotion detection based on AI response
  function detectEmotion(text: string): string {
    const t = text.toLowerCase();
    if (/\b(happy|glad|great|awesome|wonderful|yay|smile|😊|😄|😁|cheer|joy|delight|love|💖|🌸)\b/.test(t)) return 'happy';
    if (/\b(sad|sorry|unhappy|regret|miss|lonely|😢|😭|☹️|frown|down|blue|depressed)\b/.test(t)) return 'sad';
    if (/\b(surprise|wow|amazing|shocked|😲|😮|astonish|incredible|unbelievable)\b/.test(t)) return 'surprised';
    if (/\b(angry|mad|upset|annoy|😠|😡|frustrat|grr)\b/.test(t)) return 'angry';
    return 'neutral';
  }

  // Helper: get phoneme from character
  function getPhoneme(char: string): string {
    const c = char.toLowerCase();
    if ('aáàâäãåā'.includes(c)) return 'A';
    if ('eéèêëē'.includes(c)) return 'E';
    if ('iíìîïī'.includes(c)) return 'I';
    if ('oóòôöõō'.includes(c)) return 'O';
    if ('uúùûüū'.includes(c)) return 'U';
    return '';
  }

  // Play ElevenLabs TTS audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Typing animation for AI response, synced to TTS audio
  const showTypingEffectSynced = (fullText: string, audio: HTMLAudioElement) => {
    setTyping(true);
    const emotion = detectEmotion(fullText);
    setExpression(emotion);
    setLipSyncPhoneme('');
    let lastPhoneme = '';
    let revealed = 0;
    let rafId: number | null = null;

    // Character-by-character sync
    const chars = Array.from(fullText);
    const totalChars = chars.length;

    function updateTextByChar() {
      if (!audio.duration || isNaN(audio.duration) || audio.duration === Infinity) {
        // fallback: reveal all at once if duration is not available
        setMessages((msgs) => {
          const last = msgs[msgs.length - 1];
          if (!last || last.sender !== 'ai') return [...msgs, { sender: 'ai', text: fullText }];
          const updated = [...msgs];
          updated[updated.length - 1] = { sender: 'ai', text: fullText };
          return updated;
        });
        setTyping(false);
        return;
      }
      const progress = Math.min(audio.currentTime / audio.duration, 1);
      const charsToShow = Math.floor(progress * totalChars);
      if (charsToShow !== revealed) {
        revealed = charsToShow;
        const textToShow = chars.slice(0, revealed).join('');
        setMessages((msgs) => {
          const last = msgs[msgs.length - 1];
          if (!last || last.sender !== 'ai') return [...msgs, { sender: 'ai', text: textToShow }];
          const updated = [...msgs];
          updated[updated.length - 1] = { sender: 'ai', text: textToShow };
          return updated;
        });
        // Lip sync: update phoneme for the current character
        let phoneme = '';
        if (revealed > 0) {
          phoneme = getPhoneme(chars[revealed - 1]);
        }
        if (phoneme !== lastPhoneme) {
          setLipSyncPhoneme(phoneme);
          lastPhoneme = phoneme;
        }
      }
      if (progress < 1) {
        rafId = requestAnimationFrame(updateTextByChar);
      } else {
        setTyping(false);
        // Smoothly blend back to neutral
        let blend = 1;
        const fade = () => {
          blend -= 0.08;
          if (blend <= 0) {
            setExpression('neutral');
            setLipSyncPhoneme('');
          } else {
            setExpression(`${emotion}:${blend}`);
            setLipSyncPhoneme('');
            setTimeout(fade, 30);
          }
        };
        setTimeout(fade, 300);
      }
    }

    // Start updating only when audio actually starts playing
    const startReveal = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateTextByChar);
    };
    audio.addEventListener('play', startReveal);
    // If audio is already playing (autoplay), start immediately
    if (!audio.paused) startReveal();
    // Fallback: if audio doesn't play after 1s, reveal all
    const fallbackTimeout = setTimeout(() => {
      if (audio.paused) {
        setMessages((msgs) => {
          const last = msgs[msgs.length - 1];
          if (!last || last.sender !== 'ai') return [...msgs, { sender: 'ai', text: fullText }];
          const updated = [...msgs];
          updated[updated.length - 1] = { sender: 'ai', text: fullText };
          return updated;
        });
        setTyping(false);
      }
    }, 1500);
    // Clean up
    audio.addEventListener('ended', () => {
      setTyping(false);
      setMessages((msgs) => {
        const last = msgs[msgs.length - 1];
        if (!last || last.sender !== 'ai') return msgs;
        const updated = [...msgs];
        updated[updated.length - 1] = { sender: 'ai', text: fullText };
        return updated;
      });
      clearTimeout(fallbackTimeout);
    });
    return () => { if (rafId) cancelAnimationFrame(rafId); clearTimeout(fallbackTimeout); };
  };

  // When AI response is received, start TTS immediately and then animate typing
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg: { sender: 'user'; text: string } = { sender: 'user', text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setLoading(true);
    setInput('');
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      // Start TTS as soon as response is available
      // Fetch TTS audio and play, then sync text to audio
      // Stop any previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const ttsRes = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.response })
      });
      if (!ttsRes.ok) throw new Error('TTS failed');
      const blob = await ttsRes.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      // Set up synced typing
      showTypingEffectSynced(data.response, audio);
      audio.play();
    } catch (err) {
      setMessages((msgs) => [...msgs, { sender: 'ai', text: 'Error: Could not connect to AI.' }]);
      setTyping(false);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Canvas camera={{ position: [0, 15, 15] }}>
        <color attach="background" args={["#fff"]} />
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <RobinModel expression={expression} lipSyncPhoneme={lipSyncPhoneme} object={useGLTF('/robin.glb').scene} />
        </Suspense>
        <OrbitControls enableZoom={true} />
      </Canvas>
      {/* Enhanced Chat UI Overlay */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 1000,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto 32px auto',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 18,
          boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          pointerEvents: 'auto',
        }}>
          <div style={{
            maxHeight: '32vh',
            overflowY: 'auto',
            padding: 20,
            minHeight: 80,
          }}>
            {messages.length === 0 && (
              <div style={{ color: '#888', fontSize: 15, textAlign: 'center' }}>Say hello to Llama2!</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                marginBottom: 12,
                textAlign: msg.sender === 'user' ? 'right' : 'left',
              }}>
                <span style={{
                  display: 'inline-block',
                  background: msg.sender === 'user' ? 'rgba(79,140,255,0.13)' : 'rgba(255, 214, 221, 0.18)',
                  color: '#222',
                  borderRadius: 10,
                  padding: '8px 16px',
                  maxWidth: 400,
                  wordBreak: 'break-word',
                  fontSize: 16,
                  boxShadow: msg.sender === 'user' ? '0 1px 4px #4f8cff22' : '0 1px 4px #ffb6c122',
                  backdropFilter: 'blur(2px)',
                }}>{msg.text}</span>
              </div>
            ))}
            {(loading || typing) && <div style={{ color: '#aaa', fontSize: 15, textAlign: 'center' }}>Llama2 is thinking...</div>}
          </div>
          <form onSubmit={sendMessage} style={{
            display: 'flex',
            borderTop: '1px solid #e0e0e0',
            background: 'rgba(255,255,255,0.85)',
            padding: '0 12px',
            alignItems: 'center',
            height: 60,
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                padding: '14px 16px',
                fontSize: 17,
                background: 'rgba(255,255,255,0.7)',
                color: '#222',
                borderRadius: 10,
                marginRight: 10,
                boxShadow: '0 1px 4px #4f8cff11',
                transition: 'background 0.2s',
              }}
              disabled={loading || typing}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || typing || !input.trim()}
              style={{
                background: '#4f8cff',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 26px',
                fontSize: 17,
                cursor: loading || typing || !input.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 4px #4f8cff33',
                fontWeight: 600,
                letterSpacing: 0.5,
                transition: 'background 0.2s',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
