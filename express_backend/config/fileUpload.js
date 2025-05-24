const multer = require('multer');
const path = require('path');
const crypto = require('crypto-js');
const sharp = require('sharp');
const fs = require('fs').promises;
const supabase = require('./db');

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY || 'chime-default-key-change-in-production';

// Configure multer to store files in memory instead of disk
const storage = multer.memoryStorage();

// Enhanced file filter with security checks
const fileFilter = (req, file, cb) => {
  // Allowed file types with detailed MIME type checking
  const allowedTypes = {
    // Images
    'image/jpeg': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/jpg': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/png': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/gif': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'image/webp': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    
    // Documents
    'application/pdf': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'application/msword': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 120 * 1024 * 1024, needsPreview: true },
    
    // Spreadsheets
    'application/vnd.ms-excel': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    
    // Presentations
    'application/vnd.ms-powerpoint': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    
    // Text files
    'text/plain': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'text/csv': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/json': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    
    // Archives
    'application/zip': { maxSize: 120 * 1024 * 1024, needsPreview: false },
    'application/x-zip-compressed': { maxSize: 120 * 1024 * 1024, needsPreview: false }
  };
  
  const fileConfig = allowedTypes[file.mimetype];
  
  if (!fileConfig) {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
    return;
  }
  
  // Store file config for later use
  file.fileConfig = fileConfig;
  cb(null, true);
};

// Configure multer with enhanced security and chunked upload support
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 120 * 1024 * 1024, // 120MB max (will be checked per file type)
    files: 1,
    fieldSize: 10 * 1024 * 1024, // 10MB for individual form fields (chunks)
  },
  fileFilter: fileFilter
});

// Separate configuration for chunk uploads
const chunkUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per chunk (larger than our 5MB chunks for safety)
    files: 1,
    fieldSize: 1024 * 1024, // 1MB for metadata fields
  },
  fileFilter: (req, file, cb) => {
    // Less strict validation for chunks - just check basic security
    if (file.fieldname === 'chunk') {
      cb(null, true);
    } else {
      cb(new Error('Invalid chunk upload'), false);
    }
  }
});

// Encrypt file buffer
const encryptFile = (buffer) => {
  try {
    const encrypted = crypto.AES.encrypt(buffer.toString('base64'), ENCRYPTION_KEY).toString();
    return Buffer.from(encrypted, 'utf8');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('File encryption failed');
  }
};

// Decrypt file buffer
const decryptFile = (encryptedBuffer) => {
  try {
    const decrypted = crypto.AES.decrypt(encryptedBuffer.toString('utf8'), ENCRYPTION_KEY);
    return Buffer.from(decrypted.toString(crypto.enc.Utf8), 'base64');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('File decryption failed');
  }
};

// Generate image thumbnail
const generateImageThumbnail = async (buffer, mimetype) => {
  try {
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return null;
  }
};

// Basic malware detection (file signature checking)
const basicMalwareCheck = (buffer, filename) => {
  const signatures = {
    // Executable file signatures
    'MZ': 'PE/COFF executable',
    '\x7fELF': 'ELF executable',
    '\xCA\xFE\xBA\xBE': 'Mach-O executable',
    
    // Archive bombs (nested archives)
    'PK': filename.toLowerCase().endsWith('.zip') ? null : 'Suspicious archive',
  };
  
  const header = buffer.slice(0, 4).toString();
  
  for (const [sig, threat] of Object.entries(signatures)) {
    if (header.startsWith(sig) && threat) {
      throw new Error(`Potential malware detected: ${threat}`);
    }
  }
  
  // Check for suspicious file extensions in ZIP files
  if (filename.toLowerCase().endsWith('.zip')) {
    // This is a basic check - in production, use a proper antivirus API
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif'];
    if (suspiciousExtensions.some(ext => filename.toLowerCase().includes(ext))) {
      throw new Error('Archive contains suspicious files');
    }
  }
  
  return true;
};

// Upload file to Supabase Storage with enhanced security
const uploadToSupabase = async (file, roomId, options = {}) => {
  try {
    // Security checks
    basicMalwareCheck(file.buffer, file.originalname);
    
    // Check file size against type-specific limits
    if (file.size > file.fileConfig.maxSize) {
      throw new Error(`File size exceeds limit for ${file.mimetype}`);
    }
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const name = path.basename(file.originalname, extension);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${roomId}/${uniqueSuffix}-${sanitizedName}${extension}`;

    console.log(`Processing file: ${file.originalname} (${formatFileSize(file.size)})`);

    // Encrypt file if requested
    let fileBuffer = file.buffer;
    let isEncrypted = false;
    
    if (options.encrypt) {
      fileBuffer = encryptFile(file.buffer);
      isEncrypted = true;
      console.log('File encrypted before upload');
    }

    // Upload main file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    let previewUrl = null;
    
    // Generate preview/thumbnail if supported
    if (file.fileConfig.needsPreview) {
      try {
        let previewBuffer = null;
        
        if (file.mimetype.startsWith('image/')) {
          previewBuffer = await generateImageThumbnail(file.buffer, file.mimetype);
        }
        
        if (previewBuffer) {
          const previewFileName = `${roomId}/previews/${uniqueSuffix}-${sanitizedName}_preview.jpg`;
          
          const { error: previewError } = await supabase.storage
            .from('chat-files')
            .upload(previewFileName, previewBuffer, {
              contentType: 'image/jpeg',
              cacheControl: '3600'
            });
          
          if (!previewError) {
            const { data: previewUrlData } = supabase.storage
              .from('chat-files')
              .getPublicUrl(previewFileName);
            
            previewUrl = previewUrlData.publicUrl;
            console.log('Preview generated successfully');
          }
        }
      } catch (previewError) {
        console.error('Preview generation failed:', previewError);
        // Don't fail the upload if preview generation fails
      }
    }

    console.log(`File uploaded successfully: ${urlData.publicUrl}`);

    return {
      fileName: data.path,
      publicUrl: urlData.publicUrl,
      previewUrl,
      isEncrypted,
      fileCategory: getFileCategory(file.mimetype),
      needsPreview: file.fileConfig.needsPreview
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

// Check if file type supports inline viewing
const supportsInlineViewing = (mimetype) => {
  const viewableTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain', 'application/json'
  ];
  return viewableTypes.includes(mimetype);
};

module.exports = {
  upload,
  chunkUpload,
  uploadToSupabase,
  getFileCategory,
  formatFileSize,
  supportsInlineViewing,
  encryptFile,
  decryptFile
}; 