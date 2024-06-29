import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { WebcastPushConnection } from 'tiktok-live-connector';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://667f9cb8e6cd03f885647c33--polite-gumption-7f8fcb.netlify.app',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }
});

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`Servidor está corriendo en http://localhost:${port}`);
});

let tiktokLiveConnection;

// Configurar CORS para Express
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://667f9cb8e6cd03f885647c33--polite-gumption-7f8fcb.netlify.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Conexión de socket.io
io.on('connection', (socket) => {
  console.log('Cliente conectado al WebSocket.');

  // Manejo de eventos enviados desde el cliente
  socket.on('setTikTokUsername', async (username) => {
    console.log(`Nombre de usuario de TikTok recibido: ${username}`);
    
    // Desconectar cualquier conexión anterior
    if (tiktokLiveConnection) {
      await tiktokLiveConnection.disconnect();
    }

    // Conectar a la nueva transmisión en vivo de TikTok
    tiktokLiveConnection = new WebcastPushConnection(username);

    tiktokLiveConnection.connect().then(state => {
      console.log(`Conectado a la transmisión en vivo: ${state.roomId}`);
      socket.emit('liveStatus', { success: true, message: 'Estás en vivo.' });
    }).catch(err => {
      console.error('Error al conectar con TikTok', err);
      socket.emit('liveStatus', { success: false, message: 'No estás haciendo en vivo, haz un live para conectarte.' });
    });

    // Manejo de eventos de TikTok
    tiktokLiveConnection.on('chat', data => {
      console.log(`Nuevo mensaje de chat: ${data.comment} + ${data.nickname}`);
      io.emit('chat', {
        type: 'chat',
        data: data
      });
    });

    tiktokLiveConnection.on('like', data => {
      console.log(`Nuevo like recibido: ${data.giftId}`);
      io.emit('like', {
        type: 'like',
        data: data
      });
    });

    tiktokLiveConnection.on('gift', data => {
      console.log(`Nuevo regalo recibido: ${data.giftId} `);
      io.emit('gift', {
        type: 'gift',
        data: data
      });
    });
  });

  // Puedes añadir más manejo de eventos según tus necesidades
});
