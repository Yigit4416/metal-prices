const { io } = require('socket.io-client');

console.log('🔌 Testing socket connection to backend...');

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to socket server with ID:', socket.id);
  console.log('🎯 Waiting for gold data...');
});

socket.on('gold-update', (data) => {
  console.log('📊 Received gold data:', data.length, 'items');
  if (data.length > 0) {
    console.log('📈 First item:', data[0]);
  }
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from socket server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Keep the script running for 60 seconds to receive data
setTimeout(() => {
  console.log('⏰ Closing connection after 60 seconds...');
  socket.disconnect();
  process.exit(0);
}, 60000);