/**
 * Get API base URL
 * - Production (Docker): REACT_APP_API_BASE="" → returns "" (relative URLs)
 * - Development: REACT_APP_API_BASE undefined → returns "http://localhost:8080"
 */
export const getApiBase = () => {
  return process.env.REACT_APP_API_BASE !== undefined
    ? process.env.REACT_APP_API_BASE
    : 'http://localhost:8080';
};
