var casper = require('casper').create({
  pageSettings: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
  },
 viewportSize: {
    width: 1920,
    height: 631
  }
});
casper.start('https://www.v2ex.com/signin', function() {
  this.echo(this.getTitle());
});
casper.then(function() {
  var names = this.evaluate(function () {
    var form = document.forms[1];
    var sl = form.querySelectorAll('.sl');
    return [sl[0].name, sl[1].name];
  });
  var info = {};
  info[names[0]] = casper.cli.get(0);
  info[names[1]] = casper.cli.get(1);
  this.fill('form[action="/signin"]', info, true);
});
casper.wait(3000);
casper.thenOpen('https://www.v2ex.com/mission/daily', function() {
  if(this.evaluate(isMissionCompleted)) return;
  this.click('.cell>input');
});
function isMissionCompleted() {
  var btn = document.querySelector('.cell>input');
  return btn.value === '查看我的账户余额';
}
casper.run();
