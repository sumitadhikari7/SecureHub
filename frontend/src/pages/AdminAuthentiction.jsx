import { useState } from "react";

function AdminAuthentication() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!email || !password) {
        setError("Please enter both email and password.");
        return;
        }
    
        setError("");
        console.log("Admin login attempt:", { email, password });
    }
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

