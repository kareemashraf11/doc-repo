export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department_id?: string;
  role_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department_id?: string;
  role_id?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  permission_level: string;
  uploader_id: string;
  department_id?: string;
  created_at: string;
  updated_at: string;
  current_version: number;
  is_deleted: boolean;
  uploader_name?: string;
  department_name?: string;
  tags: string[];
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  checksum?: string;
  uploaded_by?: string;
  upload_date: string;
  change_notes?: string;
  uploaded_by_name?: string;
}

export interface DocumentDetail extends Document {
  latest_version?: DocumentVersion;
  version_count: number;
}

export interface PaginatedDocuments {
  items: Document[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchParams {
  query?: string;
  tags?: string[];
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}
