function demo() {
  chrome.tabs.getSelected(function(w){console.log(w);});
  /*
   *chrome.tabs.getCurrent(function(tab){
   *  console.log(tab.url);
   *}
   *);
   */
}
/*
 *chrome.contextMenus.create({
 *  "title": "use you-get for current page",
 *  "contexts":["page"],
 *  "onclick": console.log('d');
 *});
 */
chrome.contextMenus.create({
  "title": "use you-get for current link",
  "contexts":["page"],
  "onclick": demo1
});

function demo1() {
  var hostname = 'com.google.chrome.you.get';
  //var port = chrome.runtime.connectNative('com.google.chrome.you.get')
  //port.postMessage({text: 'Hello'});
  chrome.runtime.sendNativeMessage(
    hostname,
    { text: "http://v.youku.com/v_show/id_XMjU1NjAzMTQxNg==.html" }
    );
}

function callYouget() {
  
}

function handler(req, sender, res) {
  if (req.type === 'link') {
    callYouget();
  }
  
}

//chrome.runtime.onMessage.addListener(handler);
