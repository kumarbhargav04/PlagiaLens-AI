import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { 
  HiOutlineCloudUpload, 
  HiOutlineDocumentText, 
  HiOutlineX, 
  HiOutlineRefresh, 
  HiOutlineCheckCircle, 
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineInformationCircle
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

    // Append all newly selected valid files
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: files.length > 0, // When files are already present, click on big area won't accidentally prompt; button does
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
      setError("Please select at least 2 documents (e.g. 2 PDFs, PDF vs Word, or multiple assignments) to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    try {
      const response = await axios.post(`${API_URL}/api/compare`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      navigate(`/analysis/${response.data.report_id}`, { state: response.data });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError("The comparison took longer than expected. Please try with slightly shorter files.");
      } else {
        setError(err.response?.data?.error || "An error occurred during comparison. Please check that all files contain readable text.");
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

  const pairCount = (files.length * (files.length - 1)) / 2;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compare <span className="font-semibold text-primary">2 or more documents</span> simultaneously — supports cross-comparison across <span className="font-semibold text-primary">PDF, Word (.docx), and TXT</span> with full pairwise screening.
        </p>
      </div>

      {/* Dropzone */}
      <div 
        {...getRootProps()} 
        onClick={files.length === 0 ? open : undefined}
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
              Drag & Drop your documents here, or <button type="button" onClick={open} className="text-primary underline cursor-pointer font-semibold">Browse</button>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select 2 or more files • Supports PDF, DOCX, DOC, TXT (Up to 25 MB each)
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
            Uploaded Documents ({files.length})
            {files.length >= 2 ? (
              <span className="text-xs font-normal text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800/30">
                <HiOutlineCheckCircle /> Ready to compare {files.length} files ({pairCount} pairs)
              </span>
            ) : files.length === 1 ? (
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/30">
                <HiOutlineInformationCircle /> Add at least 1 more document to compare
              </span>
            ) : null}
          </h3>
          {files.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
              disabled={loading}
            >
              <HiOutlineTrash size={14} /> Clear all
            </button>
          )}
        </div>

        {files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {files.map((file, idx) => (
              <div 
                key={`${file.name}-${idx}`} 
                className="card p-4 border-2 border-primary/30 bg-white dark:bg-gray-800 shadow-sm relative group hover:border-primary/60 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <HiOutlineDocumentText size={24} />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-400">Doc {idx + 1}</span>
                        {getFormatBadge(file.name)}
                      </div>
                      <p className="truncate font-medium text-sm text-gray-800 dark:text-gray-200" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer shrink-0"
                    title="Remove file"
                    disabled={loading}
                  >
                    <HiOutlineX size={18} />
                  </button>
                </div>
              </div>
            ))}

            {/* Quick Add Document Card */}
            <button 
              type="button"
              onClick={open}
              disabled={loading}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary/60 hover:bg-primary/5 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[82px] group"
            >
              <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:scale-105 transition-transform">
                <HiOutlinePlus size={18} />
                <span>Add More Documents</span>
              </div>
              <span className="text-xs text-gray-400 mt-0.5">PDF, DOCX, or TXT</span>
            </button>
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center text-gray-400 mb-8 bg-gray-50/30 dark:bg-gray-800/20">
            <p className="text-sm font-medium">No documents selected yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload 2 or more files above to begin cross-document similarity analysis</p>
          </div>
        )}

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {loading ? (
            <p className="text-sm text-primary font-medium animate-pulse flex items-center gap-2">
              <HiOutlineRefresh className="animate-spin text-lg" />
              Parsing {files.length} documents & calculating {pairCount} comparison matrix pairs...
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Cross-format compatible: Automatically cleans PDF and Word formatting for true content matching.
            </p>
          )}
          <div className="sm:ml-auto w-full sm:w-auto">
            <button 
              onClick={handleCompare} 
              disabled={loading || files.length < 2}
              className={`btn btn-primary text-base px-8 py-3 w-full sm:w-auto flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                files.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <><HiOutlineRefresh className="animate-spin" /> Analyzing {files.length} Docs...</>
              ) : files.length >= 2 ? (
                `Compare ${files.length} Documents (${pairCount} Pairs)`
              ) : (
                'Select at least 2 Documents'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
