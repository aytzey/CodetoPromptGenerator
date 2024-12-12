import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { text } = req.body;
  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing text' });
  }

  // Simple token approximation by counting words
  const trimmed = text.trim();
  const tokenCount = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;

  return res.status(200).json({ tokenCount });
}
