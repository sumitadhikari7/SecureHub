import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminManageUsers.css";

function AdminManageUsers() {
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState({
    name: "Admin",
    email: "securehub.certified@gmail.com",
    role: "Super Admin"
  });

  const dashboardItems = [
    { id: 1, icon: "🏠", title: "Home", path: "/admin-dashboard" },
    { id: 2, icon: "👥", title: "Manage Users", path: "/admin-manage-users" },
    { id: 3, icon: "🚨", title: "Fraud Accounts", path: "/admin-fraud-accounts" },
    { id: 4, icon: "📋", title: "Collateral Requests", path: "/admin-collateral-requests" },
    { id: 5, icon: "🗂️", title: "Manage Collateral", path: "/admin-manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

    // 2. Fetch users and verify session via stats
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const statsRes = await fetch("http://localhost:5000/api/admin/stats", {
          credentials: "include"
        });
        if (!statsRes.ok) {
          navigate("/admin-authentication");
          return;
        }

        const res = await fetch("http://localhost:5000/api/admin/users", {
          credentials: "include"
        });

        if (!res.ok) {
          if (res.status === 401) {
            navigate("/admin-authentication");
            return;
          }
          throw new Error("Failed to load users");
        }

        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err.message || "Something went wrong while loading users.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/admin/logout", { method: "POST", credentials: "include" });
    navigate("/admin-authentication");
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to update status");

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch = u.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

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
          Logout 🚪
        </button>
      </aside>

      <main className="admin-dashboard-content">

        <div className="admin-dashboard-header">
          <h1>Manage Users</h1>
          <p>View, search, and update user account status.</p>
        </div>

        <div className="manage-users-header-row">
          <div className="manage-users-search">
            <span className="manage-users-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="manage-users-filters">
            {["all", "active", "suspended"].map((status) => (
              <button
                key={status}
                className={`filter-btn ${statusFilter === status ? "active" : ""}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="manage-users-table-wrapper">
          {loading ? (
            <div className="manage-users-loading">Loading users... 🛡️</div>
          ) : error ? (
            <div className="manage-users-error">{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="manage-users-empty">No users found.</div>
          ) : (
            <table className="manage-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-cell-avatar">
                          {user.profileImage ? (
                            <img 
                              src={user.profileImage} 
                              alt={user.name} 
                              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} 
                            />
                          ) : (
                            getInitials(user.name)
                          )}
                        </div>
                        <div>
                          <div className="user-cell-name">{user.name}</div>
                          <div className="user-cell-email">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span className={`status-badge status-${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <div className="manage-users-actions">
                        {user.status === "suspended" ? (
                          <button
                            className="action-btn activate"
                            onClick={() => handleStatusChange(user.id, "active")}
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            className="action-btn suspend"
                            onClick={() => handleStatusChange(user.id, "suspended")}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && (
          <p className="manage-users-count">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        )}

      </main>

    </div>
  );
}

export default AdminManageUsers;