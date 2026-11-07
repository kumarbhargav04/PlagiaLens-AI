import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FcGoogle } from 'react-icons/fc';

const Login = () => {
  const { login } = useAuth();
  const location = useLocation();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const err = params.get('error');
    if (err) {
      setError(decodeURIComponent(err));
    }
  }, [location.search]);

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass card max-w-md w-full text-center p-8 md:p-12 relative overflow-hidden"
      >
        {/* Decorative background blur elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl"></div>

        <img
          src="/logo.png"
          alt="PlagiaLens AI Logo"
          className="h-20 w-auto mx-auto mb-6 rounded-xl shadow-md"
        />

        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          PlagiaLens AI
        </h1>
        
        <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI-Powered Content Similarity Detection
        </h2>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Compare videos, documents and notes.
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/30"
          >
            {error}
          </motion.div>
        )}

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
        >
          <FcGoogle size={24} />
          <span>Continue with Google</span>
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-8">
          Secure Google authentication
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
