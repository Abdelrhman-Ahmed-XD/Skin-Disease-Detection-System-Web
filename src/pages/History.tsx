import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Loader2, Activity, Calendar, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export const History: React.FC = () => {
  const { user, isGuest } = useAuth();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (isGuest) {
        setLoading(false);
        return;
      }

      if (user) {
        try {
          const q = query(
            collection(db, 'scans'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setScans(data);
        } catch (error) {
          console.error('Failed to fetch history:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchHistory();
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
          <Activity className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign up to view history</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">Guest accounts do not save scan history. Create a free account to keep track of your previous scans and view progress over time.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Scan History</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage your previous skin condition analyses.</p>
      </div>

      {scans.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No scans found</h3>
          <p className="text-gray-500 dark:text-gray-400">You haven't performed any skin scans yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scans.map((scan, idx) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="h-48 w-full bg-gray-100 dark:bg-gray-900 relative">
                <img src={scan.imageUrl} alt={scan.disease} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-sm">
                  {scan.confidence.toFixed(1)}% Match
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate" title={scan.disease}>{scan.disease}</h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {scan.createdAt ? new Date(scan.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};