import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogContent,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import { CloudUpload, CheckCircle, Error as ErrorIcon } from "@mui/icons-material";
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

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
`;

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Reset file input to allow re-selecting the same file
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ---------------- Upload Function ----------------
  const uploadFile = async (file: File) => {
    // Reset state for new upload
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadedDatasetId("");
    setUploadedFileName(file.name);
    setErrorMessage("");
    setModalOpen(true);
    resetFileInput();

    // Simulate progress since axios doesn't give real upload progress without config
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const data = await uploadDataset(file, sessionId);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadedDatasetId(data.dataset_id);
      setUploadStatus('success');
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error("Upload failed:", err);
      setUploadStatus('error');
      setErrorMessage(err.response?.data?.detail || err.message || "Upload failed. Please try again.");
    }
  };

  // ---------------- Modal Close ----------------
  const handleCloseModal = () => {
    setModalOpen(false);
    // Keep success state visible briefly
    if (uploadStatus === 'success') {
      setTimeout(() => {
        setUploadStatus('idle');
      }, 500);
    } else {
      setUploadStatus('idle');
    }
  };

  // ---------------- Render ----------------
  return (
    <Box id="file-upload" sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: { xs: 6, md: 10 } }}>
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

            <input 
              type="file" 
              hidden 
              id="file-input" 
              ref={fileInputRef}
              onChange={handleFileSelect} 
              accept=".csv,.txt" 
            />
            <label htmlFor="file-input">
              <Button 
                component="span" 
                variant="contained" 
                disabled={uploadStatus === 'uploading'}
                sx={{ 
                  backgroundColor: primaryColor, 
                  color: "#fff", 
                  px: 4, 
                  py: 1.5, 
                  '&:hover': { backgroundColor: "#5058e6", transform: "scale(1.05)" },
                  '&:disabled': { backgroundColor: "#444", color: "#888" }
                }}
              >
                Browse Files
              </Button>
            </label>

            {/* Show last uploaded file info */}
            {uploadStatus === 'success' && uploadedDatasetId && !modalOpen && (
              <Box sx={{ mt: 3, p: 2, backgroundColor: "rgba(76, 175, 80, 0.1)", borderRadius: 2, border: "1px solid rgba(76, 175, 80, 0.3)" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: "#4caf50", fontSize: 20 }} />
                  <Typography sx={{ color: "#4caf50", fontWeight: 600 }}>
                    Upload Successful!
                  </Typography>
                </Box>
                <Typography sx={{ color: "#999", fontSize: "0.875rem" }}>
                  {uploadedFileName}
                </Typography>
                <Typography sx={{ color: "#ccc", fontSize: "0.75rem", mt: 0.5 }}>
                  Dataset ID: {uploadedDatasetId}
                </Typography>
              </Box>
            )}
          </Paper>

          <Typography variant="body2" sx={{ color: "#999", mt: 2, textAlign: "center", px: { xs: 2, md: 0 } }}>
            Supported formats: CSV, TXT
          </Typography>
        </Box>
      </Container>

      {/* Upload Progress Modal */}
      <Dialog
        open={modalOpen}
        onClose={uploadStatus !== 'uploading' ? handleCloseModal : undefined}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0f0f11',
            border: '1px solid #1a1a1c',
            borderRadius: 2,
          },
        }}
      >
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 3 }}>
            {uploadStatus === 'uploading' && (
              <>
                <Box sx={{ position: 'relative' }}>
                  <CircularProgress
                    size={80}
                    thickness={4}
                    sx={{ color: primaryColor }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <CloudUpload sx={{ fontSize: 32, color: primaryColor, animation: `${pulseAnimation} 1.5s ease-in-out infinite` }} />
                  </Box>
                </Box>
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>
                  Uploading...
                </Typography>
                <Typography sx={{ color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
                  {uploadedFileName}
                </Typography>
                <Box sx={{ width: '100%' }}>
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#1a1a1c',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: primaryColor,
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Typography sx={{ color: '#666', fontSize: '0.75rem', textAlign: 'center', mt: 1 }}>
                    {Math.round(uploadProgress)}%
                  </Typography>
                </Box>
              </>
            )}

            {uploadStatus === 'success' && (
              <>
                <CheckCircle sx={{ fontSize: 80, color: '#4caf50' }} />
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>
                  Upload Complete!
                </Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
                    {uploadedFileName}
                  </Typography>
                  <Typography sx={{ color: '#ccc', fontSize: '0.75rem', mt: 1, fontFamily: 'monospace' }}>
                    ID: {uploadedDatasetId}
                  </Typography>
                </Box>
                <Button
                  onClick={handleCloseModal}
                  variant="contained"
                  sx={{
                    backgroundColor: primaryColor,
                    color: '#fff',
                    px: 4,
                    mt: 1,
                    '&:hover': { backgroundColor: '#5058e6' },
                  }}
                >
                  Done
                </Button>
              </>
            )}

            {uploadStatus === 'error' && (
              <>
                <ErrorIcon sx={{ fontSize: 80, color: '#f44336' }} />
                <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>
                  Upload Failed
                </Typography>
                <Typography sx={{ color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
                  {errorMessage}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                  <Button
                    onClick={handleCloseModal}
                    variant="outlined"
                    sx={{
                      borderColor: '#444',
                      color: '#ccc',
                      '&:hover': { borderColor: '#666', backgroundColor: 'rgba(255,255,255,0.05)' },
                    }}
                  >
                    Close
                  </Button>
                  <label htmlFor="file-input">
                    <Button
                      component="span"
                      variant="contained"
                      onClick={() => setModalOpen(false)}
                      sx={{
                        backgroundColor: primaryColor,
                        color: '#fff',
                        '&:hover': { backgroundColor: '#5058e6' },
                      }}
                    >
                      Try Again
                    </Button>
                  </label>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FileUpload;
