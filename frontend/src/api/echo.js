import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import api from './axios';

window.Pusher = Pusher;

let echoInstance = null;

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
const defaultHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';

try {
  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'reverb_key_default',
    wsHost: import.meta.env.VITE_REVERB_HOST || defaultHost,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: isHttps,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    // Custom authorizer using our authenticated Axios instance to support Sanctum SPA Cookie
    authorizer: (channel) => {
      return {
        authorize: (socketId, callback) => {
          // Pointing to broadcasting auth endpoint
          api.post('/broadcasting/auth', {
            socket_id: socketId,
            channel_name: channel.name
          })
          .then(response => {
            callback(false, response.data);
          })
          .catch(error => {
            callback(true, error);
          });
        }
      };
    }
  });
} catch (e) {
  console.warn('Laravel Echo failed to initialize: ', e);
}

export default echoInstance;
