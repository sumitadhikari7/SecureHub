import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {socket} from "../socket";
import "./AdminCollateralRequest.css";

function AdminCollateralRequests() {
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

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

    // 2. Verify stats and fetch collateral requests
    fetch("http://localhost:5000/api/admin/stats", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(() => {
        return fetch("http://localhost:5000/api/admin/collateral-requests", {
          credentials: "include"
        });
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load collateral requests");
        return res.json();
      })
      .then((data) => {
        const list = data.requests || data;
        setRequests(list);
        setLoading(false);
      })
      .catch(() => {
        navigate("/admin-authentication");
      });
  }, [navigate]);

  useEffect(() => {                             
    const handleNewCollateralRequest = (newRequest) => {
      setRequests((prev) => {
        if (prev.some((r) => r.id === newRequest.id)) return prev;
        return [newRequest, ...prev];
      });
    };
    socket.on("newCollateralRequest", handleNewCollateralRequest);
    return () => {
      socket.off("newCollateralRequest", handleNewCollateralRequest);
    };
  }, []);                                      


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

  const handleManage = (request) => {
    navigate(`/admin-manage-collateral/${request.id}`);
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
          <h1>Collateral Requests</h1>
          <p>Review pending collateral submissions from users.</p>
        </div>

        <div className="collateral-header-row">
          <div className="collateral-search">
            <i className="fa-solid fa-magnifying-glass collateral-search-icon"></i>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="collateral-loading">
            <i className="fa-solid fa-spinner fa-spin"></i> Loading collateral requests…
          </div>
        ) : error ? (
          <div className="collateral-error">{error}</div>
        ) : filteredRequests.length === 0 ? (
          <div className="collateral-empty">No collateral requests found.</div>
        ) : (
          <div className="ledger-table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="requester-cell">
                        <div className="avatar-sm">{getInitials(request.name)}</div>
                        <div>
                          <div className="requester-name">{request.name}</div>
                          <div className="requester-email">{request.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">
                      {request.amount ? `$${request.amount}` : "—"}
                    </td>
                    <td className="mono">
                      {request.submittedAt
                        ? new Date(request.submittedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span className="stamp stamp-pending">Pending</span>
                    </td>
                    <td>
                      <button
                        className="btn-manage"
                        onClick={() => handleManage(request)}
                      >
                        Manage <i className="fa-solid fa-arrow-right"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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