import { useState } from "react";
import "./CreateAuction.css";
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
      setErrorMsg("Error: The start time cannot be in the past!");
      return;
    }

    if (endVal < now) {
      setErrorMsg("Error: The end time must be in the future!");
      return;
    }

    if (endVal <= startVal) {
      setErrorMsg("Error: The end time must be set after the start time!");
      return;
    }
    const dataToSend = new FormData();
    dataToSend.append("title", formData.title);
    dataToSend.append("description", formData.description);
    dataToSend.append("startingPrice", formData.startingPrice);
    dataToSend.append("startTime", formData.startTime);
    dataToSend.append("endTime", formData.endTime);
    
    if (imageFile) {
      dataToSend.append("image", imageFile);
    }

    try {
      const response = await fetch("http://localhost:5000/api/auctions", {
        method: "POST",
        credentials: "include",
        body: dataToSend,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create auction");

      setSuccessMsg("Auction listed successfully!");
      setFormData({ title: "", description: "", startingPrice: "", startTime: "", endTime: "" });
      setImageFile(null);
      setImagePreview(null);
      
      const fileInput = document.getElementById("image");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    }
  };