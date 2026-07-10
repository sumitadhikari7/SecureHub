import { useState } from "react";
import Navbar from "../components/Navbar";
import "./CreateAuction.css";

function CreateAuction() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startingPrice: "",
    endTime: "",
    status: "upcoming",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newAuction = {
      title: formData.title,
      description: formData.description,
      startingPrice: parseFloat(formData.startingPrice),
      endTime: formData.endTime,
      status: formData.status,
      image: imageFile,
      createdAt: new Date().toISOString(),
    };

    console.log("New auction:", newAuction);
  };

  return (
    <>
      <Navbar />

      <div className="create-auction">
        <div className="create-auction-hero">
          <h1>Create Auction</h1>
          <p>List an item and let the bidding begin</p>
        </div>

        <div className="create-auction-form-section">
          <form className="create-auction-form" onSubmit={handleSubmit}>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Vintage Rolex Watch"
              value={formData.title}
              onChange={handleChange}
              required
            />

            <label htmlFor="image">Item Image</label>
            <div className="image-upload">
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />

              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="image-preview"
                />
              )}
            </div>

            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Describe the item's condition, history, and details"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              required
            />

            <div className="form-group">
              <div className="form-field">
                <label htmlFor="startingPrice">Starting Price ($)</label>
                <input
                  id="startingPrice"
                  name="startingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.startingPrice}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="endTime">End Time</label>
                <input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="upcoming">Upcoming</option>
              <option value="in-progress">In Progress</option>
            </select>

            <div className="created-at-note">
              Created at will be set automatically to the current time on
              submit.
            </div>

            <button type="submit" className="submit-btn">
              Create Auction
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default CreateAuction;

