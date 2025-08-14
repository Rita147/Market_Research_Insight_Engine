import { useState } from "react";
import { ExternalLink, Shield, TrendingUp } from "lucide-react";

export default function PwCKeywordSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/keyword-search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResults([data]); // wrap in array for mapping
    } catch (err) {
      setError(err.message || "Could not fetch results");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const getTrustScoreColor = (score) => {
    if (score >= 0.8) return "#10b981";
    if (score >= 0.6) return "#f59e0b";
    return "#ef4444";
  };

  const getTrustScoreLabel = (score) => {
    if (score >= 0.8) return "High Trust";
    if (score >= 0.6) return "Medium Trust";
    return "Low Trust";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div style={{ width: "100%", maxWidth: "56rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "0.5rem"
            }}
          >
            <span style={{ color: "#ea580c" }}>PwC</span> Keyword Analyzer
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.125rem" }}>
            Search the web and analyze trustworthiness
          </p>
        </div>

        {/* Search Card */}
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "2rem",
            marginBottom: "1.5rem"
          }}
        >
          {/* Search Input */}
          <div
            style={{
              marginBottom: "1.5rem",
              transform: isFocused ? "scale(1.02)" : "scale(1)",
              transition: "transform 0.3s ease"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                border: `2px solid ${isFocused ? "#ea580c" : "#e2e8f0"}`,
                boxShadow: isFocused
                  ? "0 10px 25px -5px rgba(234,88,12,0.2)"
                  : "0 1px 3px 0 rgba(0,0,0,0.1)",
                transition: "all 0.3s ease"
              }}
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a keyword or question..."
                style={{
                  flex: 1,
                  padding: "1rem",
                  fontSize: "1.125rem",
                  backgroundColor: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#1f2937"
                }}
              />
              <button
                onClick={handleSearch}
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
                  boxShadow:
                    !query.trim() || loading
                      ? "none"
                      : "0 10px 15px -3px rgba(0,0,0,0.1)",
                  transform: !query.trim() || loading ? "none" : "scale(1)",
                  transition: "all 0.3s ease"
                }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1.5rem"
              }}
            >
              <span style={{ color: "#b91c1c", fontWeight: "500" }}>{error}</span>
            </div>
          )}

          {/* Results */}
          {results.map((r, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "white",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
                marginBottom: "1.5rem",
                opacity: 0,
                animation: "fadeIn 0.5s ease forwards"
              }}
            >
              {/* Trust Score */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem"
                }}
              >
                <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Shield color="#ea580c" size={24} />
                  <span>Trust Score</span>
                </h2>
                <div
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "white",
                    backgroundColor: getTrustScoreColor(r.trust_score)
                  }}
                >
                  {getTrustScoreLabel(r.trust_score)}
                </div>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontWeight: "600", color: getTrustScoreColor(r.trust_score) }}>
                  {(r.trust_score * 100).toFixed(1)}%
                </p>
              </div>

              {/* Answer & Source */}
              <div>
                <p style={{ marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "600", color: "#64748b" }}>Answer:</span>{" "}
                  {r.answer}
                </p>
                <p style={{ marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: "600", color: "#64748b" }}>Source:</span>{" "}
                  <a
                    href={r.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#ea580c", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.target.style.color = "#dc2626")}
                    onMouseLeave={(e) => (e.target.style.color = "#ea580c")}
                  >
                    {r.source} <ExternalLink size={16} />
                  </a>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <span>Powered by</span>
            <span style={{ fontWeight: "600", color: "#ea580c" }}>PwC Technology</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
