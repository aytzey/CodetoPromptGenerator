const net = require('net');

/**
 * Find an available port starting from the given port
 * @param {number} startPort - Port to start searching from
 * @param {string} host - Host to bind to (default: '127.0.0.1')
 * @returns {Promise<number>} - Available port number
 */
async function findAvailablePort(startPort = 5010, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, host, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        findAvailablePort(startPort + 1, host).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

module.exports = { findAvailablePort };