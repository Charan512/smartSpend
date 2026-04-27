import { useState } from "react";
import api from "../lib/api";
import { FileUp, CheckCircle, XCircle } from "lucide-react";

export default function ImportCSV({ userId, onImport }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setStatus({ type: "", msg: "" });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(`/upload/csv?user_id=${userId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { imported = 0, skipped = 0 } = res.data;
      setStatus({ type: "success", msg: `Imported ${imported} expense(s)${skipped > 0 ? `, skipped ${skipped}` : ""}.` });
      onImport();
      setFile(null);
    } catch (error) {
      console.error("CSV import failed:", error);
      setStatus({ type: "error", msg: "Import failed. Please check the file format (date, description, amount)." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      <h3 className="font-bold text-orange-600 mb-4 flex items-center gap-2">
        <FileUp size={20} aria-label="File upload icon" /> Import from CSV
      </h3>
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".csv,.txt"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={loading}
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
      {file && (
        <p className="text-sm text-gray-600 mt-2">Selected: {file.name}</p>
      )}
      {status.msg && (
        <p className={`text-sm mt-2 flex items-center gap-1.5 ${status.type === "success" ? "text-green-600" : "text-red-600"}`}>
          {status.type === "success" ? <CheckCircle size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}
          {status.msg}
        </p>
      )}
    </div>
  );
}
