'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { voicesAPI } from '@/lib/api';
import { Plus, Edit, Trash2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';

// Voice providers and their voices
const voiceProviders = {
  openai: {
    name: 'OpenAI',
    voices: [
      { id: 'alloy', name: 'Alloy', gender: 'neutral', description: 'Neutral, balanced tone' },
      { id: 'ash', name: 'Ash', gender: 'male', description: 'Soft, conversational male' },
      { id: 'ballad', name: 'Ballad', gender: 'male', description: 'Warm, expressive male' },
      { id: 'coral', name: 'Coral', gender: 'female', description: 'Warm, friendly female' },
      { id: 'echo', name: 'Echo', gender: 'male', description: 'Smooth, professional male' },
      { id: 'fable', name: 'Fable', gender: 'neutral', description: 'Expressive, storytelling' },
      { id: 'onyx', name: 'Onyx', gender: 'male', description: 'Deep, authoritative male' },
      { id: 'nova', name: 'Nova', gender: 'female', description: 'Friendly, upbeat female' },
      { id: 'sage', name: 'Sage', gender: 'female', description: 'Calm, thoughtful female' },
      { id: 'shimmer', name: 'Shimmer', gender: 'female', description: 'Warm, gentle female' },
      { id: 'verse', name: 'Verse', gender: 'male', description: 'Clear, articulate male' },
    ]
  },
  '11labs': {
    name: 'ElevenLabs',
    voices: [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', description: 'Calm, professional female' },
      { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew', gender: 'male', description: 'Well-rounded, confident male' },
      { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', gender: 'male', description: 'War veteran, deep male' },
      { id: '5Q0t7uMcjvnagumLfvZi', name: 'Paul', gender: 'male', description: 'Ground reporter, serious male' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female', description: 'Strong, assertive female' },
      { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', gender: 'male', description: 'Conversational British male' },
      { id: 'D38z5RcWu1voky8WS1ja', name: 'Fin', gender: 'male', description: 'Sailor, rugged male' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', description: 'Soft, news anchor female' },
      { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', description: 'Well-rounded, warm male' },
      { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', gender: 'male', description: 'Calm, meditation male' },
      { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male', description: 'Casual Australian male' },
      { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', description: 'Warm British narrator' },
      { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily', gender: 'female', description: 'Calm, soothing female' },
      { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'female', description: 'Emotional, expressive female' },
      { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'male', description: 'Transatlantic, intense male' },
      { id: 'ODq5zmih8GrVes37Dizd', name: 'Patrick', gender: 'male', description: 'Shouty, energetic male' },
      { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', gender: 'male', description: 'Anxious, young male' },
      { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', description: 'Articulate, deep male' },
      { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', gender: 'female', description: 'Pleasant British female' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', description: 'Young, deep American male' },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male', description: 'Crisp, narrator male' },
      { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'female', description: 'Seductive Swedish female' },
      { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', description: 'Warm, young female' },
      { id: 'Yko7PKHZNXotIFUBG7I9', name: 'Matthew', gender: 'male', description: 'Audiobook narrator male' },
      { id: 'ZQe5CZNOzWyzPSCn5a3c', name: 'James', gender: 'male', description: 'Calm Australian male' },
      { id: 'Zlb1dXrM653N07WRdFW3', name: 'Joseph', gender: 'male', description: 'British, articulate male' },
      { id: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy', gender: 'male', description: 'Irish, excited male' },
      { id: 'flq6f7yk4E4fJM5XTYuZ', name: 'Michael', gender: 'male', description: 'Older, deep male' },
      { id: 'g5CIjZEefAph4nQFvHAz', name: 'Ethan', gender: 'male', description: 'Narrator, soft male' },
      { id: 'jBpfuIE2acCO8z3wKNLl', name: 'Gigi', gender: 'female', description: 'Childish, animated female' },
    ]
  },
  playht: {
    name: 'PlayHT',
    voices: [
      { id: 'jennifer', name: 'Jennifer', gender: 'female', description: 'American, expressive female' },
      { id: 'matt', name: 'Matt', gender: 'male', description: 'American, conversational male' },
      { id: 'chris', name: 'Chris', gender: 'male', description: 'American, casual male' },
      { id: 'davis', name: 'Davis', gender: 'male', description: 'American, deep male' },
      { id: 'henry', name: 'Henry', gender: 'male', description: 'American, friendly male' },
      { id: 'jack', name: 'Jack', gender: 'male', description: 'American, narrator male' },
      { id: 'ruby', name: 'Ruby', gender: 'female', description: 'American, warm female' },
      { id: 'melissa', name: 'Melissa', gender: 'female', description: 'American, professional female' },
      { id: 'donna', name: 'Donna', gender: 'female', description: 'American, mature female' },
      { id: 'michael', name: 'Michael', gender: 'male', description: 'American, clear male' },
      { id: 'will', name: 'Will', gender: 'male', description: 'American, upbeat male' },
      { id: 'amy', name: 'Amy', gender: 'female', description: 'British, professional female' },
      { id: 'brian', name: 'Brian', gender: 'male', description: 'British, narrator male' },
      { id: 'emma', name: 'Emma', gender: 'female', description: 'British, friendly female' },
      { id: 'oliver', name: 'Oliver', gender: 'male', description: 'British, formal male' },
    ]
  },
  deepgram: {
    name: 'Deepgram',
    voices: [
      { id: 'asteria', name: 'Asteria', gender: 'female', description: 'American, professional female' },
      { id: 'luna', name: 'Luna', gender: 'female', description: 'American, warm female' },
      { id: 'stella', name: 'Stella', gender: 'female', description: 'American, friendly female' },
      { id: 'athena', name: 'Athena', gender: 'female', description: 'British, professional female' },
      { id: 'hera', name: 'Hera', gender: 'female', description: 'American, calm female' },
      { id: 'orion', name: 'Orion', gender: 'male', description: 'American, professional male' },
      { id: 'arcas', name: 'Arcas', gender: 'male', description: 'American, conversational male' },
      { id: 'perseus', name: 'Perseus', gender: 'male', description: 'American, friendly male' },
      { id: 'angus', name: 'Angus', gender: 'male', description: 'Irish, warm male' },
      { id: 'orpheus', name: 'Orpheus', gender: 'male', description: 'American, deep male' },
      { id: 'helios', name: 'Helios', gender: 'male', description: 'British, articulate male' },
      { id: 'zeus', name: 'Zeus', gender: 'male', description: 'American, authoritative male' },
    ]
  },
  azure: {
    name: 'Azure',
    voices: [
      { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', description: 'American, conversational female' },
      { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', description: 'American, newscast male' },
      { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', description: 'American, professional female' },
      { id: 'en-US-DavisNeural', name: 'Davis', gender: 'male', description: 'American, casual male' },
      { id: 'en-US-AmberNeural', name: 'Amber', gender: 'female', description: 'American, warm female' },
      { id: 'en-US-AnaNeural', name: 'Ana', gender: 'female', description: 'American, child female' },
      { id: 'en-US-AshleyNeural', name: 'Ashley', gender: 'female', description: 'American, cheerful female' },
      { id: 'en-US-BrandonNeural', name: 'Brandon', gender: 'male', description: 'American, friendly male' },
      { id: 'en-US-ChristopherNeural', name: 'Christopher', gender: 'male', description: 'American, reliable male' },
      { id: 'en-US-CoraNeural', name: 'Cora', gender: 'female', description: 'American, formal female' },
      { id: 'en-US-ElizabethNeural', name: 'Elizabeth', gender: 'female', description: 'American, warm female' },
      { id: 'en-US-EricNeural', name: 'Eric', gender: 'male', description: 'American, calm male' },
      { id: 'en-US-JacobNeural', name: 'Jacob', gender: 'male', description: 'American, casual male' },
      { id: 'en-US-JaneNeural', name: 'Jane', gender: 'female', description: 'American, positive female' },
      { id: 'en-US-JasonNeural', name: 'Jason', gender: 'male', description: 'American, cheerful male' },
      { id: 'en-US-MichelleNeural', name: 'Michelle', gender: 'female', description: 'American, friendly female' },
      { id: 'en-US-MonicaNeural', name: 'Monica', gender: 'female', description: 'American, professional female' },
      { id: 'en-US-NancyNeural', name: 'Nancy', gender: 'female', description: 'American, warm female' },
      { id: 'en-US-RogerNeural', name: 'Roger', gender: 'male', description: 'American, broadcaster male' },
      { id: 'en-US-SaraNeural', name: 'Sara', gender: 'female', description: 'American, cheerful female' },
      { id: 'en-US-SteffanNeural', name: 'Steffan', gender: 'male', description: 'American, casual male' },
      { id: 'en-US-TonyNeural', name: 'Tony', gender: 'male', description: 'American, friendly male' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'female', description: 'British, cheerful female' },
      { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'male', description: 'British, cheerful male' },
      { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'female', description: 'British, warm female' },
      { id: 'en-AU-NatashaNeural', name: 'Natasha', gender: 'female', description: 'Australian, warm female' },
      { id: 'en-AU-WilliamNeural', name: 'William', gender: 'male', description: 'Australian, casual male' },
      { id: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'female', description: 'Indian, professional female' },
      { id: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'male', description: 'Indian, professional male' },
    ]
  }
};

// Helper to get voices for current provider
const getVoicesForProvider = (provider: string) => {
  return voiceProviders[provider as keyof typeof voiceProviders]?.voices || []
};

export default function VoicesPage() {
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVoice, setEditingVoice] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    voiceId: '',
    language: 'nl-BE',
    gender: 'neutral',
    description: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await voicesAPI.getAll();
      setVoices(response.data.voices);
    } catch (error) {
      toast.error('Failed to fetch voices');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingVoice) {
        await voicesAPI.update(editingVoice._id, formData);
        toast.success('Voice updated successfully');
      } else {
        await voicesAPI.create(formData);
        toast.success('Voice created successfully');
      }
      
      setShowModal(false);
      setEditingVoice(null);
      setFormData({
        name: '',
        provider: 'openai',
        voiceId: '',
        language: 'nl-BE',
        gender: 'neutral',
        description: '',
        isDefault: false,
      });
      fetchVoices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (voice: any) => {
    setEditingVoice(voice);
    setFormData({
      name: voice.name,
      provider: voice.provider,
      voiceId: voice.voiceId,
      language: voice.language,
      gender: voice.gender,
      description: voice.description || '',
      isDefault: voice.isDefault,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;
    
    try {
      await voicesAPI.delete(id);
      toast.success('Voice deleted successfully');
      fetchVoices();
    } catch (error) {
      toast.error('Failed to delete voice');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">Voices</h1>
            <p className="page-subtitle">Configure AI voice settings for your calls</p>
          </div>
          <button
            onClick={() => {
              setEditingVoice(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Voice
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          </div>
        ) : voices.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No voices yet</h3>
            <p className="mt-1 text-gray-500">Get started by creating your first voice configuration.</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Voice
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {voices.map((voice) => (
              <div key={voice._id} className="card-hover group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                        <Mic className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{voice.name}</h3>
                        <span className="text-xs text-gray-500 capitalize">{voice.provider}</span>
                      </div>
                    </div>
                    {voice.isDefault && (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-100 text-green-700">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Voice ID</span>
                      <span className="font-medium text-gray-900">{voice.voiceId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Gender</span>
                      <span className="font-medium text-gray-900 capitalize">{voice.gender}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(voice)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(voice._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Mic className="h-6 w-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingVoice ? 'Edit Voice' : 'Create New Voice'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Voice Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Professional Male"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Provider *</label>
                    <select
                      required
                      className="input-field"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value, voiceId: '' })}
                    >
                      {Object.entries(voiceProviders).map(([key, provider]) => (
                        <option key={key} value={key}>{provider.name} ({provider.voices.length} voices)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Voice *</label>
                    <select
                      required
                      className="input-field"
                      value={formData.voiceId}
                      onChange={(e) => {
                        const voices = getVoicesForProvider(formData.provider);
                        const selectedVoice = voices.find(v => v.id === e.target.value);
                        setFormData({
                          ...formData,
                          voiceId: e.target.value,
                          gender: selectedVoice?.gender || 'neutral'
                        });
                      }}
                    >
                      <option value="">Select a voice</option>
                      {getVoicesForProvider(formData.provider).map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} - {voice.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      className="input-field"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe this voice configuration..."
                    className="input-field resize-none"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="isDefault"
                    className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-lg"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  />
                  <label htmlFor="isDefault" className="text-sm font-medium text-gray-900">
                    Set as default voice for new calls
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingVoice(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingVoice ? 'Update Voice' : 'Create Voice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

