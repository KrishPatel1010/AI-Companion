// Add WebKit Speech Recognition types
declare global {
  interface Window {
    webkitSpeechRecognition: new () => WebkitSpeechRecognition;
  }
  
  interface WebkitSpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: WebkitSpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
  }
  
  interface WebkitSpeechRecognitionEvent {
    results: WebkitSpeechRecognitionResultList;
  }
  
  interface WebkitSpeechRecognitionResultList {
    [index: number]: WebkitSpeechRecognitionResult;
    length: number;
  }
  
  interface WebkitSpeechRecognitionResult {
    [index: number]: WebkitSpeechRecognitionAlternative;
    length: number;
  }
  
  interface WebkitSpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
}

export {};

declare module '*.glb' {
  const value: string
  export default value
}
