import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

const LOCAL_PROJECTS_BASE = path.join(process.cwd(), 'tmp', 'local-projects');

/**
 * Ensure base directory exists
 */
function ensureBaseDirectory() {
  if (!fs.existsSync(LOCAL_PROJECTS_BASE)) {
    fs.mkdirSync(LOCAL_PROJECTS_BASE, { recursive: true });
  }
}

/**
 * Get project path
 */
export function getProjectPath(userId: string, projectId: string): string {
  return path.join(LOCAL_PROJECTS_BASE, userId, projectId);
}

/**
 * Validate path is within project directory (security)
 */
function validatePath(projectPath: string, requestedPath: string): string {
  const fullPath = path.join(projectPath, requestedPath);
  const normalizedPath = path.normalize(fullPath);
  
  // Prevent directory traversal attacks
  if (!normalizedPath.startsWith(projectPath)) {
    throw new Error('Invalid path: directory traversal detected');
  }
  
  return normalizedPath;
}

/**
 * Calculate directory size and file count
 */
function getDirectoryStats(dirPath: string): { size: number; fileCount: number } {
  let totalSize = 0;
  let fileCount = 0;

  function traverse(currentPath: string) {
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item.name);
      
      if (item.isDirectory()) {
        traverse(fullPath);
      } else if (item.isFile()) {
        totalSize += fs.statSync(fullPath).size;
        fileCount++;
      }
    }
  }

  traverse(dirPath);
  return { size: totalSize, fileCount };
}

/**
 * Extract zip file to project directory
 */
export async function extractZipToProject(
  zipBuffer: Buffer,
  userId: string,
  projectId: string,
  projectName: string
): Promise<{ path: string; fileCount: number; sizeBytes: number }> {
  ensureBaseDirectory();
  
  const projectPath = getProjectPath(userId, projectId);
  
  // Create user directory if it doesn't exist
  const userDir = path.join(LOCAL_PROJECTS_BASE, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  // Create project directory
  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true });
  }
  fs.mkdirSync(projectPath, { recursive: true });

  try {
    // Extract zip
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    
    // Find the root directory (if zip has a single root folder)
    let rootFolder: string | null = null;
    const topLevelItems = new Set<string>();
    
    for (const entry of zipEntries) {
      const parts = entry.entryName.split('/');
      if (parts.length > 0 && parts[0]) {
        topLevelItems.add(parts[0]);
      }
    }
    
    // If all files are in a single folder, use that as root
    if (topLevelItems.size === 1) {
      rootFolder = Array.from(topLevelItems)[0];
    }

    // Extract files
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      let relativePath = entry.entryName;
      
      // Strip root folder if it exists
      if (rootFolder && relativePath.startsWith(rootFolder + '/')) {
        relativePath = relativePath.substring(rootFolder.length + 1);
      }
      
      // Skip hidden files and common build directories
      if (shouldSkipFile(relativePath)) {
        continue;
      }
      
      const targetPath = path.join(projectPath, relativePath);
      const targetDir = path.dirname(targetPath);
      
      // Create directory structure
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(targetPath, entry.getData());
    }

    // Calculate stats
    const stats = getDirectoryStats(projectPath);
    
    return {
      path: path.join(userId, projectId),
      fileCount: stats.fileCount,
      sizeBytes: stats.size,
    };
  } catch (error: any) {
    // Cleanup on error
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    throw new Error(`Failed to extract zip: ${error.message}`);
  }
}

/**
 * Save uploaded files to project directory (for folder upload)
 */
export async function saveFilesToProject(
  files: Array<{ name: string; data: Buffer }>,
  userId: string,
  projectId: string
): Promise<{ path: string; fileCount: number; sizeBytes: number }> {
  ensureBaseDirectory();
  
  const projectPath = getProjectPath(userId, projectId);
  
  // Create directories
  const userDir = path.join(LOCAL_PROJECTS_BASE, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true });
  }
  fs.mkdirSync(projectPath, { recursive: true });

  try {
    let totalSize = 0;
    
    for (const file of files) {
      if (shouldSkipFile(file.name)) {
        continue;
      }
      
      const targetPath = path.join(projectPath, file.name);
      const targetDir = path.dirname(targetPath);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.writeFileSync(targetPath, file.data);
      totalSize += file.data.length;
    }

    const stats = getDirectoryStats(projectPath);
    
    return {
      path: path.join(userId, projectId),
      fileCount: stats.fileCount,
      sizeBytes: stats.size,
    };
  } catch (error: any) {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    throw new Error(`Failed to save files: ${error.message}`);
  }
}

/**
 * Delete project directory
 */
export function deleteProject(userId: string, projectId: string): void {
  const projectPath = getProjectPath(userId, projectId);
  
  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true });
  }
  
  // Clean up empty user directory
  const userDir = path.join(LOCAL_PROJECTS_BASE, userId);
  if (fs.existsSync(userDir) && fs.readdirSync(userDir).length === 0) {
    fs.rmSync(userDir, { recursive: true, force: true });
  }
}

/**
 * Get directory contents
 */
export function getDirectoryContents(
  userId: string,
  projectId: string,
  dirPath: string = ''
): Array<{ name: string; path: string; type: 'dir' | 'file'; size: number | null }> {
  const projectPath = getProjectPath(userId, projectId);
  const fullPath = validatePath(projectPath, dirPath);

  if (!fs.existsSync(fullPath)) {
    throw new Error('Path does not exist');
  }

  const items = fs.readdirSync(fullPath, { withFileTypes: true });

  const result = items
    .filter(item => !item.name.startsWith('.')) // Hide hidden files
    .map(item => {
      const itemPath = path.join(dirPath, item.name).replace(/\\/g, '/');
      const itemFullPath = path.join(fullPath, item.name);
      
      return {
        name: item.name,
        path: itemPath,
        type: (item.isDirectory() ? 'dir' : 'file') as 'dir' | 'file',
        size: item.isFile() ? fs.statSync(itemFullPath).size : null,
      };
    })
    .sort((a, b) => {
      // Folders first, then files, alphabetically
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return result;
}

/**
 * Get file contents
 */
export function getFileContents(
  userId: string,
  projectId: string,
  filePath: string
): string {
  const projectPath = getProjectPath(userId, projectId);
  const fullPath = validatePath(projectPath, filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error('File does not exist');
  }

  if (fs.statSync(fullPath).isDirectory()) {
    throw new Error('Path is a directory, not a file');
  }

  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Check if file should be skipped
 */
function shouldSkipFile(filePath: string): boolean {
  const skipPatterns = [
    // Hidden files
    /^\./,
    /\/\./,
    // Build directories
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.next/,
    /coverage/,
    /__pycache__/,
    /\.pytest_cache/,
    /\.venv/,
    /venv/,
    // IDE
    /\.vscode/,
    /\.idea/,
    // OS files
    /\.DS_Store/,
    /Thumbs\.db/,
  ];

  return skipPatterns.some(pattern => pattern.test(filePath));
}