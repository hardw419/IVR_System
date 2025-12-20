'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { scriptsAPI } from '@/lib/api';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
    systemPrompt: 'You are a professional sales representative calling on behalf of a company in Belgium.',
    category: 'custom',
    language: 'nl-BE',
  });

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await scriptsAPI.getAll();
      setScripts(response.data.scripts);
    } catch (error) {
      toast.error('Failed to fetch scripts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingScript) {
        await scriptsAPI.update(editingScript._id, formData);
        toast.success('Script updated successfully');
      } else {
        await scriptsAPI.create(formData);
        toast.success('Script created successfully');
      }
      
      setShowModal(false);
      setEditingScript(null);
      setFormData({
        name: '',
        description: '',
        content: '',
        systemPrompt: 'You are a professional sales representative calling on behalf of a company in Belgium.',
        category: 'custom',
        language: 'nl-BE',
      });
      fetchScripts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (script: any) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      description: script.description || '',
      content: script.content,
      systemPrompt: script.systemPrompt,
      category: script.category,
      language: script.language,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    
    try {
      await scriptsAPI.delete(id);
      toast.success('Script deleted successfully');
      fetchScripts();
    } catch (error) {
      toast.error('Failed to delete script');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">Scripts</h1>
            <p className="page-subtitle">Create and manage your conversation scripts</p>
          </div>
          <button
            onClick={() => {
              setEditingScript(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Script
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          </div>
        ) : scripts.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No scripts yet</h3>
            <p className="mt-1 text-gray-500">Get started by creating your first script.</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Script
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {scripts.map((script) => (
              <div key={script._id} className="card-hover group">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                        <FileText className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{script.name}</h3>
                        <span className="text-xs text-gray-500 capitalize">{script.category}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {script.description || 'No description'}
                  </p>
                  <p className="text-xs text-gray-400 mb-4 line-clamp-2 bg-gray-50 p-2 rounded-lg">
                    {script.content}
                  </p>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(script)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(script._id)}
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
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingScript ? 'Edit Script' : 'Create New Script'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Script Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Sales Outreach"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select
                      className="input-field"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="sales">Sales</option>
                      <option value="support">Support</option>
                      <option value="survey">Survey</option>
                      <option value="appointment">Appointment</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of this script"
                    className="input-field"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">System Prompt *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Define the AI's personality and behavior..."
                    className="input-field resize-none"
                    value={formData.systemPrompt}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Script Content *</label>
                  <textarea
                    required
                    rows={8}
                    className="input-field resize-none"
                    placeholder="Enter your call script here..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingScript(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingScript ? 'Update Script' : 'Create Script'}
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

