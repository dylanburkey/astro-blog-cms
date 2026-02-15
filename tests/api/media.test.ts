import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types
interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  uploadedBy: number;
  uploadedAt: string;
}

interface UploadOptions {
  file: {
    name: string;
    type: string;
    size: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  };
  alt?: string;
}

// Mock media service
class MediaService {
  private files: Map<string, MediaFile> = new Map();
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeFilename(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const base = name.replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
    return `${base}.${ext}`;
  }

  validateFile(file: { type: string; size: number }): { valid: boolean; error?: string } {
    if (!this.allowedTypes.includes(file.type)) {
      return { valid: false, error: `Invalid file type: ${file.type}` };
    }
    if (file.size > this.maxFileSize) {
      return { valid: false, error: `File too large: ${file.size} bytes (max ${this.maxFileSize})` };
    }
    return { valid: true };
  }

  async upload(options: UploadOptions, userId: number): Promise<MediaFile> {
    const validation = this.validateFile({ type: options.file.type, size: options.file.size });
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const id = this.generateId();
    const filename = this.sanitizeFilename(options.file.name);

    const media: MediaFile = {
      id,
      filename,
      originalName: options.file.name,
      mimeType: options.file.type,
      size: options.file.size,
      url: `/media/${id}/${filename}`,
      alt: options.alt || '',
      uploadedBy: userId,
      uploadedAt: new Date().toISOString()
    };

    this.files.set(id, media);
    return media;
  }

  async delete(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  async getById(id: string): Promise<MediaFile | undefined> {
    return this.files.get(id);
  }

  async list(options: {
    limit?: number;
    offset?: number;
    mimeType?: string;
  } = {}): Promise<{ files: MediaFile[]; total: number }> {
    let files = Array.from(this.files.values());

    if (options.mimeType) {
      files = files.filter(f => f.mimeType === options.mimeType);
    }

    files.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    const total = files.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    files = files.slice(offset, offset + limit);

    return { files, total };
  }

  async updateAlt(id: string, alt: string): Promise<MediaFile> {
    const file = this.files.get(id);
    if (!file) throw new Error('File not found');
    
    file.alt = alt;
    return file;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getImageDimensions(buffer: ArrayBuffer): { width: number; height: number } | null {
    // Simplified mock - would use actual image parsing in production
    return { width: 1920, height: 1080 };
  }

  clear(): void {
    this.files.clear();
  }
}

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    service = new MediaService();
  });

  describe('sanitizeFilename', () => {
    it('should convert to lowercase', () => {
      expect(service.sanitizeFilename('MyFile.JPG')).toBe('myfile.jpg');
    });

    it('should replace special characters with hyphens', () => {
      expect(service.sanitizeFilename('my file (1).jpg')).toBe('my-file-1.jpg');
    });

    it('should collapse multiple hyphens', () => {
      expect(service.sanitizeFilename('my---file.jpg')).toBe('my-file.jpg');
    });

    it('should preserve extension', () => {
      expect(service.sanitizeFilename('test.PNG')).toBe('test.png');
      expect(service.sanitizeFilename('test.JPEG')).toBe('test.jpeg');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(200) + '.jpg';
      const result = service.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(104); // 100 + dot + ext
    });
  });

  describe('validateFile', () => {
    it('should accept valid image types', () => {
      const types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      types.forEach(type => {
        expect(service.validateFile({ type, size: 1000 })).toEqual({ valid: true });
      });
    });

    it('should reject invalid types', () => {
      const result = service.validateFile({ type: 'application/pdf', size: 1000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files over 10MB', () => {
      const size = 11 * 1024 * 1024;
      const result = service.validateFile({ type: 'image/jpeg', size });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should accept files under 10MB', () => {
      const size = 9 * 1024 * 1024;
      const result = service.validateFile({ type: 'image/jpeg', size });
      expect(result.valid).toBe(true);
    });
  });

  describe('upload', () => {
    const mockFile = {
      name: 'test.jpg',
      type: 'image/jpeg',
      size: 1024,
      arrayBuffer: async () => new ArrayBuffer(1024)
    };

    it('should upload a valid file', async () => {
      const media = await service.upload({ file: mockFile }, 1);

      expect(media.id).toBeDefined();
      expect(media.filename).toBe('test.jpg');
      expect(media.originalName).toBe('test.jpg');
      expect(media.mimeType).toBe('image/jpeg');
      expect(media.url).toContain('/media/');
    });

    it('should set alt text if provided', async () => {
      const media = await service.upload({ 
        file: mockFile, 
        alt: 'Test image' 
      }, 1);

      expect(media.alt).toBe('Test image');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = { ...mockFile, type: 'application/pdf' };
      
      await expect(
        service.upload({ file: invalidFile }, 1)
      ).rejects.toThrow('Invalid file type');
    });

    it('should reject oversized files', async () => {
      const bigFile = { ...mockFile, size: 15 * 1024 * 1024 };
      
      await expect(
        service.upload({ file: bigFile }, 1)
      ).rejects.toThrow('File too large');
    });
  });

  describe('delete', () => {
    it('should delete existing file', async () => {
      const mockFile = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        arrayBuffer: async () => new ArrayBuffer(1024)
      };
      
      const media = await service.upload({ file: mockFile }, 1);
      const result = await service.delete(media.id);
      
      expect(result).toBe(true);
      expect(await service.getById(media.id)).toBeUndefined();
    });

    it('should return false for non-existent file', async () => {
      const result = await service.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const files = [
        { name: 'img1.jpg', type: 'image/jpeg', size: 1000, arrayBuffer: async () => new ArrayBuffer(0) },
        { name: 'img2.png', type: 'image/png', size: 2000, arrayBuffer: async () => new ArrayBuffer(0) },
        { name: 'img3.gif', type: 'image/gif', size: 3000, arrayBuffer: async () => new ArrayBuffer(0) },
      ];
      
      for (const file of files) {
        await service.upload({ file }, 1);
      }
    });

    it('should list all files', async () => {
      const { files, total } = await service.list();
      expect(files).toHaveLength(3);
      expect(total).toBe(3);
    });

    it('should filter by mimeType', async () => {
      const { files } = await service.list({ mimeType: 'image/jpeg' });
      expect(files).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const { files } = await service.list({ limit: 2 });
      expect(files).toHaveLength(2);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(service.formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(service.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(service.formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('updateAlt', () => {
    it('should update alt text', async () => {
      const mockFile = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024,
        arrayBuffer: async () => new ArrayBuffer(1024)
      };
      
      const media = await service.upload({ file: mockFile }, 1);
      const updated = await service.updateAlt(media.id, 'New alt text');
      
      expect(updated.alt).toBe('New alt text');
    });

    it('should throw for non-existent file', async () => {
      await expect(
        service.updateAlt('non-existent', 'Alt')
      ).rejects.toThrow('File not found');
    });
  });
});
