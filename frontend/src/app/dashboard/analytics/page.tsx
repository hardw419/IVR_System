'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { callsAPI } from '@/lib/api';
import { BarChart3, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await callsAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
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

  const successRate = stats?.totalCalls > 0
    ? ((stats.completedCalls / stats.totalCalls) * 100).toFixed(1)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">View your call performance metrics and insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Calls</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalCalls || 0}</p>
              </div>
            </div>
          </div>

          <div className="stat-card group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900">{successRate}%</p>
              </div>
            </div>
          </div>

          <div className="stat-card group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                <p className="text-3xl font-bold text-gray-900">{Math.floor(stats?.averageDuration || 0)}s</p>
              </div>
            </div>
          </div>

          <div className="stat-card group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Minutes</p>
                <p className="text-3xl font-bold text-gray-900">{Math.floor((stats?.totalDuration || 0) / 60)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Call Status Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <p className="text-sm font-medium text-gray-600">Completed Calls</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">{stats?.completedCalls || 0}</p>
              <div className="mt-3 h-2 bg-green-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.totalCalls > 0 ? (stats.completedCalls / stats.totalCalls) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <p className="text-sm font-medium text-gray-600">Failed Calls</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">{stats?.failedCalls || 0}</p>
              <div className="mt-3 h-2 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.totalCalls > 0 ? (stats.failedCalls / stats.totalCalls) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">{stats?.inProgressCalls || 0}</p>
              <div className="mt-3 h-2 bg-yellow-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.totalCalls > 0 ? (stats.inProgressCalls / stats.totalCalls) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

