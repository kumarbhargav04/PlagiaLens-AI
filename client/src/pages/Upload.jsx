import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  HiOutlineCloudUpload, 
  HiOutlineDocumentText, 
  HiOutlineX, 
  HiOutlineRefresh, 
  HiOutlineCheckCircle, 
  HiOutlineTrash 
} from 'react-icons/hi';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    setError(null);
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 25 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 25MB limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    if (validFiles.length >= 2) {
      // If user dropped 2 or more files, set exactly the first 2
      setFiles(validFiles.slice(0, 2));
    } else if (validFiles.length === 1) {
      // If user dropped 1 file, add it or replace if already 2
      setFiles(prev => {
        if (prev.length >= 2) {
          return [prev[1], validFiles[0]];
        }
        return [...prev, validFiles[0]];
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setError(null);
  };

  const handleCompare = async () => {
    if (files.length < 2) {
      setError("Please select 2 documents (e.g. 1 PDF and 1 Word DOCX, or 2 PDFs) to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    files.slice(0, 2).forEach(file => formData.append('files', file));
    
    try {
      const response = await axios.post(`${API_URL}/api/compare`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      navigate(`/analysis/${response.data.report_id}`, { state: response.data });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError("The comparison took longer than expected. Please try with slightly shorter files.");
      } else {
        setError(err.response?.data?.error || "An error occurred during comparison. Please check that the files contain readable text.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getFormatBadge = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">PDF</span>;
    }
    if (ext === 'docx' || ext === 'doc') {
      return <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">DOCX</span>;
    }
    return <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">TXT</span>;
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compare any two documents simultaneously — supports <span className="font-semibold text-primary">PDF vs Word (.docx)</span>, <span className="font-semibold text-primary">PDF vs PDF</span>, or <span className="font-semibold text-primary">Word vs Word</span>.
        </p>
      </div>

      {/* Dropzone */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
          isDragActive 
            ? 'border-primary bg-primary/10 scale-[1.01]' 
            : 'border-gray-300 dark:border-gray-700 hover:border-primary/70 bg-white/50 dark:bg-gray-800/50 shadow-sm'
        }`}
      >
        <input {...getInputProps()} />
        <HiOutlineCloudUpload size={52} className="mx-auto text-primary mb-3 animate-pulse" />
        {isDragActive ? (
          <p className="text-lg font-medium text-primary">Drop files here to load them...</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">
              Drag & Drop your 2 documents here, or <span className="text-primary underline">Browse</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports: PDF, DOCX, DOC, TXT (Up to 25 MB each)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium border border-red-200 dark:border-red-800/40">
          {error}
        </div>
      )}

      {/* Selected Files Comparison Grid */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            Comparison Documents ({files.length}/2)
            {files.length === 2 && (
              <span className="text-xs font-normal text-green-600 dark:text-green-400 flex items-center gap-1">
                <HiOutlineCheckCircle /> Ready to compare
              </span>
            )}
          </h3>
          {files.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
              disabled={loading}
            >
              <HiOutlineTrash size={14} /> Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[0, 1].map((slotIdx) => {
            const file = files[slotIdx];
            return (
              <div 
                key={slotIdx} 
                className={`card p-5 border-2 transition-all ${
                  file 
                    ? 'border-primary/40 bg-white dark:bg-gray-800 shadow-sm' 
                    : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 text-center py-8'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <HiOutlineDocumentText size={28} />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-400">Doc {slotIdx + 1}</span>
                          {getFormatBadge(file.name)}
                        </div>
                        <p className="truncate font-medium text-sm text-gray-800 dark:text-gray-200" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFile(slotIdx)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-2"
                      title="Remove file"
                      disabled={loading}
                    >
                      <HiOutlineX size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">
                    <span className="font-semibold block mb-1">Document {slotIdx + 1} Slot</span>
                    <span>Upload your {slotIdx === 0 ? 'first' : 'second'} document (PDF or Word)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {loading ? (
            <p className="text-sm text-primary font-medium animate-pulse flex items-center gap-2">
              <HiOutlineRefresh className="animate-spin text-lg" />
              Parsing documents & calculating multi-algorithm similarity...
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Cross-format compatible: Automatically cleans PDF formatting and word structures for true content matching.
            </p>
          )}
          <div className="sm:ml-auto w-full sm:w-auto">
            <button 
              onClick={handleCompare} 
              disabled={loading || files.length < 2}
              className={`btn btn-primary text-base px-8 py-3 w-full sm:w-auto flex items-center justify-center gap-2 shadow-md ${
                files.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <><HiOutlineRefresh className="animate-spin" /> Analyzing...</>
              ) : (
                'Start Comparison'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
