import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Pagination,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { documentService } from '../services/api';
import { Document, PaginatedDocuments } from '../types';
import toast from 'react-hot-toast';

interface Uploader {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedUploader, setSelectedUploader] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableUploaders, setAvailableUploaders] = useState<Uploader[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response: PaginatedDocuments = await documentService.searchDocuments({
        query: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        uploader_id: selectedUploader || undefined,
        page,
        page_size: 12,
      });
      setDocuments(response.items);
      setTotal(response.total_pages);
    } catch (error: any) {
      toast.error('Failed to fetch documents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [tagsData, uploadersData] = await Promise.all([
        documentService.getAvailableTags(),
        documentService.getAvailableUploaders()
      ]);
      setAvailableTags(tagsData.tags);
      setAvailableUploaders(uploadersData.uploaders);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchFilters(); 
  }, [page, searchQuery, selectedTags, selectedUploader]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const handleTagChange = (event: SelectChangeEvent<typeof selectedTags>) => {
    const value = event.target.value;
    setSelectedTags(typeof value === 'string' ? value.split(',') : value);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedUploader('');
    setPage(1);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <DescriptionIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Document Repository
          </Typography>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem disabled>{user?.email || 'User'}</MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  placeholder="Search documents by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                />
                <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
                  Search
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Tags</InputLabel>
                  <Select
                    multiple
                    value={selectedTags}
                    onChange={handleTagChange}
                    input={<OutlinedInput label="Filter by Tags" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availableTags.map((tag) => (
                      <MenuItem key={tag} value={tag}>
                        {tag}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Uploader</InputLabel>
                  <Select
                    value={selectedUploader}
                    onChange={(e) => setSelectedUploader(e.target.value)}
                    input={<OutlinedInput label="Filter by Uploader" />}
                  >
                    <MenuItem value="">All Users</MenuItem>
                    {availableUploaders.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {(searchQuery || selectedTags.length > 0 || selectedUploader) && (
                  <Button variant="outlined" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                onClick={() => navigate('/upload')}
              >
                Upload Document
              </Button>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : documents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <DescriptionIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No documents found
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => navigate('/upload')}
            >
              Upload Your First Document
            </Button>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {documents.map((doc) => (
                <Grid item xs={12} sm={6} md={4} key={doc.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" gutterBottom noWrap>
                        {doc.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {doc.description || 'No description'}
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        {doc.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Uploaded by: {doc.uploader_name || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Version: {doc.current_version} | {formatDate(doc.created_at)}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {total > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={total}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};
