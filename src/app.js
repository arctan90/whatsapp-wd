import SessionTimer from './handlers/sessionTimer';

// 在应用退出时
process.on('SIGINT', () => {
  SessionTimer.clearAllTimers();
  process.exit(0);
});
