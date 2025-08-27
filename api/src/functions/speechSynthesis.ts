import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function speechSynthesis(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Azure Speech synthesis request received');

    try {
        const { text } = await request.json() as { text: string };
        
        if (!text || text.trim().length === 0) {
            return {
                status: 400,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        // Get Azure Speech credentials from environment variables
        const speechKey = process.env.AZURE_SPEECH_KEY;
        const speechRegion = process.env.AZURE_SPEECH_REGION;
        const speechVoice = process.env.AZURE_SPEECH_VOICE || 'en-US-JennyNeural';

        if (!speechKey || !speechRegion) {
            context.log.error('Missing Azure Speech configuration');
            return {
                status: 500,
                body: JSON.stringify({ error: 'Speech service configuration missing' })
            };
        }

        // Import Azure Speech SDK
        const SpeechSDK = await import('microsoft-cognitiveservices-speech-sdk');
        
        const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
        speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Riff22050Hz16BitMonoPcm;
        
        const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, undefined);

        const words: string[] = [];
        const wtimes: number[] = [];
        const wdurations: number[] = [];
        
        // Set up word boundary event handler
        synthesizer.wordBoundary = (s, e) => {
            const tMs = e.audioOffset / 10000;
            words.push(e.text);
            wtimes.push(tMs);
            wdurations.push(e.duration / 10000);
        };

        const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${speechVoice}'>${text}</voice></speak>`;
        
        const result = await new Promise<SpeechSDK.SpeechSynthesisResult>((resolve, reject) => {
            synthesizer.speakSsmlAsync(
                ssml,
                r => resolve(r),
                e => reject(e)
            );
        });

        if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            context.log.error('Speech synthesis failed:', result.errorDetails);
            return {
                status: 500,
                body: JSON.stringify({ error: 'Speech synthesis failed: ' + result.errorDetails })
            };
        }

        const audioData = result.audioData as ArrayBuffer;
        const wordTimings = words.map((word, i) => ({
            word,
            start: wtimes[i] || 0,
            end: (wtimes[i] || 0) + (wdurations[i] || 0)
        }));

        // Convert ArrayBuffer to base64 for JSON response
        const audioBase64 = Buffer.from(audioData).toString('base64');

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                audioData: audioBase64,
                wordTimings,
                format: 'riff-22050hz-16bit-mono-pcm'
            })
        };

    } catch (error) {
        context.log.error('Error in speech synthesis:', error);
        return {
            status: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
}

app.http('speech-synthesis', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: speechSynthesis
});
