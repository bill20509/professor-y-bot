/**
 * Generate a shareable archive URL for a thread.
 *
 * Creates an archive token via thread.archive() and returns the full URL
 * using EXTERNAL_URL (falls back to http://localhost in development).
 *
 * @param {Thread} thread
 * @returns {Promise<string>} Full archive URL
 */
async function getThreadUrl(thread) {
  const hash = await thread.archive();
  const base = process.env.EXTERNAL_URL || "http://localhost";
  return `${base}/archive/${hash}`;
}

module.exports = getThreadUrl;
