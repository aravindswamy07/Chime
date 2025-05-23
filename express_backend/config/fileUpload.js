const multer = require('multer');
const path = require('path');
const supabase = require('./db');

// Configure multer to store files in memory instead of disk
const storage = multer.memoryStorage();

// File filter for security
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/json'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Single file per request
  },
  fileFilter: fileFilter
});

// Upload file to Supabase Storage
const uploadToSupabase = async (file, roomId) => {
  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const name = path.basename(file.originalname, extension);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${roomId}/${uniqueSuffix}-${sanitizedName}${extension}`;

    console.log(`Uploading file to Supabase: ${fileName}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    console.log(`File uploaded successfully: ${urlData.publicUrl}`);

    return {
      fileName: data.path,
      publicUrl: urlData.publicUrl
    };

  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    throw error;
  }
};

// Helper function to get file type category
const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'spreadsheet';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'presentation';
  if (mimetype.startsWith('text/')) return 'text';
  if (mimetype.includes('zip')) return 'archive';
  return 'file';
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  upload,
  uploadToSupabase,
  getFileCategory,
  formatFileSize
}; 