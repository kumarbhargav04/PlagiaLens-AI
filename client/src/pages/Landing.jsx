import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiOutlineSearch, HiOutlineDocumentText, HiOutlineShieldCheck, HiOutlineChartBar } from 'react-icons/hi';

const Landing = () => {
  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="text-center pt-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500"
        >
          Intelligent Plagiarism Detection
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10"
        >
          Enterprise-grade analysis utilizing advanced NLP algorithms to ensure document originality and integrity.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center gap-4"
        >
          <Link to="/upload" className="btn btn-primary text-lg px-8 py-4">
            Start Scanning
          </Link>
          <Link to="/dashboard" className="btn btn-outline text-lg px-8 py-4">
            View Analytics
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-12">Core Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { icon: <HiOutlineSearch size={36}/>, title: "Deep Analysis", desc: "Multi-layered algorithm scanning including Cosine, Jaccard, and N-Gram." },
            { icon: <HiOutlineDocumentText size={36}/>, title: "Smart Highlighting", desc: "Color-coded side-by-side comparison for immediate visual feedback." },
            { icon: <HiOutlineShieldCheck size={36}/>, title: "Semantic Matching", desc: "Detects paraphrased content using advanced spaCy NLP models." },
            { icon: <HiOutlineChartBar size={36}/>, title: "Detailed Analytics", desc: "Comprehensive reports and dashboard visualizations." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card text-center hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="text-primary mb-4 flex justify-center">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Landing;
