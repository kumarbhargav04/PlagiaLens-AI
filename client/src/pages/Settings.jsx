import React, { useState, useEffect } from 'react';
import { HiOutlineSave, HiOutlineRefresh } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { user, deleteAccount } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [threshold, setThreshold] = useState(() => 
    Number(localStorage.getItem('similarityThreshold')) || 40
  );
  
  const [algorithms, setAlgorithms] = useState(() => {
    const saved = localStorage.getItem('activeAlgorithms');
    return saved ? JSON.parse(saved) : {
      cosine: true,
      jaccard: true,
      sequence: true,
      ngram: true,
      spacy: true,
      lcs: true
    };
  });

  const [reportFormat, setReportFormat] = useState(() => 
    localStorage.getItem('reportFormat') || 'pdf'
  );

  useEffect(() => {
    localStorage.setItem('similarityThreshold', threshold);
    localStorage.setItem('activeAlgorithms', JSON.stringify(algorithms));
    localStorage.setItem('reportFormat', reportFormat);
  }, [threshold, algorithms, reportFormat]);

  const handleAlgorithmToggle = (algo) => {
    setAlgorithms(prev => ({
      ...prev,
      [algo]: !prev[algo]
    }));
  };

  const handleReset = () => {
    setThreshold(40);
    setAlgorithms({
      cosine: true,
      jaccard: true,
      sequence: true,
      ngram: true,
      spacy: true,
      lcs: true
    });
    setReportFormat('pdf');
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <h1 className="text-3xl font-bold mb-8">System Settings</h1>

      <div className="flex flex-col gap-8">
        {/* User Profile Card */}
        {user && (
          <div className="card flex flex-col md:flex-row items-center gap-6">
            <img 
              src={user.avatar_url || '/logo.png'} 
              alt={user.name || 'User'} 
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-full border-4 border-primary object-cover shadow-md"
            />
            <div className="flex-grow text-center md:text-left">
              <h3 className="text-2xl font-bold mb-1">{user.name}</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-3">{user.email}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Authenticated via Google
              </div>
              <p className="text-xs text-gray-400 mt-3 italic">
                * Profile fields are managed by Google and cannot be altered.
              </p>
            </div>
          </div>
        )}

        {/* Similarity Threshold */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Similarity Threshold</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Set the minimum percentage score to flag content as potentially plagiarized.
          </p>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-2xl font-bold text-primary w-16 text-right">{threshold}%</span>
          </div>
        </div>

        {/* Algorithm Configuration */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Active Algorithms</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enable or disable specific similarity algorithms used during analysis.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(algorithms).map(([algo, isActive]) => (
              <div key={algo} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <span className="capitalize font-medium">{algo}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isActive}
                    onChange={() => handleAlgorithmToggle(algo)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Report Preferences */}
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Default Report Format</h3>
          <select 
            value={reportFormat}
            onChange={(e) => setReportFormat(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="pdf">PDF (.pdf)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
            <option value="txt">Text (.txt)</option>
          </select>
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={handleReset} className="btn btn-outline">
            <HiOutlineRefresh size={20} /> Reset Defaults
          </button>
          <button className="btn btn-primary">
            <HiOutlineSave size={20} /> Save Changes
          </button>
        </div>

        {/* Account Danger Zone */}
        {user && (
          <div className="card border-red-200 dark:border-red-900/50 bg-red-50/10 dark:bg-red-950/5">
            <h3 className="text-xl font-bold text-red-500 mb-2">Danger Zone</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Permanently delete your account, all comparisons, and uploaded documents. This action is irreversible.
            </p>
            
            {confirmDelete ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  To confirm, please type "<span className="font-bold select-all text-red-700 dark:text-red-300">DELETE</span>" in the box below:
                </p>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="flex-grow p-3 border border-red-300 dark:border-red-900/50 rounded-lg bg-transparent text-red-600 outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'DELETE' || deleting}
                    className="btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Permanently Delete'}
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteInput('');
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
                {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 transition-all cursor-pointer"
              >
                Delete Account
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
