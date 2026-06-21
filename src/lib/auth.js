// src/lib/auth.js — single source of the Google Drive access token,
// shared by api.js (shooting) and gymApi.js (gym) without circular imports.
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };
