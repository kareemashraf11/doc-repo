import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { ArrowBack, CloudUpload } from '@mui/icons-material';
import { documentService } from '../services/api';
import toast from 'react-hot-toast';

const AVAILABLE_TAGS = ['Finance', 'Legal', 'Policy', 'Technical', 'Report', 'Contract', 'Confidential', 'Public', 'Training', 'Compliance'];

export const UploadDocument: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('department');
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('permission_level', permissionLevel);
    formData.append('tags', tags.join(','));

    try {
      await documentService.uploadDocument(formData);
      toast.success('Document uploaded successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Upload failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Upload Document
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Typography variant="h5" gutterBottom>
            Upload New Document
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              required
              label="Document Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Permission Level</InputLabel>
              <Select
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value)}
                label="Permission Level"
              >
                <MenuItem value="public">Public (All Users)</MenuItem>
                <MenuItem value="department">Department Only</MenuItem>
                <MenuItem value="restricted">Restricted</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Tags</InputLabel>
              <Select
                multiple
                value={tags}
                onChange={(e) => setTags(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                input={<OutlinedInput label="Tags" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {AVAILABLE_TAGS.map((tag) => (
                  <MenuItem key={tag} value={tag}>
                    {tag}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mt: 3, mb: 2 }}>
              <input
                accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.csv,.zip"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUpload />}
                  fullWidth
                >
                  {file ? file.name : 'Choose File'}
                </Button>
              </label>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !file}
              sx={{ mt: 2 }}
            >
              {loading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};
