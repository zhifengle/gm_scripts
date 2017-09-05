var casper = require('casper').create();
casper.start('http://bbs.2dkf.com/login.php', function() {
  this.echo(this.getTitle());
  
});
casper.then(function() {
  this.sendKeys('tr>td>input[name="pwuser"]', casper.cli.get(0));
  this.sendKeys('tr>td>input[name="pwpwd"]', casper.cli.get(1));
  this.click('input.indlogin[type="submit"]');
});
casper.wait(3000);
casper.thenOpen('http://bbs.2dkf.com/kf_growup.php', function() {
  this.click('table div>a[href^="kf_growup"]');
});
casper.run();

