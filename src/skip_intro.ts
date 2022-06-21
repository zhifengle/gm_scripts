const SKIP_START_CONFIG = 'e_user_skip_start_config';
const SKIP_END_CONFIG = 'e_user_skip_end_config';

function hookAudioInst(obj: HTMLAudioElement) {
  var fakeObj = new Proxy(obj, {
    get(target, p) {
      return Reflect.get(target, p);
    },
    set(target, prop, value) {
      if (prop === 'src') {
        console.log('set src: ', value);
      }
      // @ts-ignore
      return Reflect.set(...arguments);
    },
  });

  return fakeObj;
}

function setStart() {
  var start = +prompt('设置跳过片头秒数', '20');
  skipStartSec = start;
  GM_setValue(SKIP_START_CONFIG, start);
}
function setEnd() {
  var sec = +prompt('设置跳过片尾秒数', '10');
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
      get: function (target, p) {
        return Reflect.get(target, p);
      },
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
