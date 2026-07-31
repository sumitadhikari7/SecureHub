import { useState } from "react";
import "./CreateAuction.css";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

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

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleStartNow = () => {
    const now = new Date();

    setFormData((prev) => ({
      ...prev,
      startTime: getLocalISOString(now),
    }));
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
      setErrorMsg("Error: The start time cannot be in the past!");
      return;
    }


    if (endVal < now) {
      setErrorMsg("Error: The end time must be in the future!");
      return;
    }


    if (endVal <= startVal) {
      setErrorMsg(
        "Error: The end time must be after the start time!"
      );
      return;
    }


    const dataToSend = new FormData();

    dataToSend.append("title", formData.title);
    dataToSend.append("description", formData.description);
    dataToSend.append(
      "startingPrice",
      formData.startingPrice
    );
    dataToSend.append(
      "startTime",
      formData.startTime
    );
    dataToSend.append(
      "endTime",
      formData.endTime
    );


    if (imageFile) {
      dataToSend.append("image", imageFile);
    }


    try {

      const response = await fetch(
        "http://localhost:5000/api/auctions",
        {
          method: "POST",
          credentials: "include",
          body: dataToSend,
        }
      );


      const data = await response.json();


      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create auction"
        );
      }


      setSuccessMsg(
        "Auction listed successfully!"
      );


      setFormData({
        title: "",
        description: "",
        startingPrice: "",
        startTime: "",
        endTime: "",
      });


      setImageFile(null);
      setImagePreview(null);


      const fileInput =
        document.getElementById("image");

      if (fileInput) {
        fileInput.value = "";
      }


      // Optional redirect after creation
      // navigate("/browse-auction");


    } catch (err) {

      console.error(err);

      setErrorMsg(err.message);

    }
  };


  return (
    <>
      <Navbar />

      <div className="create-auction">

        <div className="create-auction-hero">

          <h1>Create Auction</h1>

          <p>
            List an item and let the bidding begin
          </p>

        </div>



        <div className="create-auction-form-section">


          {errorMsg && (
            <div
              className="auth-alert error"
              style={{
                color:"#b91c1c",
                backgroundColor:"#fee2e2",
                border:"1px solid #fca5a5",
                padding:"12px",
                borderRadius:"6px",
                textAlign:"center",
                marginBottom:"15px"
              }}
            >
              {errorMsg}
            </div>
          )}



          {successMsg && (
            <div
              className="auth-alert success"
              style={{
                color:"#15803d",
                backgroundColor:"#dcfce7",
                border:"1px solid #86efac",
                padding:"12px",
                borderRadius:"6px",
                textAlign:"center",
                marginBottom:"15px"
              }}
            >
              {successMsg}
            </div>
          )}



          <form
            className="create-auction-form"
            onSubmit={handleSubmit}
          >


            <label>
              Title
            </label>

            <input
              name="title"
              type="text"
              placeholder="e.g. Vintage Rolex Watch"
              value={formData.title}
              onChange={handleChange}
              required
            />



            <label>
              Item Image
            </label>


            <input
              id="image"
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




            <label>
              Description
            </label>


            <textarea
              name="description"
              placeholder="Describe the item details..."
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
            />



            <label>
              Starting Price ($)
            </label>


            <input
              name="startingPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.startingPrice}
              onChange={handleChange}
              required
            />



            <label>
              Start Time
            </label>


            <button
              type="button"
              onClick={handleStartNow}
            >
              ⚡ Start Now
            </button>


            <input
              name="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={handleChange}
              required
            />



            <label>
              End Time
            </label>


            <input
              name="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={handleChange}
              required
            />



            <button
              type="submit"
              className="submit-btn"
            >
              Create Auction
            </button>


          </form>

        </div>

      </div>


      <Footer />

    </>
  );
}


export default CreateAuction;