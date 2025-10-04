import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  Download,
  History,
  Description as DescriptionIcon,
  Visibility,
  Delete,
  Upload,
} from '@mui/icons-material';
import { documentService } from '../services/api';
import { DocumentDetail, DocumentVersion } from '../types';
import toast from 'react-hot-toast';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [changeNotes, setChangeNotes] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocumentDetails();
    fetchVersions();
  }, [id]);

  const fetchDocumentDetails = async () => {
    if (!id) return;
    try {
      const data = await documentService.getDocument(id);
      setDoc(data);
    } catch (error: any) {
      toast.error('Failed to fetch document details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    if (!id) return;
    try {
      const data = await documentService.getDocumentVersions(id);
      setVersions(data);
    } catch (error: any) {
      console.error('Failed to fetch versions:', error);
    }
  };

  const handleDownload = async (version?: number) => {
    if (!id) return;
    try {
      const response = await documentService.downloadDocument(id, version);

      let filename = doc?.latest_version?.file_name || doc?.title || 'document';
      const contentDisposition = response.headers['content-disposition'];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error: any) {
      toast.error('Download failed');
      console.error(error);
    }
  };

  const handleView = async () => {
    if (!id) return;
    try {
      const response = await documentService.downloadDocument(id);
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (error: any) {
      toast.error('Failed to view document');
      console.error(error);
    }
  };

  const handleUploadVersion = async () => {
    if (!id || !newVersionFile) return;

    const formData = new FormData();
    formData.append('file', newVersionFile);
    if (changeNotes) {
      formData.append('change_notes', changeNotes);
    }

    try {
      await documentService.uploadVersion(id, formData);
      toast.success('New version uploaded successfully!');
      setUploadDialogOpen(false);
      setNewVersionFile(null);
      setChangeNotes('');
      fetchDocumentDetails();
      fetchVersions();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Upload failed');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await documentService.deleteDocument(id);
      toast.success('Document deleted successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Delete failed');
      console.error(error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!doc) {
    return (
      <Container>
        <Typography>Document not found</Typography>
      </Container>
    );
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <DescriptionIcon sx={{ mx: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {doc.title}
          </Typography>
          <Button
            color="inherit"
            startIcon={<Visibility />}
            onClick={handleView}
            sx={{ mr: 1 }}
          >
            View
          </Button>
          <Button
            color="inherit"
            startIcon={<Download />}
            onClick={() => handleDownload()}
            sx={{ mr: 1 }}
          >
            Download
          </Button>
          <Button
            color="inherit"
            startIcon={<Upload />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            New Version
          </Button>
          <Button
            color="inherit"
            startIcon={<Delete />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ padding: 3 }}>
              <Typography variant="h4" gutterBottom>
                {doc.title}
              </Typography>

              <Box sx={{ mb: 3 }}>
                {doc.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>

              <Typography variant="body1" paragraph>
                {doc.description || 'No description provided'}
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Uploaded By
                  </Typography>
                  <Typography variant="body1">
                    {doc.uploader_name || 'Unknown'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Department
                  </Typography>
                  <Typography variant="body1">
                    {doc.department_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(doc.created_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(doc.updated_at)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Current Version
                  </Typography>
                  <Typography variant="body1">
                    {doc.current_version}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Permission Level
                  </Typography>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {doc.permission_level}
                  </Typography>
                </Grid>
              </Grid>

              {doc.latest_version && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Current Version Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Filename:</strong> {doc.latest_version.file_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Size:</strong> {formatFileSize(doc.latest_version.file_size)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {doc.latest_version.mime_type || 'Unknown'}
                  </Typography>
                </>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ padding: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <History sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Version History ({versions.length})
                </Typography>
              </Box>

              <List>
                {versions.map((version, index) => (
                  <React.Fragment key={version.id}>
                    {index > 0 && <Divider />}
                    <ListItem
                      secondaryAction={
                        <Button
                          size="small"
                          onClick={() => handleDownload(version.version_number)}
                        >
                          Download
                        </Button>
                      }
                    >
                      <ListItemText
                        primary={`Version ${version.version_number}`}
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              {formatDate(version.upload_date)}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {version.uploaded_by_name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {formatFileSize(version.file_size)}
                            </Typography>
                            {version.change_notes && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {version.change_notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload New Version</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.csv,.zip"
              style={{ display: 'none' }}
              id="version-file-upload"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setNewVersionFile(e.target.files[0]);
                }
              }}
            />
            <label htmlFor="version-file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<Upload />}
                fullWidth
              >
                {newVersionFile ? newVersionFile.name : 'Choose File'}
              </Button>
            </label>
            <TextField
              fullWidth
              label="Change Notes (Optional)"
              multiline
              rows={3}
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUploadVersion} variant="contained" disabled={!newVersionFile}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this document? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
