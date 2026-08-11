import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./AdminFraudAccounts.css";

const DURATION_PRESETS = [
  { label: "1 Day", value: 1, unit: "days" },
  { label: "3 Days", value: 3, unit: "days" },
  { label: "7 Days", value: 7, unit: "days" },
  { label: "14 Days", value: 14, unit: "days" },
  { label: "30 Days", value: 30, unit: "days" },
];

const DEMO_PRESET = { label: "1 Minute (Demo)", value: 1, unit: "minutes" };

function AdminFraudAccounts() {
  const navigate = useNavigate();
  const location = useLocation();

  const [admin, setAdmin] = useState({
    name: "Admin",
    email: "securehub.certified@gmail.com",
    role: "Super Admin",
  });

  const dashboardItems = [
    { id: 1, title: "Home", path: "/admin-dashboard", icon: "fa-solid fa-house" },
    { id: 2, title: "Manage Users", path: "/admin-manage-users", icon: "fa-solid fa-user-gear" },
    { id: 3, title: "Fraud Accounts", path: "/admin-fraud-accounts", icon: "fa-solid fa-triangle-exclamation" },
    { id: 4, title: "Collateral Requests", path: "/admin-collateral-requests", icon: "fa-solid fa-hand-holding-dollar" },
    { id: 6, title: "Flagged Accounts", path: "/admin-flagged-accounts", icon: "fa-solid fa-flag" },
  ];

  const motivationalQuote =
    "Trust is built in drops and lost in buckets. Every review you make protects it.";

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Review modal state
  const [activeAlert, setActiveAlert] = useState(null);
  // Selected duration is tracked as { value, unit } | null (null = custom input active)
  const [selectedPreset, setSelectedPreset] = useState(DURATION_PRESETS[2]); // default 7 days
  const [customDuration, setCustomDuration] = useState("");
  const [isPermanent, setIsPermanent] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
          email: data.email || "securehub.certified@gmail.com",
        }));
      })
      .catch(() => {
        navigate("/admin-authentication");
      });
      // eslint-disable-next-line 
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("http://localhost:5000/api/admin/fraud-alerts", {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          navigate("/admin-authentication");
          return;
        }
        throw new Error("Failed to load fraud alerts");
      }

      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      setError(err.message || "Something went wrong while loading fraud alerts.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
    navigate("/admin-authentication");
  };

  const openReview = (alert) => {
    setActiveAlert(alert);
    setSelectedPreset(DURATION_PRESETS[2]);
    setCustomDuration("");
    setIsPermanent(false);
    setReason("");
    setActionError(null);
  };

  const closeReview = () => {
    if (submitting) return;
    setActiveAlert(null);
  };

  // Resolves the current selection into { unit, value } | null (null only
  // when permanent, since permanent suspensions carry no duration).
  const resolveDuration = () => {
    if (isPermanent) return null;
    if (customDuration) {
      const n = Number(customDuration);
      return Number.isFinite(n) && n > 0
        ? { unit: "days", value: Math.floor(n) }
        : undefined; // invalid
    }
    return selectedPreset ? { unit: selectedPreset.unit, value: selectedPreset.value } : undefined;
  };

  const handleSuspend = async () => {
    if (!activeAlert) return;

    const duration = resolveDuration();
    if (!isPermanent && !duration) {
      setActionError("Choose a valid suspension length.");
      return;
    }
    if (!reason.trim()) {
      setActionError("A review reason is required before suspending an account.");
      return;
    }

    try {
      setSubmitting(true);
      setActionError(null);

      const res = await fetch(
        `http://localhost:5000/api/admin/fraud-alerts/${activeAlert.id}/suspend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            permanent: isPermanent,
            durationValue: duration ? duration.value : null,
            durationUnit: duration ? duration.unit : null,
            reason: reason.trim(),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to suspend account");

      await fetchAlerts();
      setActiveAlert(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!activeAlert) return;

    try {
      setSubmitting(true);
      setActionError(null);

      const res = await fetch(
        `http://localhost:5000/api/admin/fraud-alerts/${activeAlert.id}/dismiss`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reason: reason.trim() || null }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to dismiss alert");

      await fetchAlerts();
      setActiveAlert(null);
      setActiveAlert(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        a.name?.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.auctionTitle?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || a.alertStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [alerts, searchTerm, statusFilter]);

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

  const riskTier = (score) => {
    if (score >= 0.75) return "high";
    if (score >= 0.6) return "medium";
    return "low";
  };

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : "—");

  const isPresetActive = (preset) =>
    !isPermanent &&
    !customDuration &&
    selectedPreset?.value === preset.value &&
    selectedPreset?.unit === preset.unit;

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
          <h1>Flagged Accounts</h1>
          <p>Review model-flagged bidding activity and take action.</p>
        </div>

        <div className="fraud-header-row">
          <div className="fraud-search">
            <i className="fa-solid fa-magnifying-glass fraud-search-icon"></i>
            <input
              type="text"
              placeholder="Search by bidder or auction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="fraud-filters">
            {["all", "pending", "reviewed", "dismissed"].map((status) => (
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

        <div className="fraud-table-wrapper">
          {loading ? (
            <div className="fraud-loading">
              <i className="fa-solid fa-spinner fa-spin"></i> Loading fraud alerts…
            </div>
          ) : error ? (
            <div className="fraud-error">{error}</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="fraud-empty">No flagged accounts found.</div>
          ) : (
            <table className="fraud-table">
              <thead>
                <tr>
                  <th>Bidder</th>
                  <th>Auction</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Flagged On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-cell-avatar">{getInitials(alert.name)}</div>
                        <div>
                          <div className="user-cell-name">{alert.name}</div>
                          <div className="user-cell-email">{alert.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="auction-cell-title">
                        {alert.auctionTitle || `Auction #${alert.auctionId}`}
                      </div>
                    </td>
                    <td>
                      <span className={`risk-badge risk-${riskTier(alert.riskScore)}`}>
                        {(alert.riskScore * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={`alert-status-badge alert-status-${alert.alertStatus}`}>
                        {alert.alertStatus}
                      </span>
                      {alert.actionTaken === "suspended" && alert.suspendedUntil && (
                        <div className="alert-status-sub">
                          until {formatDate(alert.suspendedUntil)}
                        </div>
                      )}
                      {alert.actionTaken === "suspended" && !alert.suspendedUntil && (
                        <div className="alert-status-sub alert-status-sub-permanent">
                          permanent
                        </div>
                      )}
                    </td>
                    <td>{formatDate(alert.createdAt)}</td>
                    <td>
                      <div className="fraud-actions">
                        <button className="action-btn" onClick={() => openReview(alert)}>
                          {alert.alertStatus === "pending" ? "Review" : "View Details"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && (
          <p className="fraud-count">
            Showing {filteredAlerts.length} of {alerts.length} flagged accounts
          </p>
        )}
      </main>

      {activeAlert && (
        <div className="fraud-modal-overlay" onClick={closeReview}>
          <div className="fraud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fraud-modal-header">
              <h2>Fraud Alert Review</h2>
              <button className="fraud-modal-close" onClick={closeReview} aria-label="Close">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="fraud-modal-summary">
              <div className="fraud-modal-summary-row">
                <div className="user-cell">
                  <div className="user-cell-avatar">{getInitials(activeAlert.name)}</div>
                  <div>
                    <div className="user-cell-name">{activeAlert.name}</div>
                    <div className="user-cell-email">{activeAlert.email}</div>
                  </div>
                </div>
                <span className={`risk-badge risk-${riskTier(activeAlert.riskScore)}`}>
                  {(activeAlert.riskScore * 100).toFixed(1)}% risk
                </span>
              </div>

              <dl className="fraud-modal-details">
                <div>
                  <dt>Auction</dt>
                  <dd>{activeAlert.auctionTitle || `Auction #${activeAlert.auctionId}`}</dd>
                </div>
                <div>
                  <dt>Model prediction</dt>
                  <dd>{activeAlert.prediction}</dd>
                </div>
                <div>
                  <dt>Flagged on</dt>
                  <dd>{formatDate(activeAlert.createdAt)}</dd>
                </div>
                <div>
                  <dt>Current status</dt>
                  <dd className={`alert-status-badge alert-status-${activeAlert.alertStatus}`}>
                    {activeAlert.alertStatus}
                  </dd>
                </div>
              </dl>
            </div>

            {activeAlert.alertStatus === "pending" ? (
              <div className="fraud-modal-form">
                <label className="fraud-modal-label">Suspension length</label>
                <div className="duration-presets">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={`${preset.unit}-${preset.value}`}
                      type="button"
                      className={`duration-chip ${isPresetActive(preset) ? "active" : ""}`}
                      onClick={() => {
                        setIsPermanent(false);
                        setCustomDuration("");
                        setSelectedPreset(preset);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`duration-chip duration-chip-danger ${isPermanent ? "active" : ""}`}
                    onClick={() => setIsPermanent(true)}
                  >
                    Permanent
                  </button>
                </div>

                <div className="demo-duration-row">
                  <button
                    type="button"
                    className={`duration-chip duration-chip-demo ${
                      isPresetActive(DEMO_PRESET) ? "active" : ""
                    }`}
                    onClick={() => {
                      setIsPermanent(false);
                      setCustomDuration("");
                      setSelectedPreset(DEMO_PRESET);
                    }}
                  >
                    <i className="fa-solid fa-bolt"></i> {DEMO_PRESET.label}
                  </button>
                  <span className="demo-duration-hint">
                    For testing — auto-lifts after 60 seconds.
                  </span>
                </div>

                <div className="custom-duration-row">
                  <span>or custom:</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="days"
                    value={customDuration}
                    disabled={isPermanent}
                    onChange={(e) => {
                      setIsPermanent(false);
                      setCustomDuration(e.target.value);
                    }}
                  />
                  <span>days</span>
                </div>

                <label className="fraud-modal-label" htmlFor="review-reason">
                  Review notes / reason (required)
                </label>
                <textarea
                  id="review-reason"
                  className="fraud-modal-textarea"
                  placeholder="e.g. Rapid successive outbidding with 3x price jumps detected on Auction #36..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />

                {actionError && <div className="fraud-modal-error">{actionError}</div>}

                <div className="fraud-modal-actions">
                  <button
                    className="modal-btn modal-btn-ghost"
                    onClick={handleDismiss}
                    disabled={submitting}
                  >
                    Dismiss (false positive)
                  </button>
                  <button
                    className="modal-btn modal-btn-danger"
                    onClick={handleSuspend}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Suspend Account"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="fraud-modal-review-record">
                <h3>Review Record</h3>
                <dl className="fraud-modal-details">
                  <div>
                    <dt>Action taken</dt>
                    <dd className="capitalize">{activeAlert.actionTaken || "—"}</dd>
                  </div>
                  {activeAlert.actionTaken === "suspended" && (
                    <div>
                      <dt>Suspended until</dt>
                      <dd>
                        {activeAlert.suspendedUntil
                          ? formatDate(activeAlert.suspendedUntil)
                          : "Permanent"}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Reviewed by</dt>
                    <dd>{activeAlert.reviewedByName || activeAlert.reviewedBy || "—"}</dd>
                  </div>
                  <div>
                    <dt>Reviewed at</dt>
                    <dd>{formatDate(activeAlert.reviewedAt)}</dd>
                  </div>
                  <div className="fraud-modal-details-full">
                    <dt>Reason / notes</dt>
                    <dd>{activeAlert.suspensionReason || "No notes recorded."}</dd>
                  </div>
                </dl>
                <div className="fraud-modal-actions">
                  <button className="modal-btn modal-btn-ghost" onClick={closeReview}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFraudAccounts;