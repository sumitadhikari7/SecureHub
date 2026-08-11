/* eslint-disable no-unused-vars */
/* eslint-disable preserve-caught-error */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import './AdminAuthentication.css';

function AdminAuthentication() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
    
        setError("");

        try {
            const response = await fetch("http://localhost:5000/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
                credentials: "include"
            });

            // Grab the raw text first to inspect what the server sent back
            const textResponse = await response.text();
            let data;
            
            try {
                data = JSON.parse(textResponse);
            } catch (err) {
                // If it's not JSON (like a 404/500 HTML page), catch it here
                throw new Error(`Server error or route missing: ${textResponse.slice(0, 80)}...`);
            }

            if (!response.ok) {
                throw new Error(data.message || "Invalid credentials 🛑");
            }

            // Success -> Send them to the admin dashboard 🚪✨
            navigate("/admin-dashboard");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-card">
                <div className="admin-login-header">
                    <div className="admin-badge">🛡️</div>
                    <h1>SecureHub Admin</h1>
                    <p>Restricted access. Authorized personnel only.</p>
                </div>

                <form className="admin-login-form" onSubmit={handleSubmit}>
                    {error && <div className="admin-error">{error}</div>}

                    <label>Admin Email</label>
                    <input
                        type="email"
                        placeholder="admin@securehub.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit">Log In</button>
                </form>

                <div className="admin-login-footer">
                    <p>All login attempts are monitored and recorded.</p>
                </div>
            </div>
        </div>
    );
}

export default AdminAuthentication;