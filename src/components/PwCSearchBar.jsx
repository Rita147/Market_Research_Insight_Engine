import { useState, useEffect, useRef } from "react";
import { Search, TrendingUp, Clock, BarChart3, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler
);
export default function TrustRecencyVisualization() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [report, setReport] = useState("");
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const fetchInsights = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: query,
          max_results: 10
        })
      });

      if (!response.ok) throw new Error('Failed to fetch insights');
      
      const data = await response.json();
      setInsights(data);
      setReport(data.report || ""); 
      console.log("Insights data:", data);

    } catch (err) {
      setError(err.message || 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };
  const getTopResult = () => {
  if (!insights || !insights.results || insights.results.length === 0) return null;
  // Sort descending by trust_score
  const sorted = [...insights.results].sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));
  return sorted[0]; // highest trust_score
};

const topResult = getTopResult();

  const handleKeyPress = (e) => {
    if (e.key === "Enter") fetchInsights();
  };
useEffect(() => {
  if (!insights || !insights.results || !chartRef.current) return;

  // Destroy previous chart
  if (chartInstance.current) {
    chartInstance.current.destroy();
  }

  const ctx = chartRef.current.getContext("2d");

  // Prepare scatter data
  const scatterData = insights.results
    .filter(item => item.recency_days != null && typeof item.trust_score === "number")
    .map(item => ({
      x: item.recency_days,
      y: item.trust_score * 100, // Convert to %
      title: item.title,
      url: item.url,
      prediction: item.prediction,
      source_domain: item.source_domain
    }));

  const pointColors = scatterData.map(point =>
    point.prediction === "REAL" ? "#10b981" : "#ef4444"
  );

  chartInstance.current = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "Trust vs Recency",
        data: scatterData,
        backgroundColor: pointColors,
        borderColor: pointColors,
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 12
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Trust Score vs Article Recency",
          font: { size: 16, weight: "bold" },
          color: "#1f2937"
        },
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          titleColor: "#1f2937",
          bodyColor: "#64748b",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (ctx) => ctx[0].raw.title || "No title",
            label: (ctx) => {
              const p = ctx.raw;
              return [
                `Trust Score: ${p.y.toFixed(1)}%`,
                `Recency: ${p.x} days ago`,
                `Prediction: ${p.prediction}`,
                `Domain: ${p.source_domain}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Days Since Publication", font: { weight: "bold" }, color: "#64748b" },
          grid: { color: "#f1f5f9" },
          ticks: { color: "#64748b" }
        },
        y: {
          title: { display: true, text: "Trust Score (%)", font: { weight: "bold" }, color: "#64748b" },
          min: 0,
          max: 100,
          grid: { color: "#f1f5f9" },
          ticks: { color: "#64748b" }
        }
      },
      onHover: (event, active) => {
        event.native.target.style.cursor = active.length > 0 ? "pointer" : "default";
      },
      onClick: (event, active) => {
        if (active.length > 0) {
          const point = scatterData[active[0].index];
          window.open(point.url, "_blank");
        }
      }
    }
  });

  return () => {
    if (chartInstance.current) chartInstance.current.destroy();
  };
}, [insights]);


  const getStatsFromResults = () => {
    if (!insights || !insights.results) return null;

    const results = insights.results;
    const totalArticles = results.length;
    const realArticles = results.filter(r => r.prediction === 'REAL').length;
    const avgTrustScore = results.reduce((sum, r) => sum + (r.trust_score || 0), 0) / totalArticles;
    const avgRecency = results
      .filter(r => r.recency_days !== null)
      .reduce((sum, r) => sum + r.recency_days, 0) / 
      results.filter(r => r.recency_days !== null).length;

    return {
      totalArticles,
      realArticles,
      avgTrustScore,
      avgRecency: avgRecency || 0
    };
  };

  const stats = getStatsFromResults();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%)",
      padding: "1.5rem",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ 
            fontSize: "2.5rem", 
            fontWeight: "bold", 
            color: "#1f2937", 
            marginBottom: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem"
          }}>
            <BarChart3 color="#ea580c" size={40} />
            <span><span style={{ color: "#ea580c" }}>PwC</span> Trust Analytics</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.125rem" }}>
            Visualize trust scores vs article recency patterns
          </p>
        </div>

        {/* Search Section */}
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "2rem",
          marginBottom: "2rem"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "white",
            borderRadius: "0.75rem",
            border: "2px solid #e2e8f0",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
          }}>
            <div style={{ paddingLeft: "1rem" }}>
              <Search size={20} color="#94a3b8" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter search query to analyze trust patterns..."
              style={{
                flex: 1,
                padding: "1rem",
                fontSize: "1.125rem",
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                color: "#1f2937",
              }}
            />
            <button
              onClick={fetchInsights}
              disabled={!query.trim() || loading}
              style={{
                margin: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                fontWeight: "600",
                border: "none",
                cursor: !query.trim() || loading ? "not-allowed" : "pointer",
                backgroundColor: !query.trim() || loading ? "#f1f5f9" : "#ea580c",
                color: !query.trim() || loading ? "#94a3b8" : "white",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = "#dc2626";
                }
              }}
              onMouseLeave={(e) => {
                if (!e.target.disabled) {
                  e.target.style.backgroundColor = "#ea580c";
                }
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <div style={{ 
              width: "0.5rem", 
              height: "0.5rem", 
              backgroundColor: "#ef4444", 
              borderRadius: "50%" 
            }}></div>
            <span style={{ color: "#b91c1c", fontWeight: "500" }}>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem"
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <BarChart3 size={16} color="#64748b" />
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: "500" }}>Total Articles</span>
              </div>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#1f2937" }}>
                {stats.totalArticles}
              </p>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <TrendingUp size={16} color="#64748b" />
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: "500" }}>Avg Trust Score</span>
              </div>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                {(stats.avgTrustScore * 100).toFixed(1)}%
              </p>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Clock size={16} color="#64748b" />
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: "500" }}>Avg Recency</span>
              </div>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#ea580c" }}>
                {Math.round(stats.avgRecency)}d
              </p>
            </div>

            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <TrendingUp size={16} color="#64748b" />
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: "500" }}>Real Articles</span>
              </div>
              <p style={{ fontSize: "2rem", fontWeight: "bold", color: "#10b981" }}>
                {stats.realArticles}/{stats.totalArticles}
              </p>
            </div>
          </div>
        )}

        {/* Chart Section */}
        {insights && (
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "2rem"
          }}>
            <div style={{ marginBottom: "1rem" }}>
              <h2 style={{ 
                fontSize: "1.5rem", 
                fontWeight: "bold", 
                color: "#1f2937",
                marginBottom: "0.5rem"
              }}>
                Trust Score vs Recency Analysis
              </h2>
              <p style={{ color: "#64748b" }}>
                Each point represents an article. Click on points to visit the source.
                <span style={{ display: "inline-flex", alignItems: "center", gap: "1rem", marginLeft: "1rem" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "0.75rem", height: "0.75rem", backgroundColor: "#10b981", borderRadius: "50%" }}></div>
                    Real
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ width: "0.75rem", height: "0.75rem", backgroundColor: "#ef4444", borderRadius: "50%" }}></div>
                    Fake
                  </span>
                </span>
              </p>
            </div>
            
            <div style={{ 
              height: "500px", 
              width: "100%",
              position: "relative"
            }}>
              <canvas 
                ref={chartRef}
                style={{ 
                  maxHeight: "100%",
                  maxWidth: "100%"
                }}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "4rem",
            textAlign: "center"
          }}>
            <div style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "0.75rem" 
            }}>
              <div style={{
                width: "1.5rem",
                height: "1.5rem",
                border: "2px solid #f3f4f6",
                borderTop: "2px solid #ea580c",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></div>
              <span style={{ color: "#64748b", fontWeight: "500", fontSize: "1.125rem" }}>
                Fetching insights and building visualization...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* AI Summary Section */}
      {report && (
        <div style={{
          marginTop: "2rem",
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e2e8f0"
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1f2937", marginBottom: "0.5rem" }}>
            AI Summary
          </h2>
          <ReactMarkdown
            children={report}
            components={{
              h1: ({node, ...props}) => <h1 style={{fontSize:"1.5rem", fontWeight:"bold", color:"#1f2937"}} {...props}/>,
              h2: ({node, ...props}) => <h2 style={{fontSize:"1.25rem", fontWeight:"bold", color:"#1f2937"}} {...props}/>,
              h3: ({node, ...props}) => <h3 style={{fontSize:"1.125rem", fontWeight:"bold", color:"#1f2937"}} {...props}/>,
              p: ({node, ...props}) => <p style={{color:"#374151", lineHeight:"1.5"}} {...props}/>,
              li: ({node, ...props}) => <li style={{marginLeft:"1.25rem", marginTop:"0.25rem"}} {...props}/>,
              strong: ({node, ...props}) => <strong style={{fontWeight:"bold"}} {...props}/>
            }}
          />
        </div>
      )}
      {/* Results Section */}
      {insights && insights.results && insights.results.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1f2937", marginBottom: "1rem" }}>
            Detailed Article Results
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1rem"
          }}>
            {insights.results.map((item, idx) => (
              <div key={idx} style={{
                backgroundColor: "white",
                borderRadius: "0.75rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}>
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: "bold", color: "#1d4ed8", fontSize: "1rem", textDecoration: "none" }}>
                  {item.title || "No Title"}
                </a>
                <p style={{ color: "#64748b", fontSize: "0.875rem", minHeight: "3rem" }}>
                  {item.snippet || "No snippet available"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#374151" }}>
                  <span>Trust: {(item.trust_score*100).toFixed(1)}%</span>
                  <span>Prediction: <strong style={{ color: item.prediction === "REAL" ? "#10b981" : "#ef4444" }}>{item.prediction}</strong></span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                  Source: {item.source_domain}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}