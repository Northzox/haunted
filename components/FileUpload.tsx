'use client';

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';

interface FileUploadProps {
  channelId: string;
  onUploadComplete?: (files: any[]) => void;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

export default function FileUpload({ 
  channelId, 
  onUploadComplete, 
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = [
    'image/*',
    'video/*',
    'audio/*',
    '.pdf',
    '.txt',
    '.doc',
    '.docx',
    '.zip',
    '.rar',
    '.7z',
  ]
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file size
    if (file.size > maxSize) {
      setError(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelId', channelId);

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          onUploadComplete?.([response.attachment]);
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadProgress(0);
          }, 1000);
        } else {
          const error = JSON.parse(xhr.responseText);
          setError(error.error || 'Upload failed');
          setIsUploading(false);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setError('Upload failed. Please try again.');
        setIsUploading(false);
      });

      xhr.addEventListener('abort', () => {
        setError('Upload cancelled.');
        setIsUploading(false);
      });

      // Send request
      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
      xhr.send(formData);

    } catch (error) {
      setError('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const getAuthToken = (): string => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth-token') {
        return value;
      }
    }
    return '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
          dragActive
            ? 'border-gray bg-near-black'
            : 'border-border hover:border-gray'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-4xl text-text-muted">
            📁
          </div>
          
          <div>
            <p className="text-text-primary font-medium">
              {isUploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </p>
            <p className="text-text-muted text-sm mt-1">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={isUploading}
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="secondary"
          >
            {isUploading ? 'Uploading...' : 'Choose File'}
          </Button>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="mt-4">
            <div className="w-full bg-dark-gray rounded-full h-2">
              <div
                className="bg-gray h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-text-muted text-sm mt-2">
              {Math.round(uploadProgress)}% complete
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-900 border border-red-800 text-red-200 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* File Type Info */}
      <div className="mt-4 text-xs text-text-muted">
        <p>Accepted file types:</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Images (JPEG, PNG, GIF, WebP, SVG)</li>
          <li>Videos (MP4, WebM, OGG)</li>
          <li>Audio (MP3, WAV, OGG, WebM)</li>
          <li>Documents (PDF, TXT, DOC, DOCX)</li>
          <li>Archives (ZIP, RAR, 7Z)</li>
        </ul>
      </div>
    </div>
  );
}
