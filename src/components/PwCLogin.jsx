import { useState, useRef } from "react";
import { Mail, Shield, ArrowRight, Check } from "lucide-react";

// Import the actual PwCSearchBar component
import PwCSearchBar from "./PwCSearchBar";
export default function PwCLogin() {
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const inputsRef = useRef([]);

  // Helper to join digits
  const inputCode = codeDigits.join("");

  // Send code
  const sendCode = async () => {
    setError("");
    if (!email.endsWith("@pwc.com")) {
      setError("Email must end with @pwc.com");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed");
      setCodeSent(true);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify code
  const verifyCode = async () => {
    setError("");
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: inputCode }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Invalid code");
      setLoggedIn(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle single-digit input
  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...codeDigits];
    newDigits[index] = value;
    setCodeDigits(newDigits);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
    if (!value && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // Handle key events for better UX
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleEmailKeyPress = (e) => {
    if (e.key === "Enter" && email && !loading) {
      sendCode();
    }
  };

  const handleCodeComplete = () => {
    if (inputCode.length === 6 && !loading) {
      verifyCode();
    }
  };

  if (loggedIn) return <PwCSearchBar />;

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
      <div style={{ width: "100%", maxWidth: "28rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "4rem",
            height: "4rem",
            backgroundColor: "#ea580c",
            borderRadius: "1rem",
            marginBottom: "1rem",
            boxShadow: "0 10px 25px -5px rgba(234, 88, 12, 0.3)"
          }}>
            <Shield color="white" size={24} />
          </div>
          <h1 style={{ 
            fontSize: "2rem", 
            fontWeight: "bold", 
            color: "#1f2937", 
            marginBottom: "0.5rem" 
          }}>
            Welcome to <span style={{ color: "#ea580c" }}>PwC</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "1rem" }}>
            {!codeSent ? "Sign in to access Trust Analyzer" : "Enter the verification code sent to your email"}
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
          {!codeSent ? (
            <div style={{ 
              opacity: 0,
              animation: "slideInUp 0.5s ease forwards"
            }}>
              {/* Email Input */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem"
                }}>
                  Email Address
                </label>
                <div style={{
                  position: "relative",
                  transform: emailFocused ? "scale(1.02)" : "scale(1)",
                  transition: "transform 0.3s ease"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "white",
                    borderRadius: "0.75rem",
                    border: `2px solid ${emailFocused ? "#ea580c" : "#e2e8f0"}`,
                    boxShadow: emailFocused ? "0 10px 25px -5px rgba(234, 88, 12, 0.2)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ paddingLeft: "1rem" }}>
                      <Mail size={20} color={emailFocused ? "#ea580c" : "#94a3b8"} />
                    </div>
                    <input
                      type="email"
                      placeholder="your.name@pwc.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      onKeyPress={handleEmailKeyPress}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "1rem",
                        fontSize: "1rem",
                        backgroundColor: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#1f2937"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Send Code Button */}
              <button
                onClick={sendCode}
                disabled={!email || loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  fontWeight: "600",
                  fontSize: "1rem",
                  border: "none",
                  cursor: !email || loading ? "not-allowed" : "pointer",
                  backgroundColor: !email || loading ? "#f1f5f9" : "#ea580c",
                  color: !email || loading ? "#94a3b8" : "white",
                  boxShadow: !email || loading ? "none" : "0 10px 15px -3px rgba(234, 88, 12, 0.3)",
                  transform: !email || loading ? "none" : "scale(1)",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = "#dc2626";
                    e.target.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = "#ea580c";
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: "1rem",
                      height: "1rem",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Verification Code
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ 
              opacity: 0,
              animation: "slideInUp 0.5s ease forwards"
            }}>
              {/* Code Input */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                  textAlign: "center"
                }}>
                  Enter 6-digit verification code
                </label>
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "0.5rem",
                  marginBottom: "1rem"
                }}>
                  {codeDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={digit}
                      onChange={(e) => {
                        handleDigitChange(idx, e.target.value);
                        setTimeout(handleCodeComplete, 50);
                      }}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      ref={(el) => (inputsRef.current[idx] = el)}
                      maxLength={1}
                      disabled={loading}
                      style={{
                        width: "3rem",
                        height: "3rem",
                        textAlign: "center",
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        borderRadius: "0.5rem",
                        border: `2px solid ${digit ? "#ea580c" : "#e2e8f0"}`,
                        backgroundColor: "white",
                        color: "#1f2937",
                        outline: "none",
                        transition: "all 0.3s ease",
                        boxShadow: digit ? "0 5px 15px -3px rgba(234, 88, 12, 0.2)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#ea580c";
                        e.target.style.boxShadow = "0 5px 15px -3px rgba(234, 88, 12, 0.3)";
                      }}
                      onBlur={(e) => {
                        if (!digit) {
                          e.target.style.borderColor = "#e2e8f0";
                          e.target.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Verify Button */}
              <button
                onClick={verifyCode}
                disabled={loading || codeDigits.includes("")}
                style={{
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  fontWeight: "600",
                  fontSize: "1rem",
                  border: "none",
                  cursor: loading || codeDigits.includes("") ? "not-allowed" : "pointer",
                  backgroundColor: loading || codeDigits.includes("") ? "#f1f5f9" : "#ea580c",
                  color: loading || codeDigits.includes("") ? "#94a3b8" : "white",
                  boxShadow: loading || codeDigits.includes("") ? "none" : "0 10px 15px -3px rgba(234, 88, 12, 0.3)",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = "#dc2626";
                    e.target.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = "#ea580c";
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: "1rem",
                      height: "1rem",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }}></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Continue
                    <Check size={18} />
                  </>
                )}
              </button>

              {/* Back Button */}
              <button
                onClick={() => {
                  setCodeSent(false);
                  setCodeDigits(["", "", "", "", "", ""]);
                  setError("");
                }}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  padding: "0.5rem",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  textDecoration: "underline"
                }}
              >
                Back to email input
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.75rem",
              padding: "1rem",
              marginTop: "1rem",
              animation: "shake 0.5s ease-in-out"
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
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center" }}>
          <p style={{
            color: "#64748b",
            fontSize: "0.875rem",
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
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}