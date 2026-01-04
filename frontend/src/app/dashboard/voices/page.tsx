'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { voicesAPI } from '@/lib/api';
import { Plus, Edit, Trash2, Mic } from 'lucide-react';
import toast from 'react-hot-toast';

// OpenAI available voices
const openAIVoices = [
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
];

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
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    >
                      <option value="openai">OpenAI</option>
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
                        const selectedVoice = openAIVoices.find(v => v.id === e.target.value);
                        setFormData({
                          ...formData,
                          voiceId: e.target.value,
                          gender: selectedVoice?.gender || 'neutral'
                        });
                      }}
                    >
                      <option value="">Select a voice</option>
                      {openAIVoices.map((voice) => (
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

