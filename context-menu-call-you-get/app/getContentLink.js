function getLink(e) {
  var t = e.target;
  if (t.tagName.toLowerCase() === 'a') {
    chrome.runtime.sendMessage({
      type: 'url',
      function(res) {
        console.log('ok');
      }
    });
  }
}
//document.body.addEventListener('contextmenu', getLink);

