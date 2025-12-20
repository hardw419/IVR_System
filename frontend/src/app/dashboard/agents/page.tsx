'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { agentsAPI } from '@/lib/api';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    keyPress: '1',
    email: '',
    department: '',
    isAvailable: true,
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await agentsAPI.getAll();
      setAgents(response.data.agents);
    } catch (error) {
      toast.error('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAgent) {
        await agentsAPI.update(editingAgent._id, formData);
        toast.success('Agent updated successfully');
      } else {
        await agentsAPI.create(formData);
        toast.success('Agent created successfully');
      }
      
      setShowModal(false);
      setEditingAgent(null);
      setFormData({
        name: '',
        phoneNumber: '',
        keyPress: '1',
        email: '',
        department: '',
        isAvailable: true,
      });
      fetchAgents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (agent: any) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      phoneNumber: agent.phoneNumber,
      keyPress: agent.keyPress,
      email: agent.email || '',
      department: agent.department || '',
      isAvailable: agent.isAvailable,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      await agentsAPI.delete(id);
      toast.success('Agent deleted successfully');
      fetchAgents();
    } catch (error) {
      toast.error('Failed to delete agent');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">Agents</h1>
            <p className="page-subtitle">Manage agents for call transfers (Press 1 or 2)</p>
          </div>
          <button
            onClick={() => {
              setEditingAgent(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No agents yet</h3>
            <p className="mt-1 text-gray-500">Get started by adding agents for call transfers.</p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="table-header">Name</th>
                  <th className="table-header">Phone Number</th>
                  <th className="table-header">Key Press</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agents.map((agent) => (
                  <tr key={agent._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-600">
                            {agent.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{agent.phoneNumber}</td>
                    <td className="table-cell">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-100 text-primary-700">
                        Press {agent.keyPress}
                      </span>
                    </td>
                    <td className="table-cell text-gray-600">{agent.department || 'N/A'}</td>
                    <td className="table-cell">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                        agent.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {agent.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(agent)}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(agent._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Agent Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., John Smith"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+32 XXX XX XX XX"
                      className="input-field"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Key Press (1 or 2) *</label>
                    <select
                      required
                      className="input-field"
                      value={formData.keyPress}
                      onChange={(e) => setFormData({ ...formData, keyPress: e.target.value })}
                    >
                      <option value="1">Press 1</option>
                      <option value="2">Press 2</option>
                    </select>
                    <p className="mt-1.5 text-xs text-gray-500">
                      Customers press this to transfer to this agent
                    </p>
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <input
                      type="text"
                      placeholder="e.g., Sales, Support"
                      className="input-field"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    placeholder="agent@company.com"
                    className="input-field"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded-lg"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                  />
                  <label htmlFor="isAvailable" className="text-sm font-medium text-gray-900">
                    Agent is available for call transfers
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAgent(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
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

