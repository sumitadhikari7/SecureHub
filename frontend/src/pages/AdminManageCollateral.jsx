import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import "./AdminManageCollateral.css";

function AdminManageCollateral() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // TODO: replace with actual logged-in admin data (from auth context/API)
  const admin = {
    name: "Admin",
    email: "securehub.certified@gmail.com",
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

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newBalance, setNewBalance] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted] = useState(null); // "approved" | "rejected"

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: replace with real API endpoint, e.g. /api/admin/collateral-requests/:id
        const res = await fetch(`/api/admin/collateral-requests/${id}`, {
          credentials: "include"
        });

        if (!res.ok) {
          throw new Error("Failed to load this collateral request.");
        }

        const data = await res.json();
        const found = data.request || data;
        setRequest(found);
        setNewBalance(
          found?.currentBalance != null ? String(found.currentBalance) : ""
        );
      } catch (err) {
        setError(err.message || "Something went wrong while loading the request.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id]);

  const handleLogout = () => {
    // TODO: clear admin auth/session here
    console.log("Admin logged out");
    navigate("/admin/login");
  };

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

  const handleApprove = async (e) => {
    e.preventDefault();

    if (newBalance === "" || isNaN(Number(newBalance))) {
      setSubmitError("Enter a valid balance amount.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      // TODO: replace with real API endpoint, e.g. /api/admin/collateral-requests/:id/approve
      const res = await fetch(`/api/admin/collateral-requests/${id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balance: Number(newBalance),
          note
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update the user's balance.");
      }

      setSubmitted("approved");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while updating the balance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);

      // TODO: replace with real API endpoint, e.g. /api/admin/collateral-requests/:id/reject
      const res = await fetch(`/api/admin/collateral-requests/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note })
      });

      if (!res.ok) {
        throw new Error("Failed to reject this request.");
      }

      setSubmitted("rejected");
    } catch (err) {
      setSubmitError(err.message || "Something went wrong while rejecting the request.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestedDelta =
    request?.amount != null && request?.currentBalance != null
      ? request.currentBalance + Number(request.amount)
      : null;

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
          <h1>Manage Collateral</h1>
          <p>Review the request and update the user's balance.</p>
        </div>

        <Link to="/admin-collateral-requests" className="manage-back-link">
          ← Back to Collateral Requests
        </Link>

        {loading ? (
          <div className="manage-loading">Loading request...</div>
        ) : error ? (
          <div className="manage-error">{error}</div>
        ) : !request ? (
          <div className="manage-empty">This request could not be found.</div>
        ) : submitted ? (
          <div className="manage-success">
            {submitted === "approved"
              ? `Balance updated for ${request.name}.`
              : `Request from ${request.name} was rejected.`}
            <Link to="/admin-collateral-requests" className="action-btn manage-return">
              Return to Collateral Requests
            </Link>
          </div>
        ) : (
          <div className="manage-layout">
            <div className="manage-card collateral-card">
              <div className="collateral-main">
                <div className="collateral-avatar">{getInitials(request.name)}</div>
                <div>
                  <div className="collateral-user-name">{request.name}</div>
                  <div className="collateral-user-email">{request.email}</div>
                  <div className="collateral-meta">
                    <span className="status-badge">Pending</span>
                    <span className="collateral-date">
                      Submitted{" "}
                      {request.submittedAt
                        ? new Date(request.submittedAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="manage-card">
              <h3 className="manage-card-title">Request Details</h3>
              <div className="manage-detail-grid">
                <div className="manage-detail">
                  <span className="manage-detail-label">Current Balance</span>
                  <span className="manage-detail-value">
                    {request.currentBalance != null ? `$${request.currentBalance}` : "—"}
                  </span>
                </div>
                <div className="manage-detail">
                  <span className="manage-detail-label">Requested Amount</span>
                  <span className="manage-detail-value">
                    {request.amount != null ? `$${request.amount}` : "—"}
                  </span>
                </div>
                <div className="manage-detail">
                  <span className="manage-detail-label">Balance After Approval</span>
                  <span className="manage-detail-value">
                    {requestedDelta != null ? `$${requestedDelta}` : "—"}
                  </span>
                </div>
              </div>
              {request.reason && (
                <div className="manage-reason">
                  <span className="manage-detail-label">User's Note</span>
                  <p>{request.reason}</p>
                </div>
              )}
            </div>

            <form className="manage-card" onSubmit={handleApprove}>
              <h3 className="manage-card-title">Update Balance</h3>

              <label className="manage-field">
                <span className="manage-field-label">New Balance ($)</span>
                <input
                  type="number"
                  step="0.01"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="Enter the balance to set for this user"
                />
              </label>

              <label className="manage-field">
                <span className="manage-field-label">Admin Note (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add context for this decision"
                  rows={3}
                />
              </label>

              {submitError && <div className="manage-form-error">{submitError}</div>}

              <div className="manage-actions">
                <button
                  type="button"
                  className="action-btn reject"
                  onClick={handleReject}
                  disabled={submitting}
                >
                  Reject Request
                </button>
                <button
                  type="submit"
                  className="action-btn approve"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Approve & Update Balance"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminManageCollateral;