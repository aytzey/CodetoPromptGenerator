import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, file, dir } = req.query;

  // Determine the meta prompts directory based on `dir` query param
  let baseDir: string;
  if (typeof dir === 'string' && dir.trim()) {
    // Resolve provided directory relative to server's current working directory
    baseDir = path.resolve(dir.trim());
    if (!fs.existsSync(baseDir)) {
      return res.status(400).json({ error: 'Specified meta prompts directory does not exist' });
    }
  } else {
    // Fallback to default directory if none provided
    baseDir = path.join(process.cwd(), 'sample_project', 'meta_prompts');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  }

  if (req.method === 'GET') {
    if (action === 'list') {
      const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.txt'));
      return res.status(200).json({ files });
    }

    if (action === 'load' && typeof file === 'string') {
      const filepath = path.join(baseDir, file);
      if (!filepath.endsWith('.txt') || !fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const content = fs.readFileSync(filepath, 'utf-8');
      return res.status(200).json({ content });
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  if (req.method === 'POST') {
    // Save action
    try {
      let { filename, content } = req.body;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'Missing filename' });
      }
      if (typeof content !== 'string') {
        return res.status(400).json({ error: 'Missing content' });
      }

      // Ensure .txt extension
      if (!filename.endsWith('.txt')) {
        filename = filename + '.txt';
      }

      const filepath = path.join(baseDir, filename);
      fs.writeFileSync(filepath, content, 'utf-8');
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }

  return res.status(400).json({ error: 'Unsupported method' });
}
