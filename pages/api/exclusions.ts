// pages/api/exclusions.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

type ResponseData = {
  success: boolean
  exclusions?: string[]
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Path to the ignoreDirs.txt file
  const ignoreFilePath = path.join(process.cwd(), 'ignoreDirs.txt')

  try {
    // GET: Return current exclusions
    if (req.method === 'GET') {
      let exclusions: string[] = []
      
      try {
        const content = await readFile(ignoreFilePath, 'utf-8')
        exclusions = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line !== '')
      } catch (error) {
        // If file doesn't exist, return empty array
        console.warn('ignoreDirs.txt not found or not readable, returning empty list')
      }
      
      return res.status(200).json({
        success: true,
        exclusions
      })
    }
    
    // POST: Update exclusions
    if (req.method === 'POST') {
      const { exclusions } = req.body
      
      if (!Array.isArray(exclusions)) {
        return res.status(400).json({
          success: false,
          error: 'Exclusions must be an array of strings'
        })
      }
      
      // Filter out empty entries and format
      const validExclusions = exclusions
        .map(item => item.trim())
        .filter(item => item !== '')
      
      // Write to file
      await writeFile(ignoreFilePath, validExclusions.join('\n'))
      
      return res.status(200).json({
        success: true,
        exclusions: validExclusions
      })
    }
    
    // Otherwise, method not allowed
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  } catch (error) {
    console.error('Error handling exclusions:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}