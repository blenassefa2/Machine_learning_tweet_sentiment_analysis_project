import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { keyframes } from "@emotion/react";
import { useSession } from "../context/SessionContext";
import { uploadDataset } from "../api/datasets";

const primaryColor = "#646cff";

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string>("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { sessionId } = useSession();

  // ---------------- Drag & Drop ----------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  // ---------------- File Selection ----------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  // ---------------- Upload Function ----------------
  const uploadFile = async (file: File) => {
    try {
      const data = await uploadDataset(file, sessionId);
      
      
      setUploadedDatasetId(data.dataset_id);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1500); // reset after showing
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadProgress(0);
    }
  };

  // ---------------- Render ----------------
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg" sx={{ width: "100%" }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            sx={{ fontWeight: 600, mb: 1, color: "#fff", textAlign: "center", animation: `${fadeInUp} 0.8s ease-out` }}
          >
            File Upload Center
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "#ccc", mb: 3, textAlign: "center", px: { xs: 2, md: 0 }, animation: `${fadeInUp} 0.8s ease-out 0.2s both` }}
          >
            Drag and drop your CSV or TXT files or click to browse.
          </Typography>

          <Paper
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: "center",
              backgroundColor: "#0f0f11",
              border: `1px dashed ${isDragging ? primaryColor : "#1a1a1c"}`,
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.3s ease",
              "&:hover": { borderColor: primaryColor, backgroundColor: "#111113", transform: "translateY(-5px)", boxShadow: `0 10px 30px ${primaryColor}20` },
            }}
          >
            <CloudUpload sx={{ fontSize: { xs: 48, md: 64 }, color: primaryColor, mb: 2 }} />
            <Typography variant={isMobile ? "body1" : "h6"} sx={{ color: "#fff", mb: 2 }}>
              Drop your CSV or TXT here or click to select
            </Typography>

            <input type="file" hidden id="file-upload" onChange={handleFileSelect} accept=".csv,.txt" />
            <label htmlFor="file-upload">
              <Button component="span" variant="contained" sx={{ backgroundColor: primaryColor, color: "#fff", px: 4, py: 1.5, '&:hover': { backgroundColor: "#5058e6", transform: "scale(1.05)" } }}>
                Browse Files
              </Button>
            </label>

            {uploadProgress > 0 && (
              <Box sx={{ mt: 2, width: "100%", backgroundColor: "#222", borderRadius: 1 }}>
                <Box sx={{ width: `${uploadProgress}%`, height: 8, backgroundColor: primaryColor, borderRadius: 1, transition: "width 0.3s ease" }} />
              </Box>
            )}

            {uploadedDatasetId && (
              <Typography sx={{ mt: 1, textAlign: "center", color: "#fff" }}>
                Uploaded successfully! Dataset ID: {uploadedDatasetId}
              </Typography>
            )}
          </Paper>

          <Typography variant="body2" sx={{ color: "#999", mt: 2, textAlign: "center", px: { xs: 2, md: 0 } }}>
            Supported formats: CSV, TXT
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default FileUpload;