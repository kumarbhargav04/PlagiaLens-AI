import React, { useState, useEffect } from 'react';
import { HiOutlineSave, HiOutlineRefresh } from 'react-icons/hi';

const Settings = () => {
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

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <h1 className="text-3xl font-bold mb-8">System Settings</h1>

      <div className="flex flex-col gap-8">
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
      </div>
    </div>
  );
};

export default Settings;
