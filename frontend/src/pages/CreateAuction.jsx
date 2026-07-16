import { useState } from "react";
import "./CreateAuction.css";

function CreateAuction() {
  const getLocalISOString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startingPrice: "",
    startTime: "",
    endTime: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartNow = () => {
    const now = new Date();
    setFormData((prev) => ({ ...prev, startTime: getLocalISOString(now) }));
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

    const now = new Date();
    const startVal = new Date(formData.startTime);
    const endVal = new Date(formData.endTime);

    const oneMinuteAgo = new Date(now.getTime() - 60000);
    if (startVal < oneMinuteAgo) {
      setErrorMsg("Error: The start time cannot be in the past! ⏰");
      return;
    }

    if (endVal < now) {
      setErrorMsg("Error: The end time must be in the future! 🛑");
      return;
    }

    if (endVal <= startVal) {
      setErrorMsg("Error: The end time must be set after the start time! ⏳");
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append("title", formData.title);
    dataToSend.append("description", formData.description);
    dataToSend.append("startingPrice", formData.startingPrice);
    
    // Send string values directly to maintain timezone alignment
    dataToSend.append("startTime", formData.startTime);
    dataToSend.append("endTime", formData.endTime);
    
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
        startTime: "",
        endTime: "",
      });
      setImageFile(null);
      setImagePreview(null);
      
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
        {errorMsg && <div className="auth-alert error" style={{color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '6px', textAlign:'center', marginBottom: '15px'}}>{errorMsg}</div>}
        {successMsg && <div className="auth-alert success" style={{color: '#15803d', backgroundColor: '#dcfce7', border: '1px solid #86efac', padding: '12px', borderRadius: '6px', textAlign:'center', marginBottom: '15px'}}>{successMsg}</div>}

        <form className="create-auction-form" onSubmit={handleSubmit}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" type="text" placeholder="e.g. Vintage Rolex Watch" value={formData.title} onChange={handleChange} required />

          <label htmlFor="image">Item Image</label>
          <div className="image-upload">
            <input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" style={{maxWidth: '200px', borderRadius: '8px', display: 'block', marginTop: '10px'}} />}
          </div>

          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" placeholder="Describe the item details..." value={formData.description} onChange={handleChange} rows={4} required />

          <div className="form-group">
            <div className="form-field">
              <label htmlFor="startingPrice">Starting Price ($)</label>
              <input id="startingPrice" name="startingPrice" type="number" min="0" step="0.01" placeholder="0.00" value={formData.startingPrice} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group" style={{marginTop: '15px'}}>
            <div className="form-field">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <label htmlFor="startTime">Start Time</label>
                <button type="button" onClick={handleStartNow} style={{fontSize: '11px', padding: '2px 8px', cursor: 'pointer', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '4px'}}>⚡ Start Now</button>
              </div>
              <input id="startTime" name="startTime" type="datetime-local" value={formData.startTime} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="endTime">End Time</label>
              <input id="endTime" name="endTime" type="datetime-local" value={formData.endTime} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="submit-btn" style={{marginTop: '20px'}}>Create Auction</button>
        </form>
      </div>
    </div>
  );
}

export default CreateAuction;