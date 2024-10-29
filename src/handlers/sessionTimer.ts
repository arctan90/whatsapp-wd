import axios from 'axios';
import {startsWithIgnoreCase} from "../utils";
import * as cli from "../cli/ui";

class SessionTimer {
  private timers: Map<string, NodeJS.Timeout>;
  private TIMEOUT: number;

  constructor() {
    this.timers = new Map();
    this.TIMEOUT =  3 * 60 * 1000; // 3分钟，单位毫秒
    cli.print(`SessionTimer 初始化，超时时间设置为 ${this.TIMEOUT}ms`);
  }

  private clearTimer(uid: string) {
    if (this.timers.has(uid)) {
      clearTimeout(this.timers.get(uid));
      this.timers.delete(uid);
      cli.print(`清除用户 ${uid} 的定时器`);
    }
  }

  updateSession(uid: string, timeoutCallback: () => Promise<void>) {
    cli.print(`更新用户 ${uid} 的会话`);
    this.clearTimer(uid);

    const timer = setTimeout(async () => {
      cli.print(`用户 ${uid} 的会话超时`);
      await timeoutCallback();
      this.timers.delete(uid);
      cli.print(`用户 ${uid} 的超时回调执行完毕，定时器已删除`);
    }, this.TIMEOUT);

    this.timers.set(uid, timer);
    cli.print(`为用户 ${uid} 设置新的定时器`);
  }

  clearSession(uid: string) {
    cli.print(`手动清除用户 ${uid} 的会话`);
    this.clearTimer(uid);
  }

  // 新增：获取当前活跃会话数
  getActiveSessionCount(): number {
    const count = this.timers.size;
    cli.print(`当前活跃会话数：${count}`);
    return count;
  }
}

const sessionTimer = new SessionTimer();
export default sessionTimer;
