import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  HiOutlineSearch, 
  HiOutlineDocumentText, 
  HiOutlineShieldCheck, 
  HiOutlineChartBar,
  HiOutlineCloudUpload,
  HiOutlineViewGrid,
  HiOutlinePrinter,
  HiOutlineArrowRight
} from 'react-icons/hi';

const Landing = () => {
  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="text-center pt-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
          <span>✨ Enterprise-Grade Plagiarism &amp; Similarity Detection</span>
        </div>
        
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-secondary leading-tight"
        >
          PlagiaLens AI — Intelligent Plagiarism Detection
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Enterprise-grade originality analysis utilizing 5 NLP algorithms. Compare 2 or more PDF, Word (.docx), and text documents simultaneously with visual side-by-side sentence matching.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link to="/upload" className="btn btn-primary text-base sm:text-lg px-8 py-3.5 shadow-md flex items-center gap-2">
            <span>Start Scanning Documents</span>
            <HiOutlineArrowRight size={18} />
          </Link>
          <Link to="/dashboard" className="btn btn-outline text-base sm:text-lg px-8 py-3.5">
            View Analytics Dashboard
          </Link>
        </motion.div>
      </section>

      {/* Core Capabilities Section */}
      <section className="mt-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Core Capabilities</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Comprehensive document verification powered by advanced computational linguistics and layout-aware text extraction.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              icon: <HiOutlineSearch size={36}/>, 
              title: "Deep Multi-Algorithm Analysis", 
              desc: "Evaluates text through 5 dimensions: Cosine similarity, Jaccard containment, Sequence matching, N-gram phrasing, and LCS." 
            },
            { 
              icon: <HiOutlineDocumentText size={36}/>, 
              title: "Smart Sentence Highlighting", 
              desc: "Interactive color-coded side-by-side comparison with red, orange, and yellow visual flags for matching passages." 
            },
            { 
              icon: <HiOutlineViewGrid size={36}/>, 
              title: "Multi-Document Matrix (2+ Files)", 
              desc: "Upload 2, 3, or more documents simultaneously to generate pairwise similarity heatmaps and inspect each pair in depth." 
            },
            { 
              icon: <HiOutlineChartBar size={36}/>, 
              title: "Instant Analytics & PDF Export", 
              desc: "Generate radar algorithm charts, detailed similarity breakdowns, and download official print-ready PDF reports." 
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card p-6 text-center hover:-translate-y-2 transition-transform duration-300 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700/60"
            >
              <div className="text-primary mb-4 flex justify-center">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mt-8 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-8 sm:p-12 rounded-3xl border border-primary/10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">How PlagiaLens AI Works</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            From file upload to comprehensive plagiarism report in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card p-6 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-base font-bold mb-2">Upload Any 2+ Documents</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Drag and drop PDF, Word (.docx), or TXT documents. Compare cross-format files seamlessly with automatic layout normalization.
            </p>
            <Link to="/upload" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Go to Document Upload <HiOutlineArrowRight size={14} />
            </Link>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-base font-bold mb-2">Ultra-Fast NLP Scanning</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Native C++ PDFium extraction processes hundreds of pages in under 1 second, followed by inverted index candidate sentence matching.
            </p>
            <Link to="/dashboard" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View Inspection History <HiOutlineArrowRight size={14} />
            </Link>
          </div>

          <div className="card p-6 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-base font-bold mb-2">Interactive Results &amp; Export</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
              Explore highlighted side-by-side text, inspect pairwise comparison matrices, and print or download official PDF reports.
            </p>
            <Link to="/login" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Sign In to Save History <HiOutlineArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Internal Navigation Footer */}
      <footer className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <Link to="/upload" className="hover:text-primary transition-colors font-medium text-primary">Upload &amp; Scan</Link>
          <Link to="/dashboard" className="hover:text-primary transition-colors">Analytics Dashboard</Link>
          <Link to="/login" className="hover:text-primary transition-colors">Account Sign In</Link>
          <a 
            href="https://github.com/kumarbhargav04/PlagiaLens-AI" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            GitHub Project
          </a>
        </div>
        <p className="text-xs text-gray-400">
          &copy; 2026 PlagiaLens AI. Intelligent Multi-Document Plagiarism &amp; Content Similarity Platform.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
