'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { queueAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface UseTwilioDeviceOptions {
  onIncomingCall?: (call: Call) => void;
  onCallConnected?: (call: Call) => void;
  onCallDisconnected?: () => void;
}

export function useTwilioDevice(options: UseTwilioDeviceOptions = {}) {
  const [device, setDevice] = useState<Device | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<Device | null>(null);

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    try {
      const response = await queueAPI.getToken();
      const { token, identity } = response.data;

      console.log('🎯 Initializing Twilio Device for:', identity);

      const newDevice = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        allowIncomingWhileBusy: false,
        logLevel: 1
      });

      // Device ready
      newDevice.on('registered', () => {
        console.log('✅ Twilio Device registered and ready');
        setIsReady(true);
        setError(null);
      });

      // Device error
      newDevice.on('error', (err) => {
        console.error('❌ Twilio Device error:', err);
        setError(err.message);
        toast.error('Phone device error: ' + err.message);
      });

      // Incoming call
      newDevice.on('incoming', (call: Call) => {
        console.log('📞 Incoming call from:', call.parameters.From);
        options.onIncomingCall?.(call);
      });

      // Register the device
      await newDevice.register();

      deviceRef.current = newDevice;
      setDevice(newDevice);

    } catch (err: any) {
      console.error('Failed to initialize Twilio Device:', err);
      setError(err.message || 'Failed to initialize phone');
    }
  }, [options]);

  // Make an outbound call (to connect to queued call)
  const makeCall = useCallback(async (vapiCallId: string) => {
    if (!deviceRef.current || !isReady) {
      toast.error('Phone not ready. Please wait...');
      return null;
    }

    try {
      console.log('📞 Connecting to call:', vapiCallId);

      const call = await deviceRef.current.connect({
        params: {
          vapiCallId: vapiCallId,
          To: `conference:queue-${vapiCallId}`
        }
      });

      call.on('accept', () => {
        console.log('✅ Call connected');
        setActiveCall(call);
        options.onCallConnected?.(call);
      });

      call.on('disconnect', () => {
        console.log('📴 Call disconnected');
        setActiveCall(null);
        setIsMuted(false);
        options.onCallDisconnected?.();
      });

      call.on('error', (err) => {
        console.error('❌ Call error:', err);
        toast.error('Call error: ' + err.message);
      });

      return call;
    } catch (err: any) {
      console.error('Failed to make call:', err);
      toast.error('Failed to connect: ' + err.message);
      return null;
    }
  }, [isReady, options]);

  // Accept incoming call
  const acceptCall = useCallback((call: Call) => {
    call.accept();
    setActiveCall(call);

    call.on('disconnect', () => {
      setActiveCall(null);
      setIsMuted(false);
      options.onCallDisconnected?.();
    });
  }, [options]);

  // Hang up
  const hangUp = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setIsMuted(false);
    }
  }, [activeCall]);

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      const newMuteState = !isMuted;
      activeCall.mute(newMuteState);
      setIsMuted(newMuteState);
    }
  }, [activeCall, isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
    };
  }, []);

  return {
    device,
    isReady,
    activeCall,
    isMuted,
    error,
    initializeDevice,
    makeCall,
    acceptCall,
    hangUp,
    toggleMute
  };
}

