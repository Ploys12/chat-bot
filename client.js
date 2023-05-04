const readline = require('readline');
const io = require('socket.io-client');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Запрашиваем у пользователя имя для чата
rl.question('Введите ваше имя: ', (name) => {
  // Подключаемся к серверу
  const socket = io.connect('http://localhost:3000');

  // Обработчик события 'connect'
  socket.on('connect', () => {
    console.log(`Вы подключены к серверу`);
    socket.emit('join', name); // Отправляем имя пользователя на сервер
  });

  // Обработчик события 'message'
  socket.on('message', (data) => {
    console.log(`${data.name}: ${data.message}`);
  });

  // Обработчик события 'disconnect'
  socket.on('disconnect', () => {
    console.log(`Вы отключены от сервера`);
  });

  // Читаем ввод пользователя с консоли и отправляем на сервер
  rl.on('line', (input) => {
    socket.emit('message', input);
  });
});
