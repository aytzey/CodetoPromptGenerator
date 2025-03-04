// pages/api/files.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { getProjectTree, FileNode } from '../../lib/getProjectTree'
import fs from 'fs'
import path from 'path'

type ResponseData = {
  success: boolean
  tree?: FileNode[]
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
    const { path: projectPath } = req.body

    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'Path is required'
      })
    }

    // Check if the path exists and is a directory
    if (!fs.existsSync(projectPath) || !fs.statSync(projectPath).isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid path or not a directory'
      })
    }

    // Get the project tree
    const tree = getProjectTree(projectPath)

    return res.status(200).json({
      success: true,
      tree
    })
  } catch (error) {
    console.error('Error getting project tree:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to get project tree'
    })
  }
}