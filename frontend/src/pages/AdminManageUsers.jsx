import { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminDashboard.css";
import "./AdminManageUsers.css";

function AdminManageUsers() {
  const navigate = useNavigate();
  const location = useLocation();

  // TODO: replace with actual logged-in admin data (from auth context/API)
  const admin = {
    name: "Admin",
    email: "admin@securehub.com",
    role: "Super Admin"
  };

  const dashboardItems = [
    { id: 1, icon: "👥", title: "Manage Users", desc: "View, suspend, or remove user accounts.", path: "/admin/users" },
    { id: 2, icon: "🚨", title: "Fraud Accounts", desc: "Review flagged accounts and take action.", path: "/admin/fraud-accounts" },
    { id: 3, icon: "📋", title: "Collateral Requests", desc: "Review pending collateral submissions.", path: "/admin/collateral-requests" },
    { id: 4, icon: "🗂️", title: "Manage Collateral", desc: "Approve, release, or hold user collateral.", path: "/admin/manage-collateral" }
  ];

  const motivationalQuote = "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const handleLogout = () => {
    // TODO: clear admin auth/session here
    console.log("Admin logged out");
    navigate("/admin/login");
  };

  const initials = admin.name.split(" ").map((n) => n[0]).join("").toUpperCase();

  // ---------------------------------------------------------------------
  // TODO: replace with real users from API (e.g. GET /api/admin/users)
  // ---------------------------------------------------------------------
  const [users, setUsers] = useState([
    { id: 1, name: "Alina Torres", email: "alina.torres@mail.com", role: "admin", status: "active", verified: true, joined: "2024-01-12", lastActive: "2h ago" },
    { id: 2, name: "Marcus Chen", email: "marcus.chen@mail.com", role: "moderator", status: "active", verified: true, joined: "2024-02-03", lastActive: "5h ago" },
    { id: 3, name: "Priya Nair", email: "priya.nair@mail.com", role: "user", status: "active", verified: true, joined: "2024-02-18", lastActive: "1d ago" },
    { id: 4, name: "Jonas Weber", email: "jonas.weber@mail.com", role: "user", status: "suspended", verified: false, joined: "2024-03-01", lastActive: "12d ago" },
    { id: 5, name: "Sofia Marino", email: "sofia.marino@mail.com", role: "user", status: "pending", verified: false, joined: "2024-03-22", lastActive: "—" },
    { id: 6, name: "David Okafor", email: "david.okafor@mail.com", role: "moderator", status: "active", verified: true, joined: "2024-04-09", lastActive: "30m ago" },
    { id: 7, name: "Elena Petrova", email: "elena.petrova@mail.com", role: "user", status: "active", verified: true, joined: "2024-04-14", lastActive: "3h ago" },
    { id: 8, name: "Ryan Ashford", email: "ryan.ashford@mail.com", role: "user", status: "suspended", verified: true, joined: "2024-05-02", lastActive: "20d ago" },
    { id: 9, name: "Mei Lin", email: "mei.lin@mail.com", role: "user", status: "active", verified: false, joined: "2024-05-19", lastActive: "6h ago" },
    { id: 10, name: "Tomás Herrera", email: "tomas.herrera@mail.com", role: "user", status: "pending", verified: false, joined: "2024-06-01", lastActive: "—" },
    { id: 11, name: "Grace Kim", email: "grace.kim@mail.com", role: "admin", status: "active", verified: true, joined: "2024-06-10", lastActive: "1h ago" },
    { id: 12, name: "Ibrahim Musa", email: "ibrahim.musa@mail.com", role: "user", status: "active", verified: true, joined: "2024-06-27", lastActive: "9h ago" }
  ]);

  // ---- Toolbar state ----
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // ---- Selection state ----
  const [selectedIds, setSelectedIds] = useState([]);

  // ---- Modal state ----
  const [modal, setModal] = useState(null); // { type: "add" | "edit" | "delete", user? }
  const [formState, setFormState] = useState({ name: "", email: "", role: "user" });

  // ---- Pagination ----
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(1);

  // ---- Derived: filtered + sorted users ----
  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });

    result.sort((a, b) => {
      const valA = a[sortBy]?.toString().toLowerCase() ?? "";
      const valB = b[sortBy]?.toString().toLowerCase() ?? "";
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, roleFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ---- Stats (derived from full user list) ----
  const stats = [
    { id: 1, label: "Total Users", value: users.length },
    { id: 2, label: "Active", value: users.filter((u) => u.status === "active").length },
    { id: 3, label: "Suspended", value: users.filter((u) => u.status === "suspended").length, alert: true },
    { id: 4, label: "Pending Review", value: users.filter((u) => u.status === "pending").length, alert: true }
  ];

  // ---- Handlers ----
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedUsers.map((u) => u.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setUserStatus = (id, status) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  };

  const bulkSetStatus = (status) => {
    setUsers((prev) =>
      prev.map((u) => (selectedIds.includes(u.id) ? { ...u, status } : u))
    );
    setSelectedIds([]);
  };

  const bulkDelete = () => {
    setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
    setSelectedIds([]);
  };

  const openAddModal = () => {
    setFormState({ name: "", email: "", role: "user" });
    setModal({ type: "add" });
  };

  const openEditModal = (user) => {
    setFormState({ name: user.name, email: user.email, role: user.role });
    setModal({ type: "edit", user });
  };

  const openDeleteModal = (user) => {
    setModal({ type: "delete", user });
  };

  const closeModal = () => setModal(null);

  const submitAdd = (e) => {
    e.preventDefault();
    const newUser = {
      id: Date.now(),
      name: formState.name,
      email: formState.email,
      role: formState.role,
      status: "pending",
      verified: false,
      joined: new Date().toISOString().slice(0, 10),
      lastActive: "—"
    };
    setUsers((prev) => [newUser, ...prev]);
    closeModal();
  };

  const submitEdit = (e) => {
    e.preventDefault();
    setUsers((prev) =>
      prev.map((u) =>
        u.id === modal.user.id
          ? { ...u, name: formState.name, email: formState.email, role: formState.role }
          : u
      )
    );
    closeModal();
  };

  const confirmDelete = () => {
    setUsers((prev) => prev.filter((u) => u.id !== modal.user.id));
    setSelectedIds((prev) => prev.filter((id) => id !== modal.user.id));
    closeModal();
  };

  const rowInitials = (name) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const sortIndicator = (field) =>
    sortBy === field ? (
      <span className="sort-arrow">{sortDir === "asc" ? "▲" : "▼"}</span>
    ) : null;

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
          Logout
        </button>
      </aside>

      <main className="admin-users-content">
        <div className="admin-users-header">
          <div className="admin-users-header-text">
            <h1>Manage Users</h1>
            <p>Search, review, and take action on every account in SecureHub.</p>
          </div>
          <button className="add-user-btn" onClick={openAddModal}>
            + Add User
          </button>
        </div>

        <div className="admin-users-stats">
          {stats.map((stat) => (
            <div className={`stat-card ${stat.alert ? "stat-alert" : ""}`} key={stat.id}>
              <p className="stat-label">{stat.label}</p>
              <h2 className="stat-value">{stat.value}</h2>
            </div>
          ))}
        </div>

        <div className="admin-users-toolbar">
          <div className="users-search">
            <span className="users-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="users-filter-select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="user">User</option>
          </select>

          <select
            className="users-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>

          <div className="users-toolbar-divider" />

          <div className="users-view-toggle">
            <button
              className={sortBy === "name" ? "active" : ""}
              onClick={() => toggleSort("name")}
              title="Sort by name"
            >
              Name
            </button>
            <button
              className={sortBy === "joined" ? "active" : ""}
              onClick={() => toggleSort("joined")}
              title="Sort by join date"
            >
              Joined
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="users-bulk-bar">
            <span>{selectedIds.length} user{selectedIds.length > 1 ? "s" : ""} selected</span>
            <div className="users-bulk-actions">
              <button className="bulk-action-btn" onClick={() => bulkSetStatus("active")}>
                Activate
              </button>
              <button className="bulk-action-btn" onClick={() => bulkSetStatus("suspended")}>
                Suspend
              </button>
              <button className="bulk-action-btn danger" onClick={bulkDelete}>
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="users-checkbox"
                    checked={
                      paginatedUsers.length > 0 &&
                      selectedIds.length === paginatedUsers.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="sortable" onClick={() => toggleSort("name")}>
                  User {sortIndicator("name")}
                </th>
                <th className="sortable" onClick={() => toggleSort("role")}>
                  Role {sortIndicator("role")}
                </th>
                <th className="sortable" onClick={() => toggleSort("status")}>
                  Status {sortIndicator("status")}
                </th>
                <th className="sortable" onClick={() => toggleSort("joined")}>
                  Joined {sortIndicator("joined")}
                </th>
                <th>Last Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id} className={selectedIds.includes(user.id) ? "row-selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      className="users-checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleSelectRow(user.id)}
                    />
                  </td>
                  <td>
                    <div className="user-identity">
                      <div className="user-mini-avatar">{rowInitials(user.name)}</div>
                      <div className="user-identity-text">
                        <div className="user-name">
                          {user.name}
                          {user.verified && <span className="verified-badge" title="Verified">✓</span>}
                        </div>
                        <div className="user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`status-pill status-${user.status}`}>
                      <span className="status-dot" />
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td>{user.joined}</td>
                  <td>{user.lastActive}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="row-action-btn"
                        title="Edit user"
                        onClick={() => openEditModal(user)}
                      >
                        ✎
                      </button>
                      {user.status === "suspended" ? (
                        <button
                          className="row-action-btn"
                          title="Reactivate user"
                          onClick={() => setUserStatus(user.id, "active")}
                        >
                          ▶
                        </button>
                      ) : (
                        <button
                          className="row-action-btn suspend"
                          title="Suspend user"
                          onClick={() => setUserStatus(user.id, "suspended")}
                        >
                          ⏸
                        </button>
                      )}
                      <button
                        className="row-action-btn delete"
                        title="Delete user"
                        onClick={() => openDeleteModal(user)}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedUsers.length === 0 && (
            <div className="users-empty-state">
              <div className="empty-icon">🕵️</div>
              <p>No users match your search or filters.</p>
            </div>
          )}
        </div>

        <div className="admin-users-footer">
          <span className="users-footer-count">
            Showing {paginatedUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
          </span>

          <div className="users-pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${page === p ? "active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </main>

      {modal?.type === "add" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Add New User</h2>
            <p className="modal-subtitle">Create an account on behalf of a user.</p>
            <form onSubmit={submitAdd}>
              <div className="modal-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
              </div>
              <div className="modal-field">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>
              <div className="modal-field">
                <label>Role</label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn-confirm">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal?.type === "edit" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Edit User</h2>
            <p className="modal-subtitle">Update account details for {modal.user.name}.</p>
            <form onSubmit={submitEdit}>
              <div className="modal-field">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                />
              </div>
              <div className="modal-field">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                />
              </div>
              <div className="modal-field">
                <label>Role</label>
                <select
                  value={formState.role}
                  onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn-confirm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal?.type === "delete" && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete User</h2>
            <p className="modal-subtitle">
              This permanently removes {modal.user.name} ({modal.user.email}) from SecureHub. This can't be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={closeModal}>
                Cancel
              </button>
              <button className="modal-btn-confirm danger" onClick={confirmDelete}>
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManageUsers;
