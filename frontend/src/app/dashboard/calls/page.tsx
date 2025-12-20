'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { callsAPI, scriptsAPI, voicesAPI } from '@/lib/api';
import { Phone, Upload, FileText, X, MessageSquare, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [scripts, setScripts] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'history'>('single');
  
  // Single call form
  const [singleCallForm, setSingleCallForm] = useState({
    customerPhone: '',
    customerName: '',
    scriptId: '',
    voiceId: '',
  });

  // Bulk call form
  const [bulkCallForm, setBulkCallForm] = useState({
    campaignName: '',
    scriptId: '',
    voiceId: '',
    csvFile: null as File | null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [callsRes, scriptsRes, voicesRes] = await Promise.all([
        callsAPI.getAll(),
        scriptsAPI.getAll(),
        voicesAPI.getAll(),
      ]);
      
      setCalls(callsRes.data.calls);
      setScripts(scriptsRes.data.scripts);
      setVoices(voicesRes.data.voices);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await callsAPI.single(singleCallForm);
      toast.success('Call initiated successfully!');
      setSingleCallForm({
        customerPhone: '',
        customerName: '',
        scriptId: '',
        voiceId: '',
      });
      fetchData();
      setActiveTab('history');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate call');
    }
  };

  const handleBulkCall = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkCallForm.csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('csvFile', bulkCallForm.csvFile);
      formData.append('scriptId', bulkCallForm.scriptId);
      formData.append('voiceId', bulkCallForm.voiceId);
      formData.append('campaignName', bulkCallForm.campaignName);

      await callsAPI.bulk(formData);
      toast.success('Bulk call campaign created successfully!');
      setBulkCallForm({
        campaignName: '',
        scriptId: '',
        voiceId: '',
        csvFile: null,
      });
      fetchData();
      setActiveTab('history');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create bulk campaign');
    }
  };

  // Transcript modal state
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const getStatusColor = (status: string) => {
    const colors: any = {
      'completed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'failed': 'bg-red-100 text-red-800',
      'queued': 'bg-yellow-100 text-yellow-800',
      'initiated': 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleViewTranscript = async (call: any) => {
    setSelectedCall(call);
    setShowTranscript(true);
    setLoadingTranscript(true);

    try {
      const response = await callsAPI.getTranscript(call._id);
      setTranscriptData(response.data);
    } catch (error) {
      toast.error('Failed to load transcript');
    } finally {
      setLoadingTranscript(false);
    }
  };

  const refreshTranscript = async () => {
    if (!selectedCall) return;
    setLoadingTranscript(true);

    try {
      const response = await callsAPI.getTranscript(selectedCall._id);
      setTranscriptData(response.data);
      toast.success('Transcript refreshed');
    } catch (error) {
      toast.error('Failed to refresh transcript');
    } finally {
      setLoadingTranscript(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Calls</h1>
          <p className="page-subtitle">
            Make single or bulk calls to your customers
          </p>
        </div>

        {/* Tabs */}
        <div className="card p-1.5 inline-flex gap-1">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'single'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Phone className="h-4 w-4" />
            Single Call
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'bulk'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload className="h-4 w-4" />
            Bulk Call
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            Call History
          </button>
        </div>

        {/* Single Call Tab */}
        {activeTab === 'single' && (
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-50 rounded-lg">
                <Phone className="h-5 w-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Initiate Single Call</h2>
            </div>
            <form onSubmit={handleSingleCall} className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Customer Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+32 XXX XX XX XX"
                    className="input-field"
                    value={singleCallForm.customerPhone}
                    onChange={(e) => setSingleCallForm({ ...singleCallForm, customerPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Customer Name <span className="text-gray-400">(Optional)</span></label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="input-field"
                    value={singleCallForm.customerName}
                    onChange={(e) => setSingleCallForm({ ...singleCallForm, customerName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Select Script *</label>
                  <select
                    required
                    className="input-field"
                    value={singleCallForm.scriptId}
                    onChange={(e) => setSingleCallForm({ ...singleCallForm, scriptId: e.target.value })}
                  >
                    <option value="">Choose a script...</option>
                    {scripts.map((script) => (
                      <option key={script._id} value={script._id}>{script.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Select Voice *</label>
                  <select
                    required
                    className="input-field"
                    value={singleCallForm.voiceId}
                    onChange={(e) => setSingleCallForm({ ...singleCallForm, voiceId: e.target.value })}
                  >
                    <option value="">Choose a voice...</option>
                    {voices.map((voice) => (
                      <option key={voice._id} value={voice._id}>{voice.name} ({voice.provider})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary">
                <Phone className="mr-2 h-5 w-5" />
                Initiate Call
              </button>
            </form>
          </div>
        )}

        {/* Bulk Call Tab */}
        {activeTab === 'bulk' && (
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Upload className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Initiate Bulk Call Campaign</h2>
            </div>
            <form onSubmit={handleBulkCall} className="space-y-5 max-w-2xl">
              <div>
                <label className="label">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Q4 Customer Outreach"
                  className="input-field"
                  value={bulkCallForm.campaignName}
                  onChange={(e) => setBulkCallForm({ ...bulkCallForm, campaignName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="label">Select Script *</label>
                  <select
                    required
                    className="input-field"
                    value={bulkCallForm.scriptId}
                    onChange={(e) => setBulkCallForm({ ...bulkCallForm, scriptId: e.target.value })}
                  >
                    <option value="">Choose a script...</option>
                    {scripts.map((script) => (
                      <option key={script._id} value={script._id}>{script.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Select Voice *</label>
                  <select
                    required
                    className="input-field"
                    value={bulkCallForm.voiceId}
                    onChange={(e) => setBulkCallForm({ ...bulkCallForm, voiceId: e.target.value })}
                  >
                    <option value="">Choose a voice...</option>
                    {voices.map((voice) => (
                      <option key={voice._id} value={voice._id}>{voice.name} ({voice.provider})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Upload CSV File *</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-xl hover:border-primary-300 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          accept=".csv"
                          required
                          className="sr-only"
                          onChange={(e) => setBulkCallForm({ ...bulkCallForm, csvFile: e.target.files?.[0] || null })}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV with columns: phone (required), name (optional)</p>
                    {bulkCallForm.csvFile && (
                      <p className="text-sm text-primary-600 font-medium">{bulkCallForm.csvFile.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary">
                <Upload className="mr-2 h-5 w-5" />
                Start Bulk Campaign
              </button>
            </form>
          </div>
        )}

        {/* Call History Tab */}
        {activeTab === 'history' && (
          <div className="card overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
            </div>
            {calls.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No calls yet</h3>
                <p className="mt-1 text-gray-500">Start by making a single call or bulk campaign.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-header">Customer</th>
                      <th className="table-header">Phone</th>
                      <th className="table-header">Script</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Duration</th>
                      <th className="table-header">Date</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {calls.map((call) => (
                      <tr key={call._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="table-cell font-medium text-gray-900">
                          {call.customerName || 'N/A'}
                        </td>
                        <td className="table-cell text-gray-600">{call.customerPhone}</td>
                        <td className="table-cell text-gray-600">{call.scriptId?.name || 'N/A'}</td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusColor(call.status)}`}>
                            {call.status}
                          </span>
                        </td>
                        <td className="table-cell text-gray-600">
                          {call.duration ? `${call.duration}s` : '-'}
                        </td>
                        <td className="table-cell text-gray-500">
                          {new Date(call.createdAt).toLocaleDateString()}
                        </td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handleViewTranscript(call)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="View Transcript"
                          >
                            <MessageSquare className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      {showTranscript && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Call Transcript</h2>
                  <p className="text-sm text-gray-500">
                    {selectedCall?.customerName || selectedCall?.customerPhone}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshTranscript}
                  disabled={loadingTranscript}
                  className="p-2.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all disabled:opacity-50"
                  title="Refresh Transcript"
                >
                  <RefreshCw className={`h-5 w-5 ${loadingTranscript ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setShowTranscript(false);
                    setSelectedCall(null);
                    setTranscriptData(null);
                  }}
                  className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingTranscript ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-200 border-t-primary-600"></div>
                </div>
              ) : transcriptData ? (
                <div className="space-y-6">
                  {/* Summary */}
                  {transcriptData.summary && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                      <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                      <p className="text-blue-800 text-sm leading-relaxed">{transcriptData.summary}</p>
                    </div>
                  )}

                  {/* Recording */}
                  {transcriptData.recording?.url && (
                    <div className="bg-gray-50 p-5 rounded-xl">
                      <h3 className="font-semibold text-gray-900 mb-3">Recording</h3>
                      <audio controls className="w-full">
                        <source src={transcriptData.recording.url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {/* Transcript Messages */}
                  {transcriptData.transcriptMessages && transcriptData.transcriptMessages.length > 0 ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4">Conversation</h3>
                      <div className="space-y-3">
                        {transcriptData.transcriptMessages.map((msg: any, index: number) => {
                          const isAI = ['assistant', 'bot', 'ai', 'system'].includes(msg.role?.toLowerCase());
                          return (
                            <div key={index} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                isAI
                                  ? 'bg-gray-100 text-gray-900 rounded-tl-md'
                                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-tr-md shadow-lg shadow-primary-500/20'
                              }`}>
                                <p className={`text-xs font-semibold mb-1 ${isAI ? 'text-gray-500' : 'text-white/80'}`}>
                                  {isAI ? '🤖 AI Assistant' : '👤 Customer'}
                                </p>
                                <p className="text-sm leading-relaxed">{msg.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : transcriptData.transcript ? (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Transcript</h3>
                      <div className="bg-gray-50 p-5 rounded-xl">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{transcriptData.transcript}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-900 font-medium">No transcript available yet</p>
                      <p className="text-sm text-gray-500 mt-1">Transcript will be available after the call ends.</p>
                    </div>
                  )}

                  {/* Call Info */}
                  <div className="bg-gray-50 p-5 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-3">Call Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                        <p className="text-lg font-semibold text-gray-900">{transcriptData.duration || selectedCall?.duration || 0}s</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg ${getStatusColor(selectedCall?.status)}`}>
                          {selectedCall?.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Failed to load transcript data.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

