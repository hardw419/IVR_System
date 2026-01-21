'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { queueAPI } from '@/lib/api';
import { Phone, PhoneOff, PhoneIncoming, Clock, Users, CheckCircle, XCircle, Mic, MicOff, Wifi, WifiOff, PhoneCall } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useTwilioDevice } from '@/hooks/useTwilioDevice';

interface QueueItem {
  _id: string;
  customerPhone: string;
  customerName: string;
  keyPressed: string;
  status: string;
  currentWaitTime: number;
  waitStartTime: string;
  vapiCallId?: string;
  twilioCallSid?: string;
}

interface QueueStats {
  waiting: number;
  answered: number;
  abandoned: number;
  avgWaitTime: number;
}

export default function AgentQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({ waiting: 0, answered: 0, abandoned: 0, avgWaitTime: 0 });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [activeQueueItem, setActiveQueueItem] = useState<QueueItem | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTestingCall, setIsTestingCall] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Twilio Device hook
  const {
    isReady: phoneReady,
    activeCall,
    isMuted,
    error: phoneError,
    initializeDevice,
    makeCall,
    acceptCall,
    hangUp,
    toggleMute
  } = useTwilioDevice({
    onIncomingCall: (call) => {
      // When a call comes directly to the browser
      console.log('📞 Incoming call in browser from:', call.parameters.From);
      toast.success(`🔔 Incoming call from ${call.parameters.From}`, { duration: 10000 });

      // Auto-accept if agent is online, or show in queue
      if (isOnline && !activeQueueItem) {
        acceptCall(call);
        setActiveQueueItem({
          _id: 'browser-call-' + Date.now(),
          customerPhone: call.parameters.From || 'Unknown',
          customerName: call.parameters.From || 'Unknown Caller',
          keyPressed: 'direct',
          status: 'answered',
          currentWaitTime: 0,
          waitStartTime: new Date().toISOString(),
        });
      }
    },
    onCallDisconnected: () => {
      setActiveQueueItem(null);
      setCallDuration(0);
      fetchQueue();
    }
  });

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        queueAPI.getQueue(),
        queueAPI.getStats()
      ]);
      setQueue(queueRes.data.queue);
      setStats(statsRes.data.stats);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Get user ID from token (simple decode)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.userId;

      const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      socketRef.current = io(backendUrl, {
        auth: { token }
      });

      socketRef.current.on('connect', () => {
        console.log('🔌 Connected to socket');
        socketRef.current?.emit('join-agent-room', userId);
      });

      socketRef.current.on('new-queue-call', (data) => {
        console.log('📞 New call in queue:', data);
        toast.success(`New call from ${data.customerName || data.customerPhone}`);
        fetchQueue();
      });

      socketRef.current.on('incoming-call', (data) => {
        console.log('📞 Incoming call:', data);
        // Play sound or show notification
        toast.success(`🔔 Incoming call from ${data.customerPhone}`, { duration: 10000 });
        // Add to queue immediately
        setQueue(prev => [{
          _id: data.queueId,
          customerPhone: data.customerPhone,
          customerName: data.customerName,
          keyPressed: 'direct',
          status: 'waiting',
          currentWaitTime: 0,
          waitStartTime: data.waitStartTime,
          twilioCallSid: data.callSid
        }, ...prev]);
      });

      socketRef.current.on('queue-update', () => {
        fetchQueue();
      });

    } catch (e) {
      console.error('Socket setup error:', e);
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, [fetchQueue]);

  // Initial fetch and polling
  useEffect(() => {
    fetchQueue();
    
    // Poll every 5 seconds for wait time updates
    timerRef.current = setInterval(() => {
      setQueue(prev => prev.map(item => ({
        ...item,
        currentWaitTime: Math.floor((Date.now() - new Date(item.waitStartTime).getTime()) / 1000)
      })));
    }, 1000);

    // Fetch fresh data every 10 seconds
    const fetchInterval = setInterval(fetchQueue, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearInterval(fetchInterval);
    };
  }, [fetchQueue]);

  // Call duration timer
  useEffect(() => {
    if (activeCall) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async (queueItem: QueueItem) => {
    try {
      // First update the queue status
      await queueAPI.acceptCall(queueItem._id);

      // Connect via Twilio Device (browser calling)
      if (phoneReady) {
        // Use twilioCallSid for direct calls, vapiCallId for Vapi transfers
        const callId = queueItem.twilioCallSid || queueItem.vapiCallId;
        if (callId) {
          const call = await makeCall(callId);
          if (call) {
            setActiveQueueItem(queueItem);
            setQueue(prev => prev.filter(q => q._id !== queueItem._id));
            toast.success('Connecting to call...');
          }
        }
      } else {
        // Fallback - just mark as accepted without browser calling
        setActiveQueueItem(queueItem);
        setQueue(prev => prev.filter(q => q._id !== queueItem._id));
        toast.success('Call accepted! (Browser phone not ready)');
      }
    } catch (error) {
      toast.error('Failed to accept call');
    }
  };

  const handleEndCall = async () => {
    if (!activeQueueItem) return;

    try {
      // Hang up Twilio call
      hangUp();

      // Mark as completed in backend
      await queueAPI.completeCall(activeQueueItem._id);
      setActiveQueueItem(null);
      toast.success('Call ended');
      fetchQueue();
    } catch (error) {
      toast.error('Failed to end call');
    }
  };

  const toggleOnline = async () => {
    if (!isOnline) {
      // Going online - initialize Twilio device
      await initializeDevice();
      setIsOnline(true);
      toast.success('You are now online - ready to receive calls');
    } else {
      // Going offline
      setIsOnline(false);
      toast.success('You are now offline');
    }
  };

  const handleTestCall = async () => {
    if (!testPhoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    // Format phone number (add + if not present)
    let formattedNumber = testPhoneNumber.trim();
    if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+' + formattedNumber;
    }

    setIsTestingCall(true);
    try {
      await queueAPI.testCall(formattedNumber);
      toast.success('Test call initiated! Your phone will ring shortly.');
      setTestPhoneNumber('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to make test call');
    } finally {
      setIsTestingCall(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Queue</h1>
            <p className="text-gray-500">Manage incoming customer calls</p>
          </div>
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isOnline
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Test Call Section */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Incoming Call</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number (e.g., +917206534017)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  onClick={handleTestCall}
                  disabled={isTestingCall || !isOnline}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isTestingCall || !isOnline
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <PhoneCall className="h-4 w-4" />
                  {isTestingCall ? 'Calling...' : 'Test Call'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {!isOnline
                  ? 'Go online first to test incoming calls'
                  : 'Twilio will call your phone, and it will appear in the queue below'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <PhoneIncoming className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Waiting</p>
                <p className="text-2xl font-bold text-gray-900">{stats.waiting}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Answered</p>
                <p className="text-2xl font-bold text-gray-900">{stats.answered}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Abandoned</p>
                <p className="text-2xl font-bold text-gray-900">{stats.abandoned}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Wait</p>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(Math.round(stats.avgWaitTime))}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Phone Status Banner */}
        {isOnline && (
          <div className={`p-3 rounded-lg flex items-center gap-3 ${phoneReady ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {phoneReady ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            <span className="text-sm font-medium">
              {phoneReady ? 'Browser phone ready - you can receive calls' : 'Connecting browser phone...'}
            </span>
            {phoneError && <span className="text-red-600 text-sm ml-2">Error: {phoneError}</span>}
          </div>
        )}

        {/* Active Call Panel */}
        {activeQueueItem && (
          <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {activeQueueItem.customerName || 'Unknown Caller'}
                  </h3>
                  <p className="text-gray-600">{activeQueueItem.customerPhone}</p>
                </div>
                <div className="ml-8 px-4 py-2 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-xl font-mono font-bold text-green-600">{formatDuration(callDuration)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-all ${
                    isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleEndCall}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  <PhoneOff className="h-5 w-5" />
                  End Call
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Queue List */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Waiting Calls</h2>
            </div>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
              {queue.length} in queue
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No calls waiting</h3>
              <p className="text-gray-500 mt-1">New calls will appear here when customers press 1</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {queue.map((item) => (
                <div key={item._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <PhoneIncoming className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {item.customerName || 'Unknown Caller'}
                        </h4>
                        <p className="text-sm text-gray-500">{item.customerPhone}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Waiting: {formatDuration(item.currentWaitTime)}</span>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        Pressed {item.keyPressed}
                      </span>
                    </div>
                    <button
                      onClick={() => handleAcceptCall(item)}
                      disabled={!!activeQueueItem || !isOnline}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        activeQueueItem || !isOnline
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      <Phone className="h-4 w-4" />
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
