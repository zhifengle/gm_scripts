const SKIP_START_CONFIG = 'e_user_skip_start_config';
const SKIP_END_CONFIG = 'e_user_skip_end_config';

function hookAudioInst(obj: HTMLAudioElement) {
  var fakeObj = new Proxy(obj, {
    get(target, prop) {
      const val = Reflect.get(target, prop);
      if (!!val && !!val.bind) {
        // 使用 bind 绑定 this 指向
        return val.bind(target);
      } else {
        return val;
      }
    },
    set(target, p, value, receiver) {
      return Reflect.set(target, p, value, target);
    },
  });

  return fakeObj;
}

function setStart() {
  var start = +prompt('设置跳过片头秒数', skipStartSec);
  skipStartSec = start;
  GM_setValue(SKIP_START_CONFIG, start);
}
function setEnd() {
  var sec = +prompt('设置跳过片尾秒数', skipEndSec);
  skipEndSec = +sec;
  GM_setValue(SKIP_END_CONFIG, sec);
}

if (GM_registerMenuCommand) {
  GM_registerMenuCommand('设置跳过片头秒数', setStart);
  GM_registerMenuCommand('设置跳过片尾秒数', setEnd);
}

let skipStartSec = GM_getValue(SKIP_START_CONFIG, 20);
let skipEndSec = GM_getValue(SKIP_END_CONFIG, 10);

function setAudioEvents(audio: HTMLAudioElement) {
  audio.addEventListener('canplaythrough', function () {
    if (this.currentTime < skipStartSec) {
      this.currentTime = skipStartSec;
    }
  });
  audio.addEventListener('timeupdate', function () {
    if (this.currentTime >= this.duration) {
      return;
    }
    if (this.currentTime + skipEndSec > this.duration) {
      this.currentTime = this.duration;
    }
  });
}

(function (window) {
  function hookAudioContructor() {
    var fakeObj = new Proxy(window.Audio, {
      construct(target, args) {
        let inst = new target(...args);
        setAudioEvents(inst);
        return inst;
      },
    });
    return fakeObj;
  }

  function setDescriptor(fakeObj: any, prop: any) {
    Object.defineProperty(window, prop, {
      get: function () {
        return fakeObj;
      },
      set: function (v) {
        console.log(`检测到修改 ${prop}`);
      },
    });
  }
  setDescriptor(hookAudioContructor(), 'Audio');
})(unsafeWindow);
