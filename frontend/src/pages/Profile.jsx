import { useState } from "react";
import Navbar from "../components/Navbar";
import "./Profile.css";

function Profile() {
  const [profileImage, setProfileImage] = useState(null);

  const user = {
    fullName: "John Doe",
    username: "johndoe23",
    email: "johndoe@example.com",
    phone: "+977 9812345678",
    address: "Kathmandu, Nepal",
    dob: "12 Aug 1998",
    password: "••••••••••"
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
  };

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

            <h3 className="photo-username">{user.fullName}</h3>
            <p className="photo-handle">@{user.username}</p>

            <div className="photo-actions">
              <label className="choose-photo-btn">
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />
              </label>
              <button
                type="button"
                className="remove-photo-btn"
                onClick={handleRemoveImage}
              >
                Remove Photo
              </button>
            </div>
          </div>

          <div className="details-column">

            <form className="profile-form">

              <label>Full Name</label>
              <input type="text" value={user.fullName} disabled />

              <div className="form-group">
                <div className="form-field">
                  <label>Username</label>
                  <input type="text" value={user.username} disabled />
                </div>

                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={user.email} disabled />
                </div>
              </div>

              <div className="form-group">
                <div className="form-field">
                  <label>Phone Number</label>
                  <input type="text" value={user.phone} disabled />
                </div>
                <div className="form-field">
                  <label>Date of Birth</label>
                  <input type="text" value={user.dob} disabled />
                </div>
              </div>

              <label>Address</label>
              <input type="text" value={user.address} disabled />

              <label>Password</label>
              <input type="password" value={user.password} disabled />

              <button className="submit-btn">Edit Profile</button>

            </form>

          </div>

        </div>

      </div>
    </>
  );
}

export default Profile;



