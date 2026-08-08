import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Profile.css";
import Footer from "../components/Footer";

const API_BASE = "http://localhost:5000";

function Profile() {
  // NOTE: there's no login/session system wired up yet, so this page assumes
  // whatever handles login stores the logged-in user's id in localStorage
  // under "userId". Swap this for real auth (a token, a session cookie,
  // etc.) once that exists.
  const navigate = useNavigate(); // NEW
  const [userId, setUserId] = useState(null); // CHANGED — no longer from localStorage
  const [checkingSession, setCheckingSession] = useState(true); // NE

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState({
    full_name: "",
    phone_number: "",
    address: "",
    dob: "",
  });

  const [profileImage, setProfileImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.userId) setUserId(data.userId);
      })
      .catch((err) => console.error("Session check failed:", err))
      .finally(() => setCheckingSession(false));
  }, []);

  const toAbsoluteImageUrl = (path) => (path ? `${API_BASE}${path}` : null);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/profile/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load profile");
      }

      setUser(data);
      setFormValues({
        full_name: data.full_name || "",
        phone_number: data.phone_number || "",
        address: data.address || "",
        dob: data.dob ? String(data.dob).slice(0, 10) : "",
      });
      setProfileImage(toAbsoluteImageUrl(data.profile_image));
      setLoadError(null);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleFieldChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;

    // Show the picked image immediately, then swap in the server's copy
    // once the upload finishes.
    const localPreview = URL.createObjectURL(file);
    setProfileImage(localPreview);

    const formData = new FormData();
    formData.append("photo", file);

    setUploadingPhoto(true);
    try {
      const response = await fetch(`${API_BASE}/api/profile/${userId}/photo`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload photo");
      }

      setProfileImage(toAbsoluteImageUrl(data.profile_image));
      setUser((prev) => (prev ? { ...prev, profile_image: data.profile_image } : prev));
    } catch (err) {
      console.error("Error uploading photo:", err);
      alert(`❌ ${err.message}`);
      setProfileImage(toAbsoluteImageUrl(user?.profile_image));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE}/api/profile/${userId}/photo`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to remove photo");
      }

      setProfileImage(null);
      setUser((prev) => (prev ? { ...prev, profile_image: null } : prev));
    } catch (err) {
      console.error("Error removing photo:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleEditToggle = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    // Currently editing, so this click means "save".
    if (!userId) return;

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/profile/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save profile");
      }

      setUser(data);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!user) return;
    setFormValues({
      full_name: user.full_name || "",
      phone_number: user.phone_number || "",
      address: user.address || "",
      dob: user.dob ? String(user.dob).slice(0, 10) : "",
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }

    navigate("/", { replace: true });
  };

  if (checkingSession) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <p style={{ textAlign: "center", marginTop: "50px" }}>Checking session...</p>
        </div>
      </>
    );
  }

  if (!userId) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <div className="profile-header">
            <h1>My Profile</h1>
            <p>You need to log in to view your account.</p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <p style={{ textAlign: "center", marginTop: "50px" }}>Loading profile...</p>
        </div>
      </>
    );
  }

  if (loadError || !user) {
    return (
      <>
        <Navbar />
        <div className="profile-page">
          <div className="profile-header">
            <h1>My Profile</h1>
            <p>{loadError || "Couldn't load your profile."}</p>
          </div>
        </div>
      </>
    );
  }

  // There's no `username` column in the users table, so the @handle shown
  // under the name is derived from the part of the email before the "@".
  const displayHandle = user.email ? user.email.split("@")[0] : "";

  return (
    <>
      <Navbar />
      <div className="profile-page">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>View and manage your account credentials.</p>
        </div>

        <div className="profile-section">
          <div className="photo-column">
            <div className="photo-preview-wrapper">
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="photo-preview" />
              ) : (
                <div className="photo-placeholder">No Photo Selected</div>
              )}
            </div>

            <h3 className="photo-username">{user.full_name}</h3>
            <p className="photo-handle">@{displayHandle}</p>

            <div className="photo-actions">
              <label className="choose-photo-btn">
                {uploadingPhoto ? "Uploading..." : "Choose Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingPhoto}
                  hidden
                />
              </label>
              <button
                type="button"
                className="remove-photo-btn"
                onClick={handleRemoveImage}
                disabled={uploadingPhoto || !profileImage}
              >
                Remove Photo
              </button>
              <button type="button" className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <div className="details-column">
            <form
              className="profile-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleEditToggle();
              }}
            >
              <label>Full Name</label>
              <input
                type="text"
                value={formValues.full_name}
                disabled={!isEditing}
                onChange={(e) => handleFieldChange("full_name", e.target.value)}
              />

              <div className="form-group">
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={user.email} disabled />
                </div>

                <div className="form-field">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={formValues.phone_number}
                    disabled={!isEditing}
                    onChange={(e) => handleFieldChange("phone_number", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="form-field">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={formValues.dob}
                    disabled={!isEditing}
                    onChange={(e) => handleFieldChange("dob", e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Address</label>
                  <input
                    type="text"
                    value={formValues.address}
                    disabled={!isEditing}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={saving}>
                  {isEditing ? (saving ? "Saving..." : "Save Changes") : "Edit Profile"}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="remove-photo-btn"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default Profile;