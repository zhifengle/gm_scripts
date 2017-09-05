var casper = require('casper').create({
  pageSettings: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36'
  },
 viewportSize: {
    width: 1920,
    height: 631
  }
});
casper.start('http://bbs.2dkf.com/login.php', function() {
  //this.waitForSelector('tr>td>input[name="pwuser"]');
  this.echo(this.getTitle());
});
casper.then(function() {
  var f = this.evaluate(function() {
    return document.body.innerHTML;
  });
  this.echo(f);
});
/*
 *casper.then(function() {
 *  this.sendKeys('tr>td>input[name="pwuser"]', casper.cli.get(0));
 *  this.sendKeys('tr>td>input[name="pwpwd"]', casper.cli.get(1));
 *  this.click('input.indlogin[type="submit"]');
 *});
 */
/*
 *casper.wait(3000);
 *casper.thenOpen('http://bbs.2dkf.com/kf_growup.php', function() {
 *  this.click('table div>a[href^="kf_growup"]');
 *});
 */
casper.run();
