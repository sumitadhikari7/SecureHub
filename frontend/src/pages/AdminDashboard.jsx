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

    // 2. Fetch stats
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
    { id: 1, label: "Total Users", value: statsData.totalUsers.toLocaleString() },
    { id: 2, label: "Flagged Accounts", value: statsData.flaggedAccounts, alert: statsData.flaggedAccounts > 0 },
    { id: 3, label: "Pending Collateral", value: statsData.pendingCollateral, alert: statsData.pendingCollateral > 0 },
    { id: 4, label: "Active Auctions", value: statsData.activeAuctions.toLocaleString() }
  ];

  const dashboardItems = [
    { id: 1, icon: "👥", title: "Manage Users", path: "/admin-manage-users" },
    { id: 2, icon: "🚨", title: "Fraud Accounts", path: "/admin-fraud-accounts" },
    { id: 3, icon: "📋", title: "Collateral Requests", path: "/admin-collateral-requests" },
    { id: 4, icon: "🗂️", title: "Manage Collateral", path: "/admin-manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const adminInitials = admin.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "AD";

  if (loading) return <div style={{ color: "white", padding: "2rem" }}>Loading Command Center... 🛡️</div>;

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
              className={`sidebar-nav-link ${location.pathname === item.path ? "active" : ""}`}
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
          Logout 🚪
        </button>
      </aside>

      <main className="admin-dashboard-content">
        <div className="admin-dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, fraud reports, and collateral from one place.</p>
        </div>

        <div className="admin-stats-grid">
          {stats.map((stat) => (
            <div className={`stat-card ${stat.alert ? "stat-alert" : ""}`} key={stat.id}>
              <p className="stat-label">{stat.label}</p>
              <h2 className="stat-value">{stat.value}</h2>
            </div>
          ))}
        </div>

        <div className="admin-dashboard-grid">
          {dashboardItems.map((item) => (
            <Link to={item.path} className="admin-card" key={item.id}>
              <div className="admin-card-icon">{item.icon}</div>
              <h3>{item.title}</h3>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;