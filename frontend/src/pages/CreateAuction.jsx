import { useState } from "react";
import "./CreateAuction.css";

function CreateAuction() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startingPrice: "",
    endTime: "",
    status: "in-progress",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    
    const dataToSend = new FormData();
    dataToSend.append("title", formData.title);
    dataToSend.append("description", formData.description);
    dataToSend.append("startingPrice", formData.startingPrice);
    dataToSend.append("endTime", formData.endTime);
    dataToSend.append("status", formData.status);
    
    if (imageFile) {
      dataToSend.append("image", imageFile);
    }

    try {
    
      const response = await fetch("http://localhost:5000/api/auctions", {
        method: "POST",
        body: dataToSend,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to create auction");

      setSuccessMsg("Auction listed successfully! 🎉");
      
      
      setFormData({
        title: "",
        description: "",
        startingPrice: "",
        endTime: "",
        status: "upcoming",
      });
      setImageFile(null);
      setImagePreview(null);
      
      // Wipe the file input value from the DOM explicitly
      const fileInput = document.getElementById("image");
      if (fileInput) fileInput.value = "";

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="create-auction">
      <div className="create-auction-hero">
        <h1>Create Auction</h1>
        <p>List an item and let the bidding begin</p>
      </div>

      <div className="create-auction-form-section">
        {/* Dynamic Alerts */}
        {errorMsg && <div className="auth-alert error" style={{color: 'red', textAlign:'center', marginBottom: '15px'}}>{errorMsg}</div>}
        {successMsg && <div className="auth-alert success" style={{color: 'green', textAlign:'center', marginBottom: '15px'}}>{successMsg}</div>}

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
              <img src={imagePreview} alt="Preview" className="image-preview" style={{maxWidth: '200px', display: 'block', marginTop: '10px'}} />
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

          <div className="created-at-note" style={{fontSize: '12px', margin: '10px 0', color: '#666'}}>
            Created at will be set automatically to the current time on submit.
          </div>

          <button type="submit" className="submit-btn">
            Create Auction
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateAuction;