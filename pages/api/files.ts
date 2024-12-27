// pages/api/files.ts

import path from 'path';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import { getProjectTree } from '../../lib/getProjectTree';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, filePath, projectDir } = req.query;

  // Determine base directory:
  // 1) If projectDir query provided, use it (resolved and validated).
  // 2) Else fallback to process.env.PROJECT_DIR or sample_project.
  let baseDir: string;
  if (typeof projectDir === 'string' && projectDir.trim()) {
    baseDir = path.resolve(projectDir.trim());
    if (!fs.existsSync(baseDir)) {
      return res.status(400).json({ error: 'Specified directory does not exist' });
    }
  } else {
    baseDir = process.env.PROJECT_DIR
      ? path.resolve(process.env.PROJECT_DIR)
      : path.join(process.cwd(), 'sample_project');
  }

  if (action === 'tree') {
    const tree = getProjectTree(baseDir);
    return res.status(200).json({ tree });
  }

  if (action === 'content' && typeof filePath === 'string') {
    const absolutePath = path.join(baseDir, filePath);
    if (!absolutePath.startsWith(baseDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      return res.status(200).json({ content });
    } catch (error: any) {
      return res.status(404).json({ error: 'File not found' });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
