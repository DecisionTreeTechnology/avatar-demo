import { useEffect, useRef, useState } from 'react';

export default function TestAvatar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testTalkingHead = async () => {
      try {
        console.log('[TEST] Starting test...');
        setStatus('Loading TalkingHead library...');
        
        // Dynamic import to check if library loads
        const { TalkingHead } = await import('@met4citizen/talkinghead');
        console.log('[TEST] TalkingHead imported:', TalkingHead);
        setStatus('Library loaded, checking container...');
        
        if (!containerRef.current) {
          setError('No container ref');
          return;
        }
        
        console.log('[TEST] Container found:', containerRef.current);
        setStatus('Creating TalkingHead instance...');
        
        const head = new TalkingHead(containerRef.current, {
          ttsEndpoint: '/gtts/',
          lipsyncModules: ['en'],
          avatarMood: 'neutral',
          cameraView: 'head'
        });
        
        console.log('[TEST] TalkingHead created:', head);
        setStatus('Loading avatar...');
        
        await head.showAvatar({ 
          url: '/avatar.glb', 
          lipsyncLang: 'en', 
          avatarMood: 'neutral' 
        });
        
        console.log('[TEST] Avatar loaded successfully!');
        setStatus('Avatar loaded successfully!');
        
      } catch (e: any) {
        console.error('[TEST] Error:', e);
        setError(e.message || 'Unknown error');
        setStatus('Failed');
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(testTalkingHead, 100);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 bg-black/50 text-white text-sm">
        <div>Status: {status}</div>
        {error && <div className="text-red-400">Error: {error}</div>}
      </div>
      <div 
        ref={containerRef} 
        className="flex-1 bg-gray-800 border-2 border-yellow-400"
        style={{ minHeight: '400px' }}
      >
        {/* TalkingHead will create canvas here */}
      </div>
    </div>
  );
}
