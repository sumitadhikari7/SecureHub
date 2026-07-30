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
