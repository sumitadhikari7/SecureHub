import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/me", { 
      method: "GET",
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        console.log("AUTH DEBUG - Status:", res.status, "Data:", data);
        
        if (res.status === 200) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("AUTH ERROR:", err);
        setIsAuthenticated(false);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading session...</div>;
  }

  // If NOT authenticated, go to "/" (Login)
  // If authenticated, show the child component (Dashboard, etc.)
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

export default ProtectedRoute;