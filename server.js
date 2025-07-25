import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { Readable } from 'stream';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `You are a kind, emotionally supportive anime-style AI companion. Speak gently, use emojis, and encourage positivity.`;
    const fullPrompt = `${systemPrompt}\nUser: ${message}\nAI:`;

    try {
        const ollamaRes = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama2',
                prompt: fullPrompt,
                stream: false
            })
        });
        const data = await ollamaRes.json();
        res.json({ response: data.response });
    } catch (err) {
        res.status(500).json({ error: 'Failed to connect to Ollama', details: err.message });
    }
});

// ElevenLabs TTS endpoint
app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const apiKey = 'sk_7089efd7054563edec532c1f4c7eca734ea23d7e9e6d0c72'; // <--- REPLACE THIS
    const voiceId = 'eVItLK1UvXctxuaRV2Oq';
    try {
        const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.4,
                    similarity_boost: 0.8,
                    style: 0.7,
                    use_speaker_boost: true
                }
            })
        });
        if (!ttsRes.ok) {
            const err = await ttsRes.text();
            return res.status(500).json({ error: 'TTS failed', details: err });
        }
        res.setHeader('Content-Type', 'audio/mpeg');
        ttsRes.body.pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Failed to connect to ElevenLabs', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});