import { useState, useRef } from "react";
import api from "../lib/api";
import { UploadCloud } from "lucide-react";

export default function ReceiptUploader({ userId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("Awaiting receipt...");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setStatus(`Ready to upload: ${selectedFile.name}`);
      } else {
        setStatus("❌ Please select an image file");
      }
    }
  };

  const handleFileChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !userId) {
      setStatus("❌ Missing file or user not logged in");
      return;
    }

    setStatus("⏳ Uploading & processing...");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(`/upload/receipt?user_id=${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setStatus(`✅ Success! Parsed ₹${res.data.amount?.toFixed(2)} for ${res.data.category}`);
      onUploadSuccess();
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (e) {
      console.error("Upload failed:", e);
      setStatus(`❌ Upload failed: ${e.response?.data?.detail || e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-violet-600 mb-4 flex items-center gap-2">
        <UploadCloud size={20} aria-label="Upload icon" /> Receipt Uploader
      </h3>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'}`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {file ? (
          <p className="text-sm font-medium text-blue-600">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-500">
            {isUploading ? "Processing..." : "Click to select or drag & drop receipt"}
          </p>
        )}
      </div>
      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full mt-4 bg-violet-600 text-white py-2.5 rounded-lg hover:bg-violet-700 transition-colors font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isUploading ? "Processing..." : "Upload & Parse"}
      </button>
      <p className="text-xs text-center mt-2 text-gray-500 min-h-[16px]">{status}</p>
    </div>
  );
}
