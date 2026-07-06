// Centralized API configuration for backend services

// Environment configuration: 'development' | 'production'
// Change this value to switch between backend environments.
// - 'development': Queries local machine IP, emulator loopbacks, and localhost ports.
// - 'production': Queries the live Render production deployment server.
export const ENV = 'production' as 'development' | 'production';

// Production deployment URL hosted on Render
export const PRODUCTION_URL = 'https://responza-backend-2qt6.onrender.com';

// Development local IP fallback settings
export const BACKEND_IP = '192.168.1.2';
export const BACKEND_PORT = '5000';

export const DEVELOPMENT_URLS = [
  `http://${BACKEND_IP}:${BACKEND_PORT}`,
  `http://10.0.2.2:${BACKEND_PORT}`, // Android emulator loopback fallback
  `http://localhost:${BACKEND_PORT}`  // Localhost fallback for iOS simulators
];

/**
 * Constructs backend URL options for fallback connections based on environment.
 * 
 * @param path - The route path (e.g., '/api/device/register')
 * @returns Array of full URL endpoints to try
 */
export const getBackendRoute = (path: string): string[] => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (ENV === 'production') {
    return [`${PRODUCTION_URL}${cleanPath}`];
  }

  return DEVELOPMENT_URLS.map(baseUrl => `${baseUrl}${cleanPath}`);
};
