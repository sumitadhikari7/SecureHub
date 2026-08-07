import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminFraudUsers.css";

function AdminFraudUsers() {
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: replace with actual logged-in admin data (from auth context/API)
  const admin = {
    name: "Admin",
    email: "admin@securehub.com",
    role: "Super Admin"
  };

  const dashboardItems = [
    { id: 1, icon: "👥", title: "Manage Users", path: "/admin/users" },
    { id: 2, icon: "🚨", title: "Fraud Accounts", path: "/admin/fraud-accounts" },
    { id: 3, icon: "📋", title: "Collateral Requests", path: "/admin/collateral-requests" },
    { id: 4, icon: "🗂️", title: "Manage Collateral", path: "/admin/manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchFlaggedUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: replace with real API endpoint, e.g. /api/admin/flagged-accounts
        const res = await fetch("/api/admin/flagged-accounts", {
          credentials: "include"
        });

        if (!res.ok) {
          throw new Error("Failed to load flagged accounts");
        }

        const data = await res.json();
        setFlaggedUsers(data.flaggedAccounts || data);
      } catch (err) {
        setError(err.message || "Something went wrong while loading flagged accounts.");
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedUsers();
  }, []);

  const handleLogout = () => {
    // TODO: clear admin auth/session here
    console.log("Admin logged out");
    navigate("/admin/login");
  };

  const handleUnsuspend = async (userId) => {
    // TODO: call real API, e.g. PATCH /api/admin/users/:id/unsuspend
    setFlaggedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const filteredUsers = useMemo(() => {
    return flaggedUsers.filter((u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [flaggedUsers, searchTerm]);

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const adminInitials = admin.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="admin-dashboard-page">

      <aside className="admin-sidebar">
        <div className="admin-avatar">{adminInitials}</div>
        <h4>{admin.name}</h4>
        <p>{admin.email}</p>
        <span className="admin-role-tag">{admin.role}</span>

        <nav className="sidebar-nav">
          {dashboardItems.map((item) => (
            <Link
              to={item.path}
              key={item.id}
              className={`sidebar-nav-link ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="sidebar-quote">
          <p>"{motivationalQuote}"</p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="admin-dashboard-content">

        <div className="admin-dashboard-header">
          <h1>Flagged Accounts</h1>
          <p>Review suspended accounts and restore access when resolved.</p>
        </div>

        <div className="flagged-header-row">
          <div className="flagged-search">
            <span className="flagged-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flagged-loading">Loading flagged accounts...</div>
        ) : error ? (
          <div className="flagged-error">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="flagged-empty">No flagged accounts found.</div>
        ) : (
          <div className="flagged-list">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flagged-card">
                <div className="flagged-main">
                  <div className="flagged-avatar">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <div className="flagged-user-name">{user.name}</div>
                    <div className="flagged-user-email">{user.email}</div>
                    <div className="flagged-meta">
                      <span className="status-badge">Suspended</span>
                      <span className="flagged-date">
                        Since{" "}
                        {user.suspendedAt
                          ? new Date(user.suspendedAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="action-btn unsuspend"
                  onClick={() => handleUnsuspend(user.id)}
                >
                  Unsuspend
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <p className="flagged-count">
            Showing {filteredUsers.length} of {flaggedUsers.length} flagged accounts
          </p>
        )}

      </main>

    </div>
  );
}

export default AdminFraudUsers;