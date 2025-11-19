import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import React, { Suspense, useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { ComponentProps } from 'react';
import './App.css';

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

  useEffect(() => {
    if (!gltf.scene) return;
    // Log all bone names, especially for clothes, hands, and tail
    gltf.scene.traverse((child: any) => {
      if (child.isBone) {
        if (/cloth|hand|tail/i.test(child.name)) {
          console.log('[ANIM TARGET] Bone:', child.name);
        } else {
          // Uncomment the next line to log all bones
          // console.log('[BONE]', child.name);
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

    // Human-like, smooth lower arm idle animation
    if (gltf.scene) {
      gltf.scene.traverse((child: any) => {
        if (child.isBone && (child.name === 'J_Bip_L_LowerArm' || child.name === 'J_Bip_R_LowerArm')) {
          if (!child.userData.restRotation) {
            child.userData.restRotation = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            };
          }
          const t = state.clock.getElapsedTime();

          const isLeft = child.name === 'J_Bip_L_LowerArm';
          const basePhase = isLeft ? 0 : Math.PI / 2;
          // Multi-wave, subtle, organic motion
          const x =
            Math.sin(t * 0.45 + basePhase) * 0.18 +
            Math.sin(t * 0.18 + basePhase * 1.2) * 0.07;
          const y =
            Math.sin(t * 0.33 + basePhase * 0.7) * 0.08 +
            Math.sin(t * 0.13 + basePhase * 1.5) * 0.03;
          const z =
            Math.sin(t * 0.38 + basePhase * 1.1) * 0.12 +
            Math.sin(t * 0.21 + basePhase * 0.9) * 0.04;
          child.rotation.x = child.userData.restRotation.x + x;
          child.rotation.y = child.userData.restRotation.y + y;
          child.rotation.z = child.userData.restRotation.z + z;
        }
      });
    }

    // Tail movement (wave motion)
    if (gltf.scene) {
      const tailBones = [
        'J_Opt_C_FoxTail1_01',
        'J_Opt_C_FoxTail2_01',
        'J_Opt_C_FoxTail3_01',
        'J_Opt_C_FoxTail4_01',
        'J_Opt_C_FoxTail5_01',
        'J_Opt_C_FoxTail5_end_01',
        'J_Opt_C_FoxTail5_end_01_end',
      ];
      let tailIndex = 0;
      gltf.scene.traverse((child: any) => {
        if (child.isBone && tailBones.includes(child.name)) {
          if (!child.userData.restRotation) {
            child.userData.restRotation = {
              x: child.rotation.x,
              y: child.rotation.y,
              z: child.rotation.z,
            };
          }
          const t = state.clock.getElapsedTime();
          const phase = tailIndex * 0.5;
          const amp = 0.18 - tailIndex * 0.02; // tip is more subtle
          child.rotation.x = child.userData.restRotation.x + Math.sin(t * 1.1 + phase) * amp;
          child.rotation.y = child.userData.restRotation.y + Math.cos(t * 0.7 + phase) * (amp * 0.5);
          child.rotation.z = child.userData.restRotation.z + Math.sin(t * 0.9 + phase) * (amp * 0.7);
          tailIndex++;
        }
      });
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
  const [expression, setExpression] = useState<string>('neutral');
  const [lipSyncPhoneme, setLipSyncPhoneme] = useState<string>('');
  const [fakeLipPhoneme, setFakeLipPhoneme] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const typingIntervalRef = useRef<number | null>(null);
  const lipSyncPhonemeRef = useRef<string>('');
  const activeLipSyncPhoneme = lipSyncPhoneme || fakeLipPhoneme;

  useEffect(() => {
    lipSyncPhonemeRef.current = lipSyncPhoneme;
  }, [lipSyncPhoneme]);

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

  const ensureAiPlaceholder = () => {
    setMessages((msgs) => {
      const last = msgs[msgs.length - 1];
      if (!last || last.sender !== 'ai') {
        return [...msgs, { sender: 'ai', text: '' }];
      }
      return msgs;
    });
  };

  const updateAiMessage = (text: string) => {
    setMessages((msgs) => {
      const last = msgs[msgs.length - 1];
      if (!last || last.sender !== 'ai') {
        return [...msgs, { sender: 'ai', text }];
      }
      const updated = [...msgs];
      updated[updated.length - 1] = { sender: 'ai', text };
      return updated;
    });
  };

  const finishResponse = (fullText: string, emotion: string) => {
    setTyping(false);
    updateAiMessage(fullText);
    setLipSyncPhoneme('');
    let blend = 1;
    const fade = () => {
      blend -= 0.08;
      if (blend <= 0) {
        setExpression('neutral');
        setLipSyncPhoneme('');
      } else {
        setExpression(`${emotion}:${blend}`);
        setTimeout(fade, 30);
      }
    };
    setTimeout(fade, 300);
  };

  const revealText = (chars: string[], targetCount: number) => {
    const count = Math.max(0, Math.min(targetCount, chars.length));
    const textToShow = chars.slice(0, count).join('');
    updateAiMessage(textToShow);
    if (count > 0) {
      setLipSyncPhoneme(getPhoneme(chars[count - 1]));
    } else {
      setLipSyncPhoneme('');
    }
  };

  const stopTypingInterval = () => {
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  };

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTypingInterval();
      cleanupAudio();
    };
  }, []);

  // Fake talking fallback so lips move even before TTS arrives
  useEffect(() => {
    if (!typing) {
      setFakeLipPhoneme('');
      return;
    }
    const phonemes = ['A', 'E', 'I', 'O', 'U', 'O', 'A'];
    let idx = 0;
    const intervalId = window.setInterval(() => {
      if (lipSyncPhonemeRef.current) return;
      setFakeLipPhoneme(phonemes[idx]);
      idx = (idx + 1) % phonemes.length;
    }, 110);
    return () => {
      window.clearInterval(intervalId);
      setFakeLipPhoneme('');
    };
  }, [typing]);

  const fetchTtsAudio = async (text: string) => {
    const res = await fetch('http://localhost:3001/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      const errMessage = payload?.error || 'Failed to generate voice audio';
      throw new Error(errMessage);
    }
    return payload as { audio: string; mimeType?: string };
  };

  const base64ToBlobUrl = (base64: string, mimeType = 'audio/mpeg') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const speakAndAnimate = async (fullText: string) => {
    const cleanText = fullText || '...';
    const emotion = detectEmotion(cleanText);
    ensureAiPlaceholder();
    setTyping(true);
    setExpression(emotion);
    setLipSyncPhoneme('');

    const chars = Array.from(cleanText);

    let revealed = 0;
    const safeReveal = (count: number) => {
      if (count <= revealed) return;
      revealed = Math.min(count, chars.length);
      revealText(chars, revealed);
    };
    const startTypingLoop = () => {
      stopTypingInterval();
      typingIntervalRef.current = window.setInterval(() => {
        safeReveal(revealed + 1);
        if (revealed >= chars.length && typingIntervalRef.current) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }, 55);
    };

    try {
      const { audio, mimeType } = await fetchTtsAudio(cleanText);
      cleanupAudio();
      const audioUrl = base64ToBlobUrl(audio, mimeType);
      audioUrlRef.current = audioUrl;
      const audioEl = new Audio(audioUrl);
      audioRef.current = audioEl;

      audioEl.addEventListener('timeupdate', () => {
        if (!audioEl.duration || Number.isNaN(audioEl.duration)) return;
        const progress = audioEl.currentTime / audioEl.duration;
        const target = Math.ceil(progress * chars.length);
        safeReveal(target);
      });

      audioEl.addEventListener('ended', () => {
        stopTypingInterval();
        finishResponse(cleanText, emotion);
        cleanupAudio();
      });

      audioEl.addEventListener('error', () => {
        stopTypingInterval();
        finishResponse(cleanText, emotion);
        cleanupAudio();
      });

      await audioEl.play();
      startTypingLoop();
    } catch (err) {
      console.error('Audio playback failed:', err);
      startTypingLoop();
      finishResponse(cleanText, emotion);
    }
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
      if (data.error) {
        throw new Error(data.error);
      }
      await speakAndAnimate(data.response);
    } catch (err) {
      setMessages((msgs) => [...msgs, { sender: 'ai', text: 'Error: Could not connect to AI.' }]);
      setTyping(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="background-layers">
        <div className="bg-gradient" />
        <div className="bg-noise" />
        <div className="bg-orb orb-one" />
        <div className="bg-orb orb-two" />
        <div className="bg-orb orb-three" />
      </div>
      <Canvas
        className="avatar-canvas"
        camera={{ position: [0, 15, 15] }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <Suspense fallback={null}>
          <RobinModel
            expression={expression}
            lipSyncPhoneme={activeLipSyncPhoneme}
            object={useGLTF('/robin.glb').scene}
          />
        </Suspense>
        <OrbitControls enableZoom={true} />
      </Canvas>
      <div className="chat-overlay">
        <div className="chat-card">
          <div className="chat-card__header">
            <div>
              <p className="chat-card__eyebrow">Robin Companion</p>
              <h2>Let&apos;s talk ✨</h2>
            </div>
            <span className={`status-dot ${typing || loading ? 'status-dot--live' : ''}`}>
              {typing || loading ? 'Live' : 'Idle'}
            </span>
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-placeholder">Say hello to Robin-chan!</div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble chat-bubble--${msg.sender}`}
              >
                {msg.text}
              </div>
            ))}
            {(loading || typing) && <div className="chat-placeholder subtle">Robin is thinking...</div>}
          </div>
          <form onSubmit={sendMessage} className="chat-form">
            <div className="chat-input-wrapper">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading || typing}
                autoFocus
              />
              <div className="pulse" aria-hidden />
            </div>
            <button
              type="submit"
              className="send-button"
              disabled={loading || typing || !input.trim()}
            >
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
