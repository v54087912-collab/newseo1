module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { type, q, url } = req.query;

  try {
    if (type === 'search' && q) {
      const apiUrl = `https://ashlynn-repo.vercel.app/search?q=${encodeURIComponent(q)}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Search API error: ${response.status}`);
      const data = await response.json();
      res.status(200).json(data);
    } else if (type === 'download' && url) {
      const apiUrl = `https://socialdown.itz-ashlynn.workers.dev/yt?url=${encodeURIComponent(url)}&format=mp3`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Download API error: ${response.status}`);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        res.status(200).json(data);
      } else {
        // If it returns a direct file or redirect, we might need to handle it.
        // For now, let's assume JSON as most workers return JSON with a download link.
        // If it's raw bytes, we can try to pipe, but let's stick to JSON expectation first.
        const text = await response.text();
        try {
            const json = JSON.parse(text);
            res.status(200).json(json);
        } catch (e) {
            // Return text if not JSON
            res.status(200).send(text);
        }
      }
    } else {
      res.status(400).json({ error: 'Invalid parameters. Use ?type=search&q=... or ?type=download&url=...' });
    }
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: error.message });
  }
};
