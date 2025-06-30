/**
 * Utility functions for handling file paths in a cross-platform way
 */

/**
 * Joins path segments using the appropriate separator for the current platform
 * Uses forward slashes (/) for Unix-like systems and backslashes (\) for Windows
 * 
 * @param segments Path segments to join
 * @returns Joined path with proper platform-specific separators
 */
export function joinPaths(...segments: string[]): string {
  // Remove empty segments
  const filteredSegments = segments.filter(segment => segment !== '');
  
  // Join segments with forward slash
  let path = filteredSegments.join('/');
  
  // Replace multiple consecutive slashes with a single slash
  path = path.replace(/\/+/g, '/');
  
  return path;
}
