import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DEFAULT_ELEVENLABS_VOICE_ID = 'eVItLK1UvXctxuaRV2Oq';
const DEFAULT_ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error('OPENROUTER_API_KEY not set');
        return res.status(500).json({ error: 'Server misconfiguration: missing OpenRouter API key' });
    }

    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';
    const messages = [
        {
            role: 'system',
            content: 'Act like a cute, supportive girl who listens closely, responds warmly, and encourages the user with gentle positivity.Do not give long answer or not too short. Your name is Robin.'
        },
        {
            role: 'user',
            content: message
        }
    ];

    try {
        const orRes = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:5173',
                'X-Title': process.env.OPENROUTER_APP_NAME || 'AI Companion'
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false
            })
        });

        if (!orRes.ok) {
            const errText = await orRes.text();
            console.error('OpenRouter API error:', orRes.status, errText);
            return res.status(orRes.status).json({ error: 'OpenRouter API error', details: errText });
        }

        const data = await orRes.json();
        const content = data?.choices?.[0]?.message?.content ?? '';
        res.json({ response: content });
    } catch (err) {
        console.error('OpenRouter request failed:', err);
        res.status(500).json({ error: 'Failed to connect to OpenRouter', details: err.message });
    }
});

app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
        console.error('ELEVENLABS_API_KEY not set');
        return res.status(500).json({ error: 'Server misconfiguration: missing ElevenLabs API key' });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_ELEVENLABS_VOICE_ID;
    const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL_ID;

    try {
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': elevenKey,
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 1,
                    style: 0.5,
                    use_speaker_boost: true,
                    speed: 1.2,
                    pitch: 0,
                    volume: 1,
                    denoise_level: 0,
                    enhance_level: 0,
                    enhance_stereo: false,
                    enhance_surround: false,
                    enhance_bass: false,
                    enhance_treble: false,
                }
            })
        });

        if (!ttsResponse.ok) {
            const errText = await ttsResponse.text();
            console.error('ElevenLabs API error:', ttsResponse.status, errText);
            return res.status(ttsResponse.status).json({ error: 'ElevenLabs API error', details: errText });
        }

        const audioBuffer = await ttsResponse.arrayBuffer();
        const mimeType = ttsResponse.headers.get('content-type') || 'audio/mpeg';
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        res.json({ audio: audioBase64, mimeType });
    } catch (err) {
        console.error('ElevenLabs request failed:', err);
        res.status(500).json({ error: 'Failed to connect to ElevenLabs', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});