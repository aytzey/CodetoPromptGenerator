// pages/api/files/contents.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)
const exists = promisify(fs.exists)

type FileData = {
  path: string
  content: string
  tokenCount: number
}

type ResponseData = {
  success: boolean
  filesData?: FileData[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    const { path: basePath, files } = req.body

    if (!basePath || !Array.isArray(files)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      })
    }

    // Process files in parallel for better performance
    const filesDataPromises = files.map(async (filePath: string) => {
      const fullPath = path.join(basePath, filePath)
      
      // Check if file exists
      if (!(await exists(fullPath))) {
        return {
          path: filePath,
          content: `File not found on server: ${filePath}`,
          tokenCount: 0
        }
      }

      try {
        // Read file content
        const content = await readFile(fullPath, 'utf-8')
        
        // Perform a simple token count estimation
        // This is a simple approximation, you can use a more sophisticated tokenizer
        const tokenCount = estimateTokenCount(content)
        
        return {
          path: filePath,
          content,
          tokenCount
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error)
        return {
          path: filePath,
          content: `Error reading file: ${filePath}`,
          tokenCount: 0
        }
      }
    })

    const filesData = await Promise.all(filesDataPromises)

    return res.status(200).json({
      success: true,
      filesData
    })
  } catch (error) {
    console.error('Error processing file contents:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Simple token count estimation
 * This is a very simplified version - in production you'd want a more accurate tokenizer
 */
function estimateTokenCount(text: string): number {
  // Split by whitespace and punctuation
  const tokens = text.split(/\s+|[,.;:!?()\[\]{}'"<>]/)
    .filter(token => token.length > 0)
  
  // Add a rough estimate for special tokens and formatting
  const specialCharacterCount = (text.match(/[,.;:!?()\[\]{}'"<>]/g) || []).length
  
  return tokens.length + specialCharacterCount
}