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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
import { HiOutlineDownload, HiOutlineArrowLeft } from 'react-icons/hi';

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

  if (loading) return <div className="text-center mt-20 text-xl">Loading analysis results...</div>;
  if (error) return <div className="text-center mt-20 text-red-500">{error}</div>;
  if (!report) return null;

  const { scores, documents, matches, verdict, overall_similarity } = report;
  const algScores = scores || report.algorithm_scores;
  
  // Format data for radar chart
  const chartData = {
    labels: ['Cosine', 'Jaccard', 'Sequence', 'N-Gram', 'spaCy', 'LCS'],
    datasets: [
      {
        label: 'Similarity Score (%)',
        data: [
          algScores.cosine,
          algScores.jaccard,
          algScores.sequence,
          algScores.ngram,
          algScores.spacy,
          algScores.lcs
        ],
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    scales: { r: { min: 0, max: 100 } }
  };

  // Helper for highlighting
  const renderHighlightedText = (text, matchesList) => {
    if (!text || !matchesList) return text;
    let result = [];
    let remainingText = text;
    
    // Simplistic highlight approach for MVP
    // In production, use precise character offsets
    const sortedMatches = [...matchesList].sort((a, b) => b.sentence.length - a.sentence.length);
    
    for (let match of sortedMatches) {
        const parts = remainingText.split(match.sentence);
        if (parts.length > 1) {
            result.push(parts[0]);
            result.push(
                <span 
                    key={match.sentence} 
                    className={`highlight-${match.color} cursor-help`}
                    title={`Matched: ${match.matchedWith} (${match.score}%)`}
                >
                    {match.sentence}
                </span>
            );
            remainingText = parts.slice(1).join(match.sentence);
        }
    }
    result.push(remainingText);
    
    return result.length > 0 ? result : text;
  };

  const handleDownload = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `plagscan_report_${report.report_id || 'latest'}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const overall = algScores.overall || overall_similarity;

  let verdictColor = "text-green-500";
  if (overall > 20) verdictColor = "text-yellow-500";
  if (overall > 40) verdictColor = "text-orange-500";
  if (overall > 60) verdictColor = "text-red-500";
  if (overall > 80) verdictColor = "text-red-700 font-bold";

  return (
    <div className="max-w-6xl mx-auto pb-16">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 text-gray-500 hover:text-primary">
        <HiOutlineArrowLeft /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Score Card */}
        <div className="card lg:col-span-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold mb-2">Overall Similarity</h2>
          <div className={`text-6xl font-bold mb-4 ${verdictColor}`}>
            {overall}%
          </div>
          <p className="text-xl font-semibold mb-4">{verdict}</p>
          <button onClick={handleDownload} className="btn btn-outline w-full flex justify-center items-center gap-2">
            <HiOutlineDownload /> Download Report
          </button>
        </div>

        {/* Radar Chart */}
        <div className="card lg:col-span-2">
          <h3 className="text-xl font-bold mb-4">Algorithm Breakdown</h3>
          <div className="h-64 flex justify-center">
            <Radar data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Side by Side Comparison */}
      {documents && documents.length >= 2 && (
        <div className="card">
          <h3 className="text-xl font-bold mb-6">Side-by-Side Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 h-[600px] overflow-y-auto whitespace-pre-wrap font-serif">
              <h4 className="font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{documents[0].name}</h4>
              {renderHighlightedText(documents[0].text, report.matches || report.matched_sentences)}
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 h-[600px] overflow-y-auto whitespace-pre-wrap font-serif">
              <h4 className="font-bold mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{documents[1].name}</h4>
              {/* Highlight logic in doc2 can be reverse matched if needed */}
              {documents[1].text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResults;
