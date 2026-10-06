export const env = {
  apiUrl: import.meta.env.VITE_API_URL || "/api",
  appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
};

export default env;
