import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminCollateralRequest.css";

const REVIEWED_STORAGE_KEY = "reviewedCollateralRequestIds";

function AdminCollateralRequests() {
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: replace with actual logged-in admin data (from auth context/API)
  const admin = {
    name: "Admin",
    email: "admin@securehub.com",
    role: "Super Admin"
  };

  const dashboardItems = [
    { id: 1, icon: "🏠", title: "Home", path: "/admin-dashboard" },
    { id: 2, icon: "👥", title: "Manage Users", path: "/admin-manage-users" },
    { id: 3, icon: "🚨", title: "Fraud Accounts", path: "/admin-fraud-accounts" },
    { id: 4, icon: "📋", title: "Collateral Requests", path: "/admin-collateral-requests" },
    { id: 5, icon: "🗂️", title: "Manage Collateral", path: "/admin-manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: replace with real API endpoint, e.g. /api/admin/collateral-requests
        const res = await fetch("/api/admin/collateral-requests", {
          credentials: "include"
        });

        if (!res.ok) {
          throw new Error("Failed to load collateral requests");
        }

        const data = await res.json();
        const list = data.requests || data;

        // Filter out any requests already handled in this session
        // (in case the list is refetched after returning from Manage Collateral)
        const reviewedIds = JSON.parse(
          sessionStorage.getItem(REVIEWED_STORAGE_KEY) || "[]"
        );
        setRequests(list.filter((r) => !reviewedIds.includes(r.id)));
      } catch (err) {
        setError(err.message || "Something went wrong while loading collateral requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleLogout = () => {
    // TODO: clear admin auth/session here
    console.log("Admin logged out");
    navigate("/admin/login");
  };

  const handleManage = (request) => {
    // Remove from the visible list right away
    setRequests((prev) => prev.filter((r) => r.id !== request.id));

    // Remember it was handled so it stays gone if this list is revisited
    const reviewedIds = JSON.parse(
      sessionStorage.getItem(REVIEWED_STORAGE_KEY) || "[]"
    );
    sessionStorage.setItem(
      REVIEWED_STORAGE_KEY,
      JSON.stringify([...reviewedIds, request.id])
    );

    // TODO: adjust route/params to match your Manage Collateral page
    navigate(`/admin/manage-collateral/${request.id}`);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

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
          <h1>Collateral Requests</h1>
          <p>Review pending collateral submissions from users.</p>
        </div>

        <div className="collateral-header-row">
          <div className="collateral-search">
            <span className="collateral-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="collateral-loading">Loading collateral requests...</div>
        ) : error ? (
          <div className="collateral-error">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="collateral-empty">No collateral requests found.</div>
        ) : (
          <div className="collateral-list">
            {filteredRequests.map((request) => (
              <div key={request.id} className="collateral-card">
                <div className="collateral-main">
                  <div className="collateral-avatar">
                    {getInitials(request.name)}
                  </div>
                  <div>
                    <div className="collateral-user-name">{request.name}</div>
                    <div className="collateral-user-email">{request.email}</div>
                    <div className="collateral-meta">
                      <span className="status-badge">Pending</span>
                      <span className="collateral-amount">
                        {request.amount ? `$${request.amount}` : "—"}
                      </span>
                      <span className="collateral-date">
                        Submitted{" "}
                        {request.submittedAt
                          ? new Date(request.submittedAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  className="action-btn manage"
                  onClick={() => handleManage(request)}
                >
                  Manage Collateral
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <p className="collateral-count">
            Showing {filteredRequests.length} of {requests.length} collateral requests
          </p>
        )}

      </main>

    </div>
  );
}

export default AdminCollateralRequests;