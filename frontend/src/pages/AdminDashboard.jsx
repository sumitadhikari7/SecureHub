import { Link, useNavigate, useLocation } from "react-router-dom";
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: replace with actual logged-in admin data (from auth context/API)
  const admin = {
    name: "Admin",
    email: "admin@securehub.com",
    role: "Super Admin"
  };

  // TODO: replace with real numbers from API
  const stats = [
    { id: 1, label: "Total Users", value: "12,480" },
    { id: 2, label: "Flagged Accounts", value: "37", alert: true },
    { id: 3, label: "Pending Collateral", value: "14", alert: true },
    { id: 4, label: "Active Auctions", value: "902" }
  ];

  const dashboardItems = [
    { id: 1, icon: "👥", title: "Manage Users", path: "/admin-manage-users" },
    { id: 2, icon: "🚨", title: "Fraud Accounts", path: "/admin-fraud-accounts" },
    { id: 3, icon: "📋", title: "Collateral Requests", path: "/admin-collateral-requests" },
    { id: 4, icon: "🗂️", title: "Manage Collateral", path: "/admin-manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const handleLogout = () => {
    // TODO: clear admin auth/session here
    console.log("Admin logged out");
    navigate("/admin/login");
  };

  const initials = admin.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="admin-dashboard-page">

      <aside className="admin-sidebar">
        <div className="admin-avatar">{initials}</div>
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
          <h1>Admin Dashboard</h1>
          <p>Manage users, fraud reports, and collateral from one place.</p>
        </div>

        <div className="admin-stats-grid">
          {stats.map((stat) => (
            <div
              className={`stat-card ${stat.alert ? "stat-alert" : ""}`}
              key={stat.id}
            >
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
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>

      </main>

    </div>
  );
}

export default AdminDashboard;