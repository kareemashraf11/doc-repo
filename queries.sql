
-- QUERY 1: Get all documents accessible to a user in their department

SELECT
    d.id,
    d.title,
    d.description,
    d.permission_level,
    d.created_at,
    d.current_version,
    u.first_name || ' ' || u.last_name AS uploader_name,
    u.email AS uploader_email,
    dept.name AS department_name,
    STRING_AGG(t.name, ', ') AS tags
FROM
    documents d
    INNER JOIN users u ON d.uploader_id = u.id
    LEFT JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN document_tags dt ON d.id = dt.document_id
    LEFT JOIN tags t ON dt.tag_id = t.id
WHERE
    d.is_deleted = FALSE
    AND (
        d.permission_level = 'public'
        OR
        (d.permission_level = 'department'
         AND d.department_id = (SELECT department_id FROM users WHERE id = :user_id))
        OR
        d.uploader_id = :user_id
    )
GROUP BY
    d.id, d.title, d.description, d.permission_level, d.created_at,
    d.current_version, u.first_name, u.last_name, u.email, dept.name
ORDER BY
    d.created_at DESC;


-- QUERY 2: Get the 10 most recently uploaded documents tagged as 'Finance'

SELECT
    d.id,
    d.title,
    d.description,
    d.created_at,
    d.current_version,
    u.first_name || ' ' || u.last_name AS uploader_name,
    dept.name AS department_name,
    dv.file_name,
    dv.file_size,
    dv.upload_date AS latest_upload_date
FROM
    documents d
    INNER JOIN users u ON d.uploader_id = u.id
    LEFT JOIN departments dept ON d.department_id = dept.id
    INNER JOIN document_tags dt ON d.id = dt.document_id
    INNER JOIN tags t ON dt.tag_id = t.id
    LEFT JOIN document_versions dv ON d.id = dv.document_id
        AND dv.version_number = d.current_version
WHERE
    t.name = 'Finance'
    AND d.is_deleted = FALSE
ORDER BY
    d.created_at DESC
LIMIT 10;


-- QUERY 3: Find all versions of a given document (by document ID)

SELECT
    dv.id AS version_id,
    dv.version_number,
    dv.file_name,
    dv.file_path,
    dv.file_size,
    dv.mime_type,
    dv.checksum,
    dv.upload_date,
    dv.change_notes,
    u.first_name || ' ' || u.last_name AS uploaded_by_name,
    u.email AS uploaded_by_email,
    dv.file_size - LAG(dv.file_size) OVER (ORDER BY dv.version_number) AS size_diff
FROM
    document_versions dv
    LEFT JOIN users u ON dv.uploaded_by = u.id
WHERE
    dv.document_id = :document_id
ORDER BY
    dv.version_number DESC;


-- QUERY 4: Get the number of documents uploaded by each department in the last 30 days

SELECT
    dept.id AS department_id,
    dept.name AS department_name,
    COUNT(DISTINCT d.id) AS document_count,
    COUNT(DISTINCT d.uploader_id) AS unique_uploaders,
    SUM(dv.file_size) AS total_storage_bytes,
    ROUND(AVG(dv.file_size) / 1024.0 / 1024.0, 2) AS avg_file_size_mb,
    MIN(d.created_at) AS first_upload,
    MAX(d.created_at) AS last_upload
FROM
    departments dept
    LEFT JOIN documents d ON dept.id = d.department_id
        AND d.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND d.is_deleted = FALSE
    LEFT JOIN document_versions dv ON d.id = dv.document_id
        AND dv.version_number = d.current_version
GROUP BY
    dept.id, dept.name
ORDER BY
    document_count DESC, dept.name;


-- Most popular tags
SELECT
    t.name AS tag_name,
    COUNT(DISTINCT dt.document_id) AS document_count,
    COUNT(DISTINCT d.uploader_id) AS unique_users,
    MAX(d.created_at) AS most_recent_use
FROM
    tags t
    LEFT JOIN document_tags dt ON t.id = dt.tag_id
    LEFT JOIN documents d ON dt.document_id = d.id AND d.is_deleted = FALSE
GROUP BY
    t.id, t.name
ORDER BY
    document_count DESC;
