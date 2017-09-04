var casper = require('casper').create();
casper.start('http://bbs.2dkf.com/login.php', function() {
  this.echo(this.getTitle());
});
/*
 *casper.then(function() {
 *  this.fill('')
 *})
 */
casper.run();
