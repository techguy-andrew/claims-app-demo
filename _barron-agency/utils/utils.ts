import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns display info for file types based on extension */
export function getFileTypeInfo(filename: string): { label: string; color: string; extension: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || 'file'

  const typeMap: Record<string, { label: string; color: string }> = {
    // PDF
    'pdf': { label: 'PDF', color: 'bg-red-600' },
    // Videos
    'mp4': { label: 'VIDEO', color: 'bg-violet-500' },
    'mov': { label: 'VIDEO', color: 'bg-violet-500' },
    'webm': { label: 'VIDEO', color: 'bg-violet-500' },
    'avi': { label: 'VIDEO', color: 'bg-violet-500' },
    'mkv': { label: 'VIDEO', color: 'bg-violet-500' },
    // Documents
    'doc': { label: 'DOC', color: 'bg-blue-500' },
    'docx': { label: 'DOC', color: 'bg-blue-500' },
    'txt': { label: 'TXT', color: 'bg-slate-500' },
    'rtf': { label: 'RTF', color: 'bg-blue-400' },
    // Spreadsheets
    'xls': { label: 'XLS', color: 'bg-green-600' },
    'xlsx': { label: 'XLS', color: 'bg-green-600' },
    'csv': { label: 'CSV', color: 'bg-green-500' },
    // Presentations
    'ppt': { label: 'PPT', color: 'bg-orange-500' },
    'pptx': { label: 'PPT', color: 'bg-orange-500' },
    // Archives
    'zip': { label: 'ZIP', color: 'bg-amber-600' },
    'rar': { label: 'RAR', color: 'bg-amber-600' },
    '7z': { label: '7Z', color: 'bg-amber-600' },
    // Code/Data
    'json': { label: 'JSON', color: 'bg-purple-500' },
    'xml': { label: 'XML', color: 'bg-purple-400' },
    'html': { label: 'HTML', color: 'bg-red-500' },
    // Audio
    'mp3': { label: 'MP3', color: 'bg-pink-500' },
    'wav': { label: 'WAV', color: 'bg-pink-500' },
    'm4a': { label: 'M4A', color: 'bg-pink-500' },
  }

  const info = typeMap[ext] || { label: ext.toUpperCase().slice(0, 4), color: 'bg-slate-400' }
  return { ...info, extension: ext.toUpperCase() }
}
