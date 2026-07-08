import { useState } from "react";
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

