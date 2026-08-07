import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminFraudAccounts.css";

function AdminFraudUsers() {
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: replace with actual logged-in admin data (from auth context/API)
  const admin = {
    name: "Admin",
    email: "securehub.certified@gmai.com",
    role: "Super Admin"
  };

  const dashboardItems = [
    { id: 1, icon: "🏠", title: "Home", path: "/admin-dashboard" },
    { id: 2, icon: "👥", title: "Manage Users", path: "/admin/users" },
    { id: 3, icon: "🚨", title: "Fraud Accounts", path: "/admin/fraud-accounts" },
    { id: 4, icon: "📋", title: "Collateral Requests", path: "/admin/collateral-requests" },
    { id: 5, icon: "🗂️", title: "Manage Collateral", path: "/admin/manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const [flaggedAccounts, setFlaggedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    const fetchFlaggedAccounts = async () => {
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
        setFlaggedAccounts(data.flaggedAccounts || data);
      } catch (err) {
        setError(err.message || "Something went wrong while loading flagged accounts.");
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedAccounts();
  }, []);

  const handleLogout = () => {
    // TODO: clear admin auth/session here
    console.log("Admin logged out");
    navigate("/admin/login");
  };

  const handleDismiss = async (flagId) => {
    // TODO: call real API, e.g. PATCH /api/admin/flagged-accounts/:id/dismiss
    setFlaggedAccounts((prev) => prev.filter((f) => f.id !== flagId));
  };

  const handleSuspend = async (flagId, userId) => {
    // TODO: call real API, e.g. POST /api/admin/users/:id/suspend
    setFlaggedAccounts((prev) => prev.filter((f) => f.id !== flagId));
  };

  const filteredAccounts = useMemo(() => {
    return flaggedAccounts.filter((f) => {
      const matchesSearch = f.user?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSeverity =
        severityFilter === "all" || f.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [flaggedAccounts, searchTerm, severityFilter]);

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
          <p>Review accounts flagged for suspicious activity and take action.</p>
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

          <div className="flagged-filters">
            {["all", "low", "medium", "high"].map((sev) => (
              <button
                key={sev}
                className={`filter-btn ${severityFilter === sev ? "active" : ""}`}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flagged-loading">Loading flagged accounts...</div>
        ) : error ? (
          <div className="flagged-error">{error}</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flagged-empty">No flagged accounts found.</div>
        ) : (
          <div className="flagged-list">
            {filteredAccounts.map((flag) => (
              <div
                key={flag.id}
                className={`flagged-card severity-${flag.severity}`}
              >
                <div className="flagged-main">
                  <div className="flagged-avatar">
                    {getInitials(flag.user?.name)}
                  </div>
                  <div>
                    <div className="flagged-user-name">{flag.user?.name}</div>
                    <div className="flagged-user-email">{flag.user?.email}</div>
                    <p className="flagged-reason">{flag.reason}</p>
                    <div className="flagged-meta">
                      <span className={`severity-badge severity-${flag.severity}`}>
                        {flag.severity}
                      </span>
                      <span className="flagged-date">
                        Flagged{" "}
                        {flag.flaggedAt
                          ? new Date(flag.flaggedAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flagged-actions">
                  <button
                    className="action-btn suspend"
                    onClick={() => handleSuspend(flag.id, flag.user?.id)}
                  >
                    Suspend User
                  </button>
                  <button
                    className="action-btn dismiss"
                    onClick={() => handleDismiss(flag.id)}
                  >
                    Dismiss Flag
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <p className="flagged-count">
            Showing {filteredAccounts.length} of {flaggedAccounts.length} flagged accounts
          </p>
        )}

      </main>

    </div>
  );
}

export default AdminFraudUsers;