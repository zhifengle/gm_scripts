import { fetchInfo, fetchText } from './utils/fetchData';
import { logger } from './utils/logger';
import { randomNum } from './utils/utils';

type SiteConfig = {
  name: string;
  href: string | string[];
  hostname?: string | string[];
  signFn: () => Promise<void>;
};

const USERJS_PREFIX = 'E_USERJS_SIGN_';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const ALL_SITES = 'ALL_SITES';

async function signSouth() {
  const site_name = this.name;
  const sign = async (taskId: number) => {
    const res = await fetchText(
      genUrl(
        this.href,
        `plugin.php?H_name=tasks&action=ajax&actions=job&cid=${taskId}`
      )
    );
    // 未登录
    if (res.match('您还不是论坛会员,请先登录论坛')) {
      logger.error(`${this.name} 需要登录`);
      return;
    }
    if (res.includes('success') || res.includes('未完成')) {
      await fetchText(
        genUrl(
          this.href,
          `plugin.php?H_name=tasks&action=ajax&actions=job2&cid=${taskId}`
        )
      );
      setSignResult('south-plus' + taskId, true);
    } else if (res.includes('上次申请')) {
      setSignResult('south-plus' + taskId, true);
      // 已经签到了
    }
  };
  if (!getSignResult(site_name + '14', 7)) {
    await sign(14);
  } else {
    logger.info(`${site_name} 已签到`);
  }
  if (!getSignResult(site_name + '15')) {
    await sign(15);
  } else {
    logger.info(`${site_name} 已签到`);
  }
}

function setSignResult(site: string, result: boolean) {
  GM_setValue(USERJS_PREFIX + site.toUpperCase(), {
    result: Number(result),
    date: +new Date(),
  });
}
function getSignResult(site: string, numOfDays?: number): boolean {
  let obj = GM_getValue(USERJS_PREFIX + site.toUpperCase());
  if (obj) {
    const now = new Date();
    const preDate = new Date(obj.date as any);
    // 存在时间限制
    if (numOfDays) {
      // 小于时间限制
      if (+now - +preDate < UPDATE_INTERVAL * numOfDays) {
        return Number(obj.result) === 1 ? true : false;
      } else {
        return false;
      }
    } else {
      return now.getDate() === preDate.getDate();
    }
  }
  return false;
}

function genUrl(href: string, pathname: string) {
  const url = new URL(href);
  return `${url.origin}/${pathname}`;
}

const siteDict: SiteConfig[] = [
  {
    name: 'south-plus',
    href: 'https://www.south-plus.net/',
    signFn: signSouth,
  },
  {
    name: '52pojie',
    href: 'https://www.52pojie.cn/',
    async signFn() {
      if (getSignResult(this.name)) {
        logger.info(`${this.name} 已签到`);
        return;
      }
      const pathname = 'home.php?mod=task&do=apply&id=2';
      if (globalThis?.location?.href === this.href) {
        const $btn = document.querySelector(`a[href="${pathname}"`);
        if (!$btn) return;
      } else {
        const content = await fetchText(this.href, { decode: 'gbk' });
        // 未登录
        if (content.includes('注册[Register]')) {
          logger.error(`${this.name} 需要登录`);
          return;
        } else if (!content.includes(pathname)) {
          setSignResult(this.name, true);
          return;
        }
      }
      await fetchText(genUrl(this.href, pathname));
      setSignResult(this.name, true);
    },
  },
  {
    name: 'v2ex',
    href: ['https://v2ex.com/', 'https://www.v2ex.com/'],
    async signFn() {
      if (getSignResult(this.name)) {
        logger.info(`${this.name} 已签到`);
        return;
      }
      let href = this.href[0];
      const curHref = globalThis?.location?.href;
      if (curHref && this.href.includes(curHref)) {
        href = curHref;
      }
      const missionUrl = genUrl(href, 'mission/daily');
      const content = await fetchText(genUrl(href, 'mission/daily'));
      if (content.match(/你是机器人么？/)) {
        logger.error(`${this.name} 需要登录`);
        return;
      }
      const m = content.match(/mission\/daily\/redeem\?once=\d+/);
      if (m) {
        await fetchText(genUrl(href, m[0]), {
          headers: {
            Referer: missionUrl,
          },
        });
      } else {
        logger.info(`${this.name} 已签到`);
      }
      setSignResult(this.name, true);
    },
  },
  {
    name: '2djgame',
    href: 'https://bbs4.2djgame.net/home/forum.php',
    async signFn() {
      if (getSignResult(this.name)) {
        logger.info(`${this.name} 已签到`);
        return;
      }
      const content = await fetchText(
        genUrl(this.href, 'home.php?mod=task&do=apply&id=1')
      );
      if (content.match('抱歉，本期您已申請過此任務，請下期再來')) {
        logger.info(`${this.name} 已签到`);
      } else if (content.match('您需要先登錄才能繼續本操作')) {
        logger.error(`${this.name} 需要登录`);
        return;
      }
      setSignResult(this.name, true);
    },
  },
  {
    name: 'zodgame',
    href: 'https://zodgame.xyz/',
    async signFn() {
      if (getSignResult(this.name)) {
        logger.info(`${this.name} 已签到`);
        return;
      }
      const content = await fetchText(
        genUrl(this.href, 'plugin.php?id=dsu_paulsign:sign')
      );
      if (content.includes('您好！登录后享受更多精彩')) {
        logger.error(`${this.name} 需要登录`);
        return;
      }
      const formhashRe =
        /<input\s*type="hidden"\s*name="formhash"\s*value="([^"]+)"\s*\/?>/;
      const matchFormhash = content.match(formhashRe);
      if (
        matchFormhash &&
        /<form\s*id="qiandao"\s*method="post"/.test(content)
      ) {
        const url =
          'plugin.php?id=dsu_paulsign:sign&operation=qiandao&infloat=1&inajax=1';
        const fd = new URLSearchParams();
        fd.append('formhash', matchFormhash[1]);
        const arr = ['kx', 'ym', 'wl', 'nu', 'ch', 'fd', 'yl', 'shuai'];
        fd.append('qdxq', arr[randomNum(5, 0)]);
        const signRes = await fetchInfo(
          // genUrl(this.href, $form.getAttribute('action')),
          genUrl(this.href, url),
          'text',
          {
            method: 'POST',
            body: fd,
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
          }
        );
        if (signRes.includes('未定义操作')) {
          return;
        } else if (signRes.includes('恭喜你签到成功')) {
          // 刷新
          await fetchText(genUrl(this.href, 'plugin.php?id=dsu_paulsign:sign'));
          setSignResult(this.name, true);
          return;
        }
      }
      if (content.includes('您今天已经签到过了或者签到时间还未开始')) {
        setSignResult(this.name, true);
      }
    },
  },
];

async function main() {
  // 禁用自动一键签到，改成访问当前网站时，签到当前网站
  // const checked = getSignResult(ALL_SITES);
  // if (!checked) {
  //   siteDict.forEach((obj) => {
  //     obj.signFn();
  //   });
  //   setSignResult(ALL_SITES, true);
  //   return;
  // }
  const site = siteDict.find((obj) => obj.href.includes(location.href));
  if (site) {
    site.signFn();
  }
}
main();

function qiandaoAllSites() {
  siteDict.forEach((obj) => {
    obj.signFn();
  });
  setSignResult(ALL_SITES, true);
}
// 签到脚本命令
if (GM_registerMenuCommand) {
  GM_registerMenuCommand('一键签到', qiandaoAllSites);
}
