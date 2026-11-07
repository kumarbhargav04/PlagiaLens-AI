import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import { 
  HiOutlineDownload, 
  HiOutlineArrowLeft, 
  HiOutlinePrinter, 
  HiOutlineDocumentReport, 
  HiOutlineCheckCircle, 
  HiOutlineInformationCircle,
  HiOutlineCode,
  HiOutlineViewGrid,
  HiOutlineDocumentDuplicate,
  HiOutlineFire
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const AnalysisResults = () => {
  const { reportId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState(location.state || null);
  const [loading, setLoading] = useState(!location.state);
  const [error, setError] = useState(null);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);

  useEffect(() => {
    if (!report) {
      const fetchReport = async () => {
        try {
          const res = await axios.get(`${API_URL}/api/report/${reportId}`);
          setReport(res.data);
        } catch (err) {
          setError("Failed to load report.");
        } finally {
          setLoading(false);
        }
      };
      fetchReport();
    }
  }, [reportId, report]);

  if (loading) return <div className="text-center mt-20 text-xl font-medium">Loading analysis results...</div>;
  if (error) return <div className="text-center mt-20 text-red-500 font-medium">{error}</div>;
  if (!report) return null;

  const documents = report.documents || [];
  const comparisons = report.comparisons || [];
  const matrix = report.matrix || [];
  const isMulti = Boolean(report.is_multi || comparisons.length > 1);

  // Active Pair Selection
  const activeComp = comparisons.length > 0 ? (comparisons[selectedPairIndex] || comparisons[0]) : null;
  
  const algScores = activeComp 
    ? (activeComp.scores || {}) 
    : (report.scores || report.algorithm_scores || {});
    
  const overall = activeComp 
    ? (activeComp.overall ?? 0) 
    : (algScores.overall ?? report.overall_similarity ?? 0);
    
  const verdict = activeComp 
    ? (activeComp.verdict || "Original") 
    : (report.verdict || "Original");
    
  const matchedList = activeComp 
    ? (activeComp.matches || []) 
    : (report.matches || report.matched_sentences || []);

  const doc1 = (activeComp && documents[activeComp.doc1_idx]) 
    ? documents[activeComp.doc1_idx] 
    : (documents[0] || { name: "Document 1", text: "" });

  const doc2 = (activeComp && documents[activeComp.doc2_idx]) 
    ? documents[activeComp.doc2_idx] 
    : (documents[1] || { name: "Document 2", text: "" });

  // Algorithm metadata & explanations
  const algorithms = [
    {
      key: 'cosine',
      name: 'Cosine Similarity & Overlap',
      weight: '25%',
      score: algScores.cosine ?? 0,
      description: 'Measures vocabulary alignment and word containment across term vectors.'
    },
    {
      key: 'jaccard',
      name: 'Jaccard & Containment',
      weight: '20%',
      score: algScores.jaccard ?? 0,
      description: 'Measures unique keyword overlap and asymmetric source containment.'
    },
    {
      key: 'sequence',
      name: 'Sequence Alignment',
      weight: '20%',
      score: algScores.sequence ?? 0,
      description: 'Detects sequential word order and verbatim sentence order containment.'
    },
    {
      key: 'ngram',
      name: 'N-Gram Phrasing',
      weight: '15%',
      score: algScores.ngram ?? 0,
      description: 'Detects copied multi-word phrases (bigrams & trigrams).'
    },
    {
      key: 'lcs',
      name: 'Longest Common Subsequence (LCS)',
      weight: '20%',
      score: algScores.lcs ?? 0,
      description: 'Measures total sum of contiguous copied sentence and paragraph blocks.'
    }
  ];

  // Radar chart
  const chartData = {
    labels: ['Cosine', 'Jaccard', 'Sequence', 'N-Gram', 'LCS'],
    datasets: [
      {
        label: 'Similarity Score (%)',
        data: [
          algScores.cosine || 0,
          algScores.jaccard || 0,
          algScores.sequence || 0,
          algScores.ngram || 0,
          algScores.lcs || 0
        ],
        backgroundColor: 'rgba(79, 70, 229, 0.25)',
        borderColor: 'rgba(79, 70, 229, 1)',
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } },
    plugins: { legend: { display: false } }
  };

  // High-performance paragraph-based highlighter
  const renderHighlightedText = (text, matchesList) => {
    if (!text) return null;
    const safeMatches = matchesList || [];
    if (safeMatches.length === 0) {
      return text.split(/\n+/).map((para, idx) => (
        <p key={idx} className="mb-3 leading-relaxed">
          {para}
        </p>
      ));
    }
    
    const matchMap = new Map();
    safeMatches.forEach((m) => {
      if (m.sentence && m.sentence.trim()) {
        matchMap.set(m.sentence.trim(), m);
      }
    });

    const paragraphs = text.split(/\n+/);
    
    return paragraphs.map((para, pIdx) => {
      let paraMatches = [];
      matchMap.forEach((m, sText) => {
        let idx = para.indexOf(sText);
        if (idx !== -1) {
          paraMatches.push({ start: idx, end: idx + sText.length, match: m });
        }
      });
      
      paraMatches.sort((a, b) => a.start - b.start);
      
      let elements = [];
      let cursor = 0;
      
      for (let i = 0; i < paraMatches.length; i++) {
        const { start, end, match } = paraMatches[i];
        if (start < cursor) continue;
        
        if (start > cursor) {
          elements.push(para.slice(cursor, start));
        }
        
        const colorClass = match.color === 'red' ? 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100 font-medium' :
                           match.color === 'orange' ? 'bg-orange-200 dark:bg-orange-900/50 text-orange-900 dark:text-orange-100' :
                           'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100';
                           
        elements.push(
          <span
            key={`match-${pIdx}-${start}`}
            className={`${colorClass} rounded px-1 transition-colors`}
            title={`Matched: ${match.matchedWith} (${match.score}%)`}
          >
            {para.slice(start, end)}
          </span>
        );
        cursor = end;
      }
      
      if (cursor < para.length) {
        elements.push(para.slice(cursor));
      }
      
      return (
        <p key={`para-${pIdx}`} className="mb-3 leading-relaxed">
          {elements}
        </p>
      );
    });
  };

  // 1. PDF / Print Report Generator
  const handlePrintPDF = () => {
    window.print();
  };

  // 2. Download Formatted HTML Report File
  const handleDownloadHTML = () => {
    if (!report) return;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PlagiaLens AI Report - ${report.report_id || 'Latest'}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; margin: 40px; }
    .header { border-bottom: 3px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 28px; font-weight: bold; color: #4f46e5; }
    .meta { font-size: 14px; color: #6b7280; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .score-badge { font-size: 42px; font-weight: bold; color: ${overall > 60 ? '#dc2626' : overall > 40 ? '#ea580c' : '#16a34a'}; }
    .verdict { font-size: 20px; font-weight: 600; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 24px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; color: #374151; }
    .match-item { background: #fff; border-left: 4px solid #ef4444; padding: 12px; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .match-meta { font-size: 12px; font-weight: bold; color: #ef4444; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">PlagiaLens AI</div>
      <div class="meta">AI-Powered Content Similarity & Plagiarism Report</div>
    </div>
    <div style="text-align: right;" class="meta">
      <div><strong>Report ID:</strong> ${report.report_id || 'N/A'}</div>
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 14px; color: #6b7280;">OVERALL HIGHEST SIMILARITY</div>
        <div class="score-badge">${overall}%</div>
        <div class="verdict">${verdict}</div>
      </div>
      <div style="text-align: right; font-size: 14px;">
        <p><strong>Inspected Pair:</strong> ${doc1.name} vs ${doc2.name}</p>
        <p><strong>Total Documents:</strong> ${documents.length}</p>
        <p><strong>Matches Found:</strong> ${matchedList.length} sentences</p>
      </div>
    </div>
  </div>

  ${isMulti ? `
    <h2>Pairwise Multi-Document Comparison Matrix</h2>
    <table>
      <thead>
        <tr>
          <th>Document Pair</th>
          <th>Similarity Score</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
        ${comparisons.map(c => `
          <tr>
            <td><strong>${c.doc1_name}</strong> vs <strong>${c.doc2_name}</strong></td>
            <td><strong>${c.overall}%</strong></td>
            <td>${c.verdict}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <h2>Algorithm Breakdown (Inspected Pair)</h2>
  <table>
    <thead>
      <tr>
        <th>Algorithm Metric</th>
        <th>Weight</th>
        <th>Similarity Score</th>
        <th>What It Evaluates</th>
      </tr>
    </thead>
    <tbody>
      ${algorithms.map(a => `
        <tr>
          <td><strong>${a.name}</strong></td>
          <td>${a.weight}</td>
          <td><strong>${a.score}%</strong></td>
          <td>${a.description}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2 style="margin-top: 40px;">Matched Plagiarized Passages (${matchedList.length})</h2>
  ${matchedList.slice(0, 50).map(m => `
    <div class="match-item">
      <div class="match-meta">Similarity: ${m.score}% | Match Flagged</div>
      <div><strong>Document 1:</strong> "${m.sentence}"</div>
      <div style="color: #4b5563; margin-top: 4px;"><strong>Document 2:</strong> "${m.matchedWith}"</div>
    </div>
  `).join('')}
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = `PlagiaLens_Report_${report.report_id || 'latest'}.html`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  // 3. Raw JSON Export
  const handleDownloadJSON = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `plagscan_report_${report.report_id || 'latest'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  let verdictColor = "text-green-500";
  let verdictBg = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (overall > 20) {
    verdictColor = "text-yellow-500";
    verdictBg = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  }
  if (overall > 40) {
    verdictColor = "text-orange-500";
    verdictBg = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (overall > 60) {
    verdictColor = "text-red-500";
    verdictBg = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
  if (overall > 80) {
    verdictColor = "text-red-700 font-bold";
    verdictBg = "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200";
  }

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Official Print Header */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-primary">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">PlagiaLens AI</h1>
            <p className="text-sm text-gray-500">Official Plagiarism & Content Similarity Inspection Report</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p><strong>Report ID:</strong> {report.report_id || 'N/A'}</p>
            <p><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Screen Navigation */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
        >
          <HiOutlineArrowLeft /> Back to Upload
        </button>
        <span className="text-xs text-gray-400">Report ID: {report.report_id || 'Latest'}</span>
      </div>

      {/* Multi-Document Overview Banner & Pair Selector */}
      {isMulti && (
        <div className="card mb-8 p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent border-2 border-primary/20 shadow-sm print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-primary/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
                  <HiOutlineViewGrid size={20} />
                </span>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  Multi-Document Screening ({documents.length} Documents, {comparisons.length} Pairs)
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Click any comparison pair below to inspect its detailed radar breakdown and side-by-side matches.
              </p>
            </div>
            {comparisons[0] && (
              <div className="flex items-center gap-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-3 py-1.5 rounded-xl text-xs font-semibold self-start md:self-auto">
                <HiOutlineFire size={16} className="text-red-600 animate-pulse" />
                <span>Highest Similarity: {comparisons[0].doc1_name} &amp; {comparisons[0].doc2_name} ({comparisons[0].overall}%)</span>
              </div>
            )}
          </div>

          {/* Pairwise Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {comparisons.map((c, idx) => {
              const isSelected = (idx === selectedPairIndex);
              const isTop = (idx === 0);
              const badgeClass = c.overall > 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                 c.overall > 30 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                                 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
              return (
                <button
                  key={`pair-${idx}`}
                  type="button"
                  onClick={() => setSelectedPairIndex(idx)}
                  className={`p-3.5 rounded-xl text-left transition-all border-2 cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-white dark:bg-gray-800 shadow-md ring-2 ring-primary/30' 
                      : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                      Pair {idx + 1}
                      {isTop && <span className="ml-1.5 text-[10px] uppercase font-bold text-red-600 bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded">Highest</span>}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                      {c.overall}%
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate" title={c.doc1_name}>
                    {c.doc1_name}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate" title={c.doc2_name}>
                    vs {c.doc2_name}
                  </p>
                  <div className="mt-2 text-[11px] font-medium text-primary flex items-center justify-between">
                    <span>{c.verdict}</span>
                    {isSelected && <span className="text-[10px] font-bold text-primary">● Active</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Matrix Table (Visual Heatmap) */}
          {matrix.length > 0 && (
            <div className="mt-6 pt-4 border-t border-primary/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Pairwise Similarity Matrix (%)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-center border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-gray-400 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        Documents
                      </th>
                      {documents.map((d, dIdx) => (
                        <th key={`col-${dIdx}`} className="p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 font-semibold truncate max-w-[120px]" title={d.name}>
                          Doc {dIdx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, rIdx) => (
                      <tr key={`row-${rIdx}`}>
                        <td className="p-2 text-left font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 truncate max-w-[140px]" title={documents[rIdx]?.name}>
                          Doc {rIdx + 1}: {documents[rIdx]?.name}
                        </td>
                        {row.map((val, cIdx) => {
                          const isDiag = (rIdx === cIdx);
                          const bgCell = isDiag ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 font-normal' :
                                         val > 70 ? 'bg-red-500/20 text-red-700 dark:text-red-300 font-bold hover:bg-red-500/30 cursor-pointer' :
                                         val > 40 ? 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-300 font-bold hover:bg-yellow-500/30 cursor-pointer' :
                                         'bg-green-500/10 text-green-700 dark:text-green-300 hover:bg-green-500/20 cursor-pointer';
                          return (
                            <td 
                              key={`cell-${rIdx}-${cIdx}`}
                              onClick={() => {
                                if (isDiag) return;
                                const compIdx = comparisons.findIndex(c => 
                                  (c.doc1_idx === rIdx && c.doc2_idx === cIdx) || 
                                  (c.doc1_idx === cIdx && c.doc2_idx === rIdx)
                                );
                                if (compIdx !== -1) setSelectedPairIndex(compIdx);
                              }}
                              className={`p-2 border border-gray-200 dark:border-gray-700 transition-colors ${bgCell}`}
                              title={isDiag ? "Same document" : `Click to inspect Doc ${rIdx + 1} vs Doc ${cIdx + 1}`}
                            >
                              {val}%
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Pair Header (Shown if multi) */}
      {isMulti && (
        <div className="mb-4 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Currently Inspecting Pair:</span>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mt-0.5">
              <span>{doc1.name}</span>
              <span className="text-primary font-normal text-sm">vs</span>
              <span>{doc2.name}</span>
            </h3>
          </div>
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${verdictBg}`}>
            {verdict} ({overall}%)
          </span>
        </div>
      )}

      {/* Score Summary & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Score Card */}
        <div className="card lg:col-span-1 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-800 shadow-md">
          <h2 className="text-sm font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-1">
            {isMulti ? 'Pair Similarity' : 'Overall Similarity'}
          </h2>
          <div className={`text-6xl font-black mb-2 ${verdictColor}`}>
            {overall}%
          </div>
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full mb-6 ${verdictBg}`}>
            {verdict}
          </span>

          {/* Action Buttons */}
          <div className="w-full space-y-2 print:hidden">
            <button 
              onClick={handlePrintPDF} 
              className="btn btn-primary w-full flex justify-center items-center gap-2 shadow-sm cursor-pointer"
              title="Prints or saves clean PDF directly using your browser"
            >
              <HiOutlinePrinter size={18} /> Print / Save as PDF
            </button>
            
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadHTML} 
                className="btn btn-outline text-xs flex-1 flex justify-center items-center gap-1.5 py-2 cursor-pointer"
                title="Download formatted offline HTML report file"
              >
                <HiOutlineDocumentReport size={16} /> Save HTML Report
              </button>
              <button 
                onClick={handleDownloadJSON} 
                className="btn btn-outline text-xs flex items-center gap-1 py-2 text-gray-500 hover:text-gray-700 cursor-pointer"
                title="Download raw JSON data for research/evaluation"
              >
                <HiOutlineCode size={16} /> JSON
              </button>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="card lg:col-span-2 p-6 bg-white dark:bg-gray-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Multi-Algorithm Radar Profile</h3>
            <span className="text-xs text-gray-400">5 Algorithmic Dimensions</span>
          </div>
          <div className="h-60 flex justify-center">
            <Radar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Algorithm Breakdown Section */}
      <div className="card mb-8 p-6 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
          <HiOutlineInformationCircle className="text-primary text-xl" />
          <div>
            <h3 className="text-lg font-bold">Algorithm Breakdown &amp; Weighting</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              How the composite {overall}% score is computed for this comparison:
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 text-xs uppercase">
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Weight</th>
                <th className="py-2.5 px-3">Score</th>
                <th className="py-2.5 px-3">What It Evaluates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {algorithms.map((alg) => {
                const s = alg.score;
                const barColor = s > 60 ? 'bg-red-500' : s > 30 ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <tr key={alg.key} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-200">
                      {alg.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                        {alg.weight}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-12">{s}%</span>
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: `${s}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {alg.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side by Side Comparison */}
      <div className="card p-6 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Side-by-Side Comparison &amp; Match Highlighting</h3>
          <span className="text-xs text-gray-400">
            {matchedList.length} matching passage(s) flagged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50/70 dark:bg-gray-800/40 h-[600px] overflow-y-auto font-serif leading-relaxed text-sm">
            <h4 className="font-bold pb-2 mb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="truncate" title={doc1.name}>{doc1.name}</span>
              <span className="text-xs font-normal text-gray-400 font-sans shrink-0 ml-2">Document A</span>
            </h4>
            {renderHighlightedText(doc1.text, matchedList)}
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50/70 dark:bg-gray-800/40 h-[600px] overflow-y-auto font-serif leading-relaxed text-sm">
            <h4 className="font-bold pb-2 mb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="truncate" title={doc2.name}>{doc2.name}</span>
              <span className="text-xs font-normal text-gray-400 font-sans shrink-0 ml-2">Document B</span>
            </h4>
            {renderHighlightedText(doc2.text, matchedList.map(m => ({
                ...m,
                sentence: m.matchedWith,
                matchedWith: m.sentence
            })))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
