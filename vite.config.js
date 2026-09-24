import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// WebXR immersive sessions require a secure context. basicSsl gives us a
// self-signed HTTPS dev server so a Quest headset on the same network can
// connect to `https://<your-computer-ip>:5173` and enter VR.
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true,
  },
  preview: {
    https: true,
    host: true,
  },
});
