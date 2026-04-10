import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, TrendingUp, AlertCircle, Users, Activity } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (isGuest) {
        setLoading(false);
        return;
      }

      if (user) {
        try {
          const q = query(
            collection(db, 'scans'),
            where('userId', '==', user.uid)
          );
          const snapshot = await getDocs(q);
          const scans = snapshot.docs.map(doc => doc.data());
          
          const freqMap: Record<string, number> = {};
          scans.forEach(scan => {
            freqMap[scan.disease] = (freqMap[scan.disease] || 0) + 1;
          });

          const chartData = Object.entries(freqMap).map(([name, value]) => ({
            name,
            value
          })).sort((a, b) => b.value - a.value);

          setData(chartData);
        } catch (error) {
          console.error('Failed to fetch reports:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchReports();
  }, [user, isGuest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 space-y-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <TrendingUp className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign up for advanced reports</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">Create an account to track your scanning habits over time and visualize condition frequency.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Health Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Insights and analysis based on your skin scan history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
            <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Scans</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.reduce((acc, curr) => acc + curr.value, 0)}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
            <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Conditions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
            <AlertCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Most Frequent</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate" title={data[0]?.name || 'N/A'}>
              {data.length > 0 ? data[0].name : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Condition Frequency</h2>
        
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Not enough data to generate reports.</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};