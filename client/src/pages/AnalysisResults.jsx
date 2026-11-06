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
  HiOutlineCode
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

  const { scores, documents, matches, verdict, overall_similarity, created_at } = report;
  const algScores = scores || report.algorithm_scores || {};
  const overall = algScores.overall ?? overall_similarity ?? 0;
  const matchedList = matches || report.matched_sentences || [];

  // Algorithm metadata & explanations
  const algorithms = [
    {
      key: 'cosine',
      name: 'Cosine Similarity',
      weight: '25%',
      score: algScores.cosine ?? 0,
      description: 'Measures vocabulary & topical alignment across term frequency vectors.'
    },
    {
      key: 'jaccard',
      name: 'Jaccard & Containment',
      weight: '20%',
      score: algScores.jaccard ?? 0,
      description: 'Measures unique keyword overlap and text containment ratio.'
    },
    {
      key: 'sequence',
      name: 'Sequence Alignment',
      weight: '20%',
      score: algScores.sequence ?? 0,
      description: 'Detects sequential word order and verbatim sentence structure.'
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

  // 1. PDF / Print Report Generator (Opens browser's Save as PDF dialog)
  const handlePrintPDF = () => {
    window.print();
  };

  // 2. Download Formatted HTML Report File
  const handleDownloadHTML = () => {
    if (!report) return;
    const doc1Name = documents && documents[0] ? documents[0].name : "Document 1";
    const doc2Name = documents && documents[1] ? documents[1].name : "Document 2";
    
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
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
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
        <div style="font-size: 14px; color: #6b7280;">OVERALL SIMILARITY SCORE</div>
        <div class="score-badge">${overall}%</div>
        <div class="verdict">${verdict}</div>
      </div>
      <div style="text-align: right; font-size: 14px;">
        <p><strong>Document 1:</strong> ${doc1Name}</p>
        <p><strong>Document 2:</strong> ${doc2Name}</p>
        <p><strong>Matches Found:</strong> ${matchedList.length} sentences</p>
      </div>
    </div>
  </div>

  <h2>Algorithm Breakdown</h2>
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

  <h2 style="margin-top: 40px;">Matched Plagiarized Sentences (${matchedList.length})</h2>
  ${matchedList.slice(0, 50).map(m => `
    <div class="match-item">
      <div class="match-meta">Similarity: ${m.score}% | Match Found</div>
      <div><strong>Original:</strong> "${m.sentence}"</div>
      <div style="color: #4b5563; margin-top: 4px;"><strong>Matched With:</strong> "${m.matchedWith}"</div>
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
      {/* Official Print Header (Visible ONLY when printing to PDF) */}
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

      {/* Screen Navigation (Hidden during print) */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors cursor-pointer"
        >
          <HiOutlineArrowLeft /> Back to Upload
        </button>
        <span className="text-xs text-gray-400">Report ID: {report.report_id || 'Latest'}</span>
      </div>

      {/* Score Summary & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Score Card */}
        <div className="card lg:col-span-1 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-800 shadow-md">
          <h2 className="text-sm font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-1">
            Overall Similarity
          </h2>
          <div className={`text-6xl font-black mb-2 ${verdictColor}`}>
            {overall}%
          </div>
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full mb-6 ${verdictBg}`}>
            {verdict}
          </span>

          {/* Action Buttons (Hidden during print) */}
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
            <h3 className="text-lg font-bold">Algorithm Breakdown & Weighting</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              How the composite {overall}% score is computed across each algorithmic dimension:
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
      {documents && documents.length >= 2 && (
        <div className="card p-6 bg-white dark:bg-gray-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Side-by-Side Comparison & Match Highlighting</h3>
            <span className="text-xs text-gray-400">
              {matchedList.length} matching sentence passage(s) flagged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50/70 dark:bg-gray-800/40 h-[600px] overflow-y-auto font-serif leading-relaxed text-sm">
              <h4 className="font-bold pb-2 mb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span>{documents[0].name}</span>
                <span className="text-xs font-normal text-gray-400 font-sans">Document 1</span>
              </h4>
              {renderHighlightedText(documents[0].text, matchedList)}
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50/70 dark:bg-gray-800/40 h-[600px] overflow-y-auto font-serif leading-relaxed text-sm">
              <h4 className="font-bold pb-2 mb-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span>{documents[1].name}</span>
                <span className="text-xs font-normal text-gray-400 font-sans">Document 2</span>
              </h4>
              {renderHighlightedText(documents[1].text, matchedList.map(m => ({
                  ...m,
                  sentence: m.matchedWith,
                  matchedWith: m.sentence
              })))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;
