import sessionTimer from './handlers/sessionTimer';

function handleUserMessage(uid, message) {
  // 处理用户消息的逻辑
  // ...

  // 更新会话定时器
  sessionTimer.updateSession(uid);
}
