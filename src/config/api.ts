// Centralized API configuration for backend services
// In development, adjust this IP to match your local machine's network IP (e.g. from npx expo start output)
// This allows physical devices, Android emulators, and iOS simulators to connect successfully.
export const BACKEND_IP = '192.168.1.2'; 
export const BACKEND_PORT = '5000';

export const BACKEND_URLS = [
  `http://${BACKEND_IP}:${BACKEND_PORT}`,
  `http://10.0.2.2:${BACKEND_PORT}`, // Android emulator loopback fallback
  `http://localhost:${BACKEND_PORT}`  // Localhost fallback for iOS simulators
];

/**
 * Constructs backend URL options for fallback connections.
 * 
 * @param path - The route path (e.g., '/api/device/register')
 * @returns Array of full URL endpoints to try sequentially
 */
export const getBackendRoute = (path: string): string[] => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return BACKEND_URLS.map(baseUrl => `${baseUrl}${cleanPath}`);
};
