var casper = require('casper').create();
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
  this.click('.cell>input');
});
casper.run();
