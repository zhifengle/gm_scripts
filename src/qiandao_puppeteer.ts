const puppeteer = require('puppeteer');

let rockIt = async () => {
  const browser = await puppeteer.launch({ devtools: true });
  const page = await browser.newPage();
  //   var cookie = [
  //     // cookie exported by google chrome plugin editthiscookie
  //     {
  //       domain: 'httpbin.org',
  //       expirationDate: 1597288045,
  //       hostOnly: false,
  //       httpOnly: false,
  //       name: 'key',
  //       path: '/',
  //       sameSite: 'no_restriction',
  //       secure: false,
  //       session: false,
  //       storeId: '0',
  //       value: 'value!',
  //       id: 1,
  //     },
  //   ]
  //   await page.setCookie(...cookie)
  await page.goto('http://127.0.0.1:3000/#/login');
  //输入账号密码
  const usernameElement = await page.$('#login-form_username');
  await usernameElement.type('customertest', { delay: 20 });
  const passwordElement = await page.$('#login-form_password', { delay: 20 });
  await passwordElement.type('123456');
  const kaptchaElement = await page.$('#login-form_kaptcha', { delay: 20 });
  await kaptchaElement.type('aa');
  let okButtonElement = await page.$('.login-form-button');
  await Promise.all([okButtonElement.click(), page.waitForNavigation()]);
  await page.close();
  await browser.close();
};
rockIt();
