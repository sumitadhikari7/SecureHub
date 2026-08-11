import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState({
    name: "Admin",
    email: "securehub.certified@gmail.com",
    role: "Super Admin"
  });
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    flaggedAccounts: 0,
    pendingCollateral: 0,
    activeAuctions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetch("http://localhost:5000/api/admin/stats", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setStatsData(data);
        setLoading(false);
      })
      .catch(() => {
        navigate("/admin-authentication");
      });
  }, [navigate]);

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/admin/logout", { method: "POST", credentials: "include" });
    navigate("/admin-authentication");
  };

  const stats = [
    { id: 1, label: "Total Users", value: statsData.totalUsers.toLocaleString(), icon: "fa-solid fa-users" },
    { id: 2, label: "Flagged Accounts", value: statsData.flaggedAccounts, alert: statsData.flaggedAccounts > 0, icon: "fa-solid fa-flag" },
    { id: 3, label: "Pending Collateral", value: statsData.pendingCollateral, alert: statsData.pendingCollateral > 0, icon: "fa-solid fa-hourglass-half" },
    { id: 4, label: "Active Auctions", value: statsData.activeAuctions.toLocaleString(), icon: "fa-solid fa-gavel" }
  ];

  const dashboardItems = [
    { id: 1, title: "Home", path: "/admin-dashboard", icon: "fa-solid fa-house", desc: "Overview of platform activity." },
    { id: 2, title: "Manage Users", path: "/admin-manage-users", icon: "fa-solid fa-user-gear", desc: "View, edit, and moderate accounts." },
    { id: 3, title: "Fraud Accounts", path: "/admin-fraud-accounts", icon: "fa-solid fa-triangle-exclamation", desc: "Review suspicious bidding activity." },
    { id: 4, title: "Collateral Requests", path: "/admin-collateral-requests", icon: "fa-solid fa-hand-holding-dollar", desc: "Approve or reject collateral claims." },
    { id: 6, title: "Flagged Accounts", path: "/admin-flagged-accounts", icon: "fa-solid fa-flag", desc: "Accounts reported by other users." }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const adminInitials = admin.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "AD";

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
              className={`sidebar-nav-link ${location.pathname === item.path ? "active" : ""}`}
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
          <h1>Admin Dashboard</h1>
          <p>Manage users, fraud reports, and collateral from one place.</p>
        </div>

        {loading ? (
          <div className="command-center-loading">
            <i className="fa-solid fa-spinner fa-spin"></i> Loading dashboard data…
          </div>
        ) : (
          <>
            <div className="admin-command-center-stats-grid">
              {stats.map((stat) => (
                <div className={`stat-card ${stat.alert ? "stat-alert" : ""}`} key={stat.id}>
                  <div className="stat-icon"><i className={stat.icon}></i></div>
                  <div className="stat-text">
                    <p className="stat-label">{stat.label}</p>
                    <h2 className="stat-value">{stat.value}</h2>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-command-center-grid">
              {dashboardItems.map((item) => (
                <Link to={item.path} className="admin-card" key={item.id}>
                  <div className="admin-card-icon"><i className={item.icon}></i></div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;