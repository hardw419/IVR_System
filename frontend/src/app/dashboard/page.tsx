'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { callsAPI } from '@/lib/api';
import { Phone, CheckCircle, XCircle, Clock, RefreshCw, TrendingUp, Timer, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await callsAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await callsAPI.sync();
      toast.success(response.data.message || 'Calls synced successfully');
      fetchStats();
    } catch (error) {
      toast.error('Failed to sync calls');
    } finally {
      setSyncing(false);
    }
  };

  const statCards = [
    {
      name: 'Total Calls',
      value: stats?.totalCalls || 0,
      icon: Phone,
      gradient: 'from-blue-500 to-blue-600',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      name: 'Completed',
      value: stats?.completedCalls || 0,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      name: 'Failed',
      value: stats?.failedCalls || 0,
      icon: XCircle,
      gradient: 'from-red-500 to-red-600',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      name: 'In Progress',
      value: stats?.inProgressCalls || 0,
      icon: Clock,
      gradient: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Welcome back! Here&apos;s an overview of your AI IVR system.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Calls'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <div key={stat.name} className="card-hover p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                      <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`${stat.bgLight} p-3 rounded-xl`}>
                      <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Duration Stats */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Timer className="h-5 w-5 text-primary-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Call Duration</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">Total Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.floor((stats?.totalDuration || 0) / 60)}
                      <span className="text-sm font-normal text-gray-500 ml-1">min</span>
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">Average Duration</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.floor((stats?.averageDuration || 0))}
                      <span className="text-sm font-normal text-gray-500 ml-1">sec</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Success Rate</span>
                      <span className="font-semibold text-gray-900">
                        {stats?.totalCalls > 0
                          ? Math.round((stats.completedCalls / stats.totalCalls) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${stats?.totalCalls > 0
                            ? (stats.completedCalls / stats.totalCalls) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>{stats?.completedCalls || 0} successful out of {stats?.totalCalls || 0} calls</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/dashboard/calls"
                  className="group p-6 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl border-2 border-transparent hover:border-primary-200 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Phone className="h-6 w-6 text-primary-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Make a Call</p>
                  <p className="text-sm text-gray-500 mt-1">Start a new AI-powered call</p>
                </a>
                <a
                  href="/dashboard/scripts"
                  className="group p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border-2 border-transparent hover:border-emerald-200 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Create Script</p>
                  <p className="text-sm text-gray-500 mt-1">Design conversation flows</p>
                </a>
                <a
                  href="/dashboard/voices"
                  className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border-2 border-transparent hover:border-purple-200 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Timer className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="font-semibold text-gray-900">Add Voice</p>
                  <p className="text-sm text-gray-500 mt-1">Configure AI voice settings</p>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

