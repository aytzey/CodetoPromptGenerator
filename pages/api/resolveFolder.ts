// pages/api/resolveFolder.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const exists = promisify(fs.exists)

type ResponseData = {
  success: boolean
  path?: string
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
    const { folderName } = req.body

    if (!folderName) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      })
    }

    // Logic to find the full path
    // This is a simplified approach, in production you'd need more robust logic
    // based on your system's file structure
    
    // On Windows, we might look in common paths like the user's home directory
    const possiblePaths = [
      process.cwd(),
      path.join(process.cwd(), '..'),
      path.join(process.cwd(), '..', '..'),
      // Add more paths as needed, like:
      // path.join(os.homedir(), 'Documents'),
      // path.join(os.homedir(), 'Projects'),
    ]

    let resolvedPath = ''

    for (const basePath of possiblePaths) {
      const candidatePath = path.join(basePath, folderName)
      if (await exists(candidatePath)) {
        resolvedPath = candidatePath
        break
      }
    }

    // If not found in predefined paths, use the folder name as is
    // (but normalized to an absolute path)
    if (!resolvedPath) {
      resolvedPath = path.resolve(folderName)
    }

    return res.status(200).json({
      success: true,
      path: resolvedPath
    })
  } catch (error) {
    console.error('Error resolving folder path:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve folder path'
    })
  }
}