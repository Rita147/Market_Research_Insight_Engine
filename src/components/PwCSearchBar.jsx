import { useState } from "react";
import { Search, ExternalLink, Shield, Globe, TrendingUp } from "lucide-react";

export default function PwCSearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/scrape?url=${encodeURIComponent(searchQuery)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Could not fetch results");
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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #dbeafe 50%, #e0e7ff 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ width: "100%", maxWidth: "56rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ 
            fontSize: "2.5rem", 
            fontWeight: "bold", 
            color: "#1f2937", 
            marginBottom: "0.5rem" 
          }}>
            <span style={{ color: "#ea580c" }}>PwC</span> Trust Analyzer
          </h1>
          <p style={{ color: "#64748b", fontSize: "1.125rem" }}>
            Analyze website credibility and trust scores
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: "2rem",
          marginBottom: "1.5rem"
        }}>
          {/* Search Input */}
          <div style={{ 
            marginBottom: "1.5rem",
            transform: isFocused ? "scale(1.02)" : "scale(1)",
            transition: "transform 0.3s ease"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: "0.75rem",
              border: `2px solid ${isFocused ? "#ea580c" : "#e2e8f0"}`,
              boxShadow: isFocused ? "0 10px 25px -5px rgba(234, 88, 12, 0.2)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease"
            }}>
              <div style={{ paddingLeft: "1rem" }}>
                <Search 
                  size={20} 
                  color={isFocused ? "#ea580c" : "#94a3b8"}
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a URL to analyze..."
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
                onClick={handleSearch}
                disabled={!searchQuery.trim() || loading}
                style={{
                  margin: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  border: "none",
                  cursor: !searchQuery.trim() || loading ? "not-allowed" : "pointer",
                  backgroundColor: !searchQuery.trim() || loading ? "#f1f5f9" : "#ea580c",
                  color: !searchQuery.trim() || loading ? "#94a3b8" : "white",
                  boxShadow: !searchQuery.trim() || loading ? "none" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  transform: !searchQuery.trim() || loading ? "none" : "scale(1)",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = "#dc2626";
                    e.target.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = "#ea580c";
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
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
                <span style={{ color: "#64748b", fontWeight: "500" }}>
                  Analyzing website...
                </span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.75rem",
              padding: "1rem",
              marginBottom: "1.5rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ 
                  width: "0.5rem", 
                  height: "0.5rem", 
                  backgroundColor: "#ef4444", 
                  borderRadius: "50%" 
                }}></div>
                <span style={{ color: "#b91c1c", fontWeight: "500" }}>{error}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div style={{ 
              opacity: 0,
              animation: "fadeIn 0.5s ease forwards"
            }}>
              {/* Trust Score Header */}
              <div style={{
                background: "linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                border: "1px solid #e2e8f0",
                marginBottom: "1.5rem"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <h2 style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#1f2937",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <Shield color="#ea580c" size={28} />
                    <span>Trust Analysis</span>
                  </h2>
                  <div style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "white",
                    backgroundColor: getTrustScoreColor(result.trust_score)
                  }}>
                    {getTrustScoreLabel(result.trust_score)}
                  </div>
                </div>
                
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "1.5rem"
                }}>
                  <div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem"
                    }}>
                      <span style={{ color: "#64748b", fontWeight: "500" }}>Trust Score</span>
                      <span style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: getTrustScoreColor(result.trust_score)
                      }}>
                        {(result.trust_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{
                      width: "100%",
                      backgroundColor: "#e2e8f0",
                      borderRadius: "9999px",
                      height: "0.75rem"
                    }}>
                      <div style={{
                        height: "0.75rem",
                        borderRadius: "9999px",
                        width: `${result.trust_score * 100}%`,
                        backgroundColor: getTrustScoreColor(result.trust_score),
                        transition: "width 1s ease-out"
                      }}></div>
                    </div>
                  </div>
                  
                  <div style={{
                    backgroundColor: "white",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem"
                    }}>
                      <TrendingUp size={16} color="#64748b" />
                      <span style={{ color: "#64748b", fontWeight: "500", fontSize: "0.875rem" }}>
                        Prediction
                      </span>
                    </div>
                    <p style={{ fontSize: "1.125rem", fontWeight: "600", color: "#1f2937" }}>
                      {result.prediction}
                    </p>
                  </div>
                </div>
              </div>

              {/* Website Details */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1.5rem"
              }}>
                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
                }}>
                  <h3 style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <Globe size={20} color="#ea580c" />
                    <span>Website Information</span>
                  </h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={{
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>
                        Title
                      </label>
                      <p style={{
                        color: "#1f2937",
                        fontWeight: "500",
                        marginTop: "0.25rem",
                        lineHeight: "1.6"
                      }}>
                        {result.title || "No title found"}
                      </p>
                    </div>
                    
                    <div>
                      <label style={{
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>
                        Source Domain
                      </label>
                      <p style={{
                        color: "#1f2937",
                        fontWeight: "500",
                        marginTop: "0.25rem"
                      }}>
                        {result.source_domain}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: "white",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
                }}>
                  <h3 style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#1f2937",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                  }}>
                    <ExternalLink size={20} color="#ea580c" />
                    <span>Source URL</span>
                  </h3>
                  
                  <div style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    border: "1px solid #e2e8f0"
                  }}>
                    <a 
                      href={result.news_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        color: "#ea580c",
                        fontWeight: "500",
                        wordBreak: "break-all",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem"
                      }}
                      onMouseEnter={(e) => e.target.style.color = "#dc2626"}
                      onMouseLeave={(e) => e.target.style.color = "#ea580c"}
                    >
                      <span style={{ flex: 1 }}>{result.news_url}</span>
                      <ExternalLink size={16} style={{ marginTop: "0.125rem", flexShrink: 0 }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem"
          }}>
            <span>Powered by</span>
            <span style={{ fontWeight: "600", color: "#ea580c" }}>PwC Technology</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}