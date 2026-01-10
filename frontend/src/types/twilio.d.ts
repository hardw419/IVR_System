declare module '@twilio/voice-sdk' {
  export interface DeviceOptions {
    codecPreferences?: string[];
    allowIncomingWhileBusy?: boolean;
    logLevel?: number;
  }

  export interface ConnectOptions {
    params?: Record<string, string>;
  }

  export class Call {
    static Codec: {
      Opus: string;
      PCMU: string;
    };
    
    parameters: {
      From?: string;
      To?: string;
      CallSid?: string;
    };

    accept(): void;
    disconnect(): void;
    mute(shouldMute: boolean): void;
    isMuted(): boolean;
    
    on(event: 'accept', callback: () => void): void;
    on(event: 'disconnect', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'cancel', callback: () => void): void;
    on(event: 'reject', callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  export class Device {
    constructor(token: string, options?: DeviceOptions);
    
    register(): Promise<void>;
    unregister(): Promise<void>;
    destroy(): void;
    
    connect(options?: ConnectOptions): Promise<Call>;
    
    on(event: 'registered', callback: () => void): void;
    on(event: 'unregistered', callback: () => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'incoming', callback: (call: Call) => void): void;
    on(event: 'tokenWillExpire', callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
  }
}

