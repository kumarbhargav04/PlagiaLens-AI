import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { HiOutlineCloudUpload, HiOutlineDocumentText, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles) => {
    // Check individual file size (warn if > 25MB)
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > 25 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 25MB limit. Please upload a smaller file.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...validFiles]);
    if (validFiles.length > 0) setError(null);
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

  const handleCompare = async () => {
    if (files.length < 2) {
      setError("Please upload at least 2 files to compare.");
      return;
    }
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    try {
      const response = await axios.post(`${API_URL}/api/compare`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000 // 90 second timeout for very large documents
      });
      navigate(`/analysis/${response.data.report_id}`, { state: response.data });
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError("The comparison took longer than expected. Please try with slightly shorter documents or test one section at a time.");
      } else {
        setError(err.response?.data?.error || "An error occurred during comparison. Please check that the files contain readable text.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
        <p className="text-gray-600 dark:text-gray-400">Supported formats: PDF, DOCX, TXT. Fast multi-page processing.</p>
      </div>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 dark:border-gray-700 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <HiOutlineCloudUpload size={48} className="mx-auto text-primary mb-4" />
        {isDragActive ? (
          <p className="text-lg">Drop the files here ...</p>
        ) : (
          <p className="text-lg">Drag 'n' drop some files here, or click to select files</p>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Selected Files ({files.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {files.map((file, index) => (
              <div key={index} className="card flex items-center justify-between p-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <HiOutlineDocumentText className="text-primary flex-shrink-0" size={24} />
                  <div className="truncate">
                    <p className="truncate font-medium" title={file.name}>{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2"
                  disabled={loading}
                >
                  <HiOutlineX size={20} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {loading && (
              <p className="text-sm text-gray-500 animate-pulse">
                Extracting text & calculating similarities across documents...
              </p>
            )}
            <div className="sm:ml-auto">
              <button 
                onClick={handleCompare} 
                disabled={loading}
                className="btn btn-primary text-lg px-8 flex items-center gap-2"
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
      )}
    </div>
  );
};

export default Upload;
