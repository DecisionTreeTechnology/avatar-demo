declare module '@met4citizen/talkinghead' {
  interface AudioObject {
    audio: AudioBuffer;
    words: string[];
    wtimes: number[];
    wdurations: number[];
  }

  export class TalkingHead {
    constructor(container: HTMLElement, options?: any);
    speakAudio(audioObj: AudioObject, options?: any, callback?: () => void): void;
    speakText(text: string): Promise<any>;
    setMood(mood: string): void;
    setPosture(posture: string): void;
    showBody(show: boolean): void;
    setFullBodyView(enabled: boolean): void;
    destroy(): void;
    [key: string]: any;
  }
}
