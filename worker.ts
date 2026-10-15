// Cloudflare Workers entrypoint. Express registers API routes in server.ts,
// while the Workers Assets binding serves the built React/Vite SPA.
import { httpServerHandler } from 'cloudflare:node';
import './server';

export default httpServerHandler({ port: 3000 });
