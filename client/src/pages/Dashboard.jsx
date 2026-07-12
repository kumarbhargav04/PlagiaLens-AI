import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HiOutlineUsers, HiOutlineDocumentText, HiOutlineExclamationCircle, HiOutlineTrendingUp } from 'react-icons/hi';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Link } from 'react-router-dom';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          axios.get('http://localhost:5000/api/dashboard'),
          axios.get('http://localhost:5000/api/history')
        ]);
        setStats(statsRes.data);
        setHistory(historyRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) return <div className="text-center mt-20 text-xl">Loading dashboard...</div>;
  if (!stats) return <div className="text-center mt-20 text-red-500">Failed to load dashboard.</div>;

  const doughnutData = {
    labels: ['Original', 'Low', 'Moderate', 'High', 'Plagiarized'],
    datasets: [
      {
        data: [
          history.filter(h => h.overall_similarity <= 20).length,
          history.filter(h => h.overall_similarity > 20 && h.overall_similarity <= 40).length,
          history.filter(h => h.overall_similarity > 40 && h.overall_similarity <= 60).length,
          history.filter(h => h.overall_similarity > 60 && h.overall_similarity <= 80).length,
          history.filter(h => h.overall_similarity > 80).length,
        ],
        backgroundColor: [
          '#10B981', '#F59E0B', '#EF4444', '#B91C1C', '#7F1D1D'
        ]
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-lg text-primary"><HiOutlineDocumentText size={24} /></div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Documents</p>
            <p className="text-2xl font-bold">{stats.total_documents}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-500"><HiOutlineTrendingUp size={24} /></div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Comparisons</p>
            <p className="text-2xl font-bold">{stats.total_comparisons}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-500"><HiOutlineTrendingUp size={24} /></div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Average Similarity</p>
            <p className="text-2xl font-bold">{stats.average_similarity}%</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-500"><HiOutlineExclamationCircle size={24} /></div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Flagged High Risk</p>
            <p className="text-2xl font-bold">{stats.flagged}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="flex justify-center mb-8">
        <div className="card w-full max-w-2xl">
          <h3 className="text-xl font-bold mb-4 text-center">Distribution by Verdict</h3>
          <div className="h-64 flex justify-center">
             <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="card">
        <h3 className="text-xl font-bold mb-6">Recent Reports</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Date</th>
                <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Documents Compared</th>
                <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Score</th>
                <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Verdict</th>
                <th className="py-3 px-4 font-semibold text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? history.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-3 px-4">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {item.documents.join(' vs ')}
                  </td>
                  <td className="py-3 px-4 font-bold">{item.overall_similarity}%</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.overall_similarity > 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      item.overall_similarity > 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      item.overall_similarity > 20 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {item.verdict}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/analysis/${item.report_id}`} className="text-primary hover:underline">View Report</Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-gray-500">No recent comparisons found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
