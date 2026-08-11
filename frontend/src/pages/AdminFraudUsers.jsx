import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminFraudUsers.css";

function AdminFraudUsers() {
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState({
    name: "Admin",
    email: "securehub.certified@gmail.com",
    role: "Super Admin"
  });

  const dashboardItems = [
    { id: 1, title: "Home", path: "/admin-dashboard", icon: "fa-solid fa-house" },
    { id: 2, title: "Manage Users", path: "/admin-manage-users", icon: "fa-solid fa-user-gear" },
    { id: 3, title: "Fraud Accounts", path: "/admin-fraud-accounts", icon: "fa-solid fa-triangle-exclamation" },
    { id: 4, title: "Collateral Requests", path: "/admin-collateral-requests", icon: "fa-solid fa-hand-holding-dollar" },
    { id: 6, title: "Flagged Accounts", path: "/admin-flagged-accounts", icon: "fa-solid fa-flag" },
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const [flaggedUsers, setFlaggedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch Admin Session & Flagged Users on Mount with Access Guard
  useEffect(() => {
    // 1. Fetch real admin info
    fetch("http://localhost:5000/api/admin/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setAdmin((prev) => ({
          ...prev,
          name: data.name || "Admin",
          email: data.email || "securehub.certified@gmail.com"
        }));
      })
      .catch(() => {
        navigate("/admin-authentication");
      });

    // 2. Verify stats and fetch flagged accounts
    fetch("http://localhost:5000/api/admin/stats", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(() => {
        return fetch("http://localhost:5000/api/admin/flagged-accounts", {
          credentials: "include"
        });
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load flagged accounts");
        return res.json();
      })
      .then((data) => {
        setFlaggedUsers(data.flaggedAccounts || data);
        setLoading(false);
      })
      .catch(() => {
        navigate("/admin-authentication");
      });
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/admin/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    navigate("/admin-authentication");
  };

  const handleUnsuspend = async (userId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/unsuspend`, {
        method: "PATCH",
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to unsuspend user");

      setFlaggedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.message || "Could not unsuspend user.");
    }
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

  const adminInitials = getInitials(admin.name);

  return (
    <div className="admin-command-center-page">

      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-avatar">{adminInitials}</div>
          <h4>{admin.name}</h4>
          <p>{admin.email}</p>
          <span className="admin-role-tag">{admin.role}</span>
        </div>

        <nav className="sidebar-nav">
          {dashboardItems.map((item) => (
            <Link
              to={item.path}
              key={item.id}
              className={`sidebar-nav-link ${
                location.pathname === item.path ? "active" : ""
              }`}
            >
              <i className={`sidebar-nav-icon ${item.icon}`}></i>
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-quote">
          <p>"{motivationalQuote}"</p>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </aside>

      <main className="admin-command-center-content">

        <div className="admin-command-center-header">
          <h1>Fraud Accounts</h1>
          <p>Review suspended accounts and restore access when resolved.</p>
        </div>

        <div className="flagged-header-row">
          <div className="flagged-search">
            <i className="fa-solid fa-magnifying-glass flagged-search-icon"></i>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flagged-loading">
            <i className="fa-solid fa-spinner fa-spin"></i> Loading flagged accounts…
          </div>
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
                      <span className="flagged-status-badge">Suspended</span>
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
                  className="flagged-action-btn unsuspend"
                  onClick={() => handleUnsuspend(user.id)}
                >
                  Unsuspend
                </button>
              </div>
            ))}
          </div>
        )}

        {!error && (
          <p className="flagged-count">
            Showing {filteredUsers.length} of {flaggedUsers.length} flagged accounts
          </p>
        )}

      </main>

    </div>
  );
}

export default AdminFraudUsers;