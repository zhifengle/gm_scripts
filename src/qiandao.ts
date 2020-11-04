import { MsgResponse } from './interface/types';
import { sleep } from './utils/async/sleep';
import { createIframe, findElement, loadIframe } from './utils/domUtils';

const CHECK_IN_MSG = 'CHECK_IN_MSG';

async function getMsg(msg: string) {
  const now = +new Date();
  const getData = () => {
    const obj: MsgResponse = JSON.parse(GM_getValue(msg) || '{}');
    if (obj.type === msg && obj.timestamp && obj.timestamp < now) {
      return obj.data;
    }
  };
  await sleep(1000);
  // 尝试 8s
  let counter = 0;
  let data;
  while (counter < 20 && !data) {
    await sleep(400);
    console.info('Read GM_getValue, retry counter: ', counter);
    data = getData();
    counter++;
  }
  return data;
}

function setMsg(type: string, data: any) {
  const res: MsgResponse = {
    type,
    timestamp: +new Date(),
    data,
  };
  GM_setValue(type, JSON.stringify(res));
}
const urlDict = {
  kf_growup: 'https://bbs.kforz.com/kf_growup.php',
  kfonline: 'https://bbs.kforz.com/kf_fw_ig_index.php',
  v2ex: 'https://v2ex.com/mission/daily',
};

async function init() {
  const $iframe = createIframe('e-userjs-qiandao');
  for (let key of Object.keys(urlDict)) {
    // @ts-ignore
    await loadIframe($iframe, urlDict[key]);
  }
}
if (window.top !== window.self) {
  const href = location.href;
  // kf
  if (href === urlDict.kf_growup) {
    const $dom = findElement({
      selector: 'div',
    });
  }
  if (href === urlDict.kfonline) {
    const $dom = findElement({
      selector: 'body',
      subSelector: 'a[onclick^=jgjg]',
      keyWord: '前进至结束',
    }) as HTMLAnchorElement;
    if ($dom) {
      $dom.click();
    }
  }
  if (location.href === urlDict.v2ex) {
    const $dom = findElement({
      selector: 'div',
    });
  }
}
