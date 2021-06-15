// ==UserScript==
// @name        qiandao
// @name:zh-CN  qiandao
// @namespace   https://github.com/22earth
// @description qiandao for personal use
// @description:zh-cn 自用签到.
// @include     https://www.v2ex.com/
// @include     https://www.south-plus.net/
// @include     https://www.52pojie.cn/
// @include     https://bbs4.2djgame.net/home/forum.php
// @author      22earth
// @homepage    https://github.com/22earth/gm_scripts
// @version     0.0.1
// @run-at      document-end
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// ==/UserScript==


// support GM_XMLHttpRequest
function fetchInfo(url, type, opts = {}, TIMEOUT = 10 * 1000) {
    // @ts-ignore
    {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            GM_xmlhttpRequest(Object.assign({ method: 'GET', timeout: TIMEOUT, url, responseType: type, onload: function (res) {
                    resolve(res.response);
                }, onerror: reject }, opts));
        });
    }
}
function fetchText(url, TIMEOUT = 10 * 1000) {
    return fetchInfo(url, 'text', {}, TIMEOUT);
}

const USERJS_PREFIX = 'E_USERJS_SIGN_';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
const ALL_SITES = 'ALL_SITES';
async function signSouth() {
    const site_name = this.name;
    const sign = async (taskId) => {
        const res = await fetchText(genUrl(this.href, `plugin.php?H_name=tasks&action=ajax&actions=job&cid=${taskId}`));
        if (res.includes('success')) {
            await fetchText(genUrl(this.href, `plugin.php?H_name=tasks&action=ajax&actions=job2&cid=${taskId}`));
        }
        else {
            setSignResult('south-plus' + taskId, true);
        }
    };
    if (!getSignResult(site_name + '14')) {
        await sign(14);
    }
    else {
        console.log('已经签到: ', site_name);
    }
    if (!getSignResult(site_name + '15', 7)) {
        await sign(15);
    }
    else {
        console.log('周任务已经完成: ', site_name);
    }
}
function setSignResult(site, result) {
    GM_setValue(USERJS_PREFIX + site.toUpperCase(), JSON.stringify({
        result: Number(result),
        date: +new Date(),
    }));
}
function getSignResult(site, numOfDays = 1) {
    let info = GM_getValue(USERJS_PREFIX + site.toUpperCase());
    if (info) {
        const obj = JSON.parse(info);
        if (+new Date() - new Date(obj.date).getTime() <
            UPDATE_INTERVAL * numOfDays) {
            return Number(obj.result) === 1 ? true : false;
        }
        return false;
    }
    return false;
}
function genUrl(href, pathname) {
    const url = new URL(href);
    return `${url.origin}/${pathname}`;
}
const siteDict = [
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
                return;
            }
            const pathname = 'home.php?mod=task&do=apply&id=2';
            if (location.href === this.href) {
                const $btn = document.querySelector(`a[href="${pathname}"`);
                if (!$btn)
                    return;
            }
            else {
                const content = await fetchText(this.href);
                if (!content.match(pathname))
                    return;
            }
            fetchText(genUrl(this.href, pathname));
        },
    },
    {
        name: 'v2ex',
        href: 'https://www.v2ex.com/',
        async signFn() {
            if (getSignResult(this.name)) {
                return;
            }
            const content = await fetchText(genUrl(this.href, 'mission/daily'));
            const m = content.match(/mission\/daily\/redeem\?once=\d+/);
            if (m) {
                await fetchText(genUrl(this.href, m[0]));
            }
            else {
                console.log(this.name, ': 已签到');
            }
            setSignResult(this.name, true);
        },
    },
    {
        name: '2djgame',
        href: 'https://bbs4.2djgame.net/home/forum.php',
        async signFn() {
            if (getSignResult(this.name)) {
                return;
            }
            const content = await fetchText(genUrl(this.href, 'home.php?mod=task&do=apply&id=1'));
            if (content.match('抱歉，本期您已申請過此任務，請下期再來')) {
                console.log(this.name, ': 已签到');
            }
            setSignResult(this.name, true);
        },
    },
];
async function main() {
    const checked = getSignResult(ALL_SITES);
    if (checked)
        return;
    {
        siteDict.forEach((obj) => {
            obj.signFn();
        });
        setSignResult(ALL_SITES, true);
        return;
    }
}
main();
