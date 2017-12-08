import browser from 'webextension-polyfill'
import models from '../models'
import { gmFetch } from './utils/gmFetch'
import { fetchBangumiDataBySearch } from './utils/searchBangumiSubject'

// browser.storage.local.clear()
browser.storage.local.set(models);
browser.storage.local.set({
  currentConfig: 'amazon_jp_book',
  searchSubject: false
});


function handleMessage(request, sender, sendResponse) {
  console.log(request.subjectInfo);
  var notificationID = 'bangumi-new-wiki-helper-notice'
  // fetchBangumiDataBySearch(subjectInfo, 1).then(d => console.log(d));
  // gmFetch('https://www.baidu.com', 5 * 1000)
  //   .then(d => console.log('dddddddddddd', d));
  var notification = browser.notifications.create(notificationID, {
    "type": "basic",
    "title": 'title',
    "message": 'content'
  });

  setTimeout(function(){
    browser.notifications.clear(notificationID);
  },2000);
  var response = {
    response: "Response from background script"
  }
  sendResponse(response);
}

// 使用browser时，会报错
chrome.runtime.onMessage.addListener(handleMessage);

function onCreated() {
  if (browser.runtime.lastError) {
    console.log(`Error: ${browser.runtime.lastError}`);
  } else {
    console.log("Item created successfully");
  }
}

/*
Called when the item has been removed.
We'll just log success here.
*/
function onRemoved() {
  console.log("Item removed successfully");
}

/*
Called when there was an error.
We'll just log the error here.
*/
function onError(error) {
  console.log(`Error: ${error}`);
}

browser.contextMenus.create({
  id: "bangumi-new-wiki",
  title: 'test bg',
  contexts: ["all"]
}, onCreated);


// chrome.contextMenus.create({
//   id: "bangumi-new-wiki",
//   title: 'test bg',
//   contexts: ["all"],
//   onclick: addSubject,
// });
// function addSubject(info, tab) {
//   browser.tabs.executeScript({
//     file: '/dist/content.js'
//   });
//   // gmFetch('https://bgm.tv/character/new', 5 * 1000)
//   //   .then(d => console.log('dddddddddddd', d));
// }
browser.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "bangumi-new-wiki":
      browser.tabs.query({ 'active': true, 'lastFocusedWindow': true })
        .then(tabs => tabs[0].url)
        .then(url => {
          var file = '/dist/content.js'
          if (url.match(/bgm\.tv|bangumi\.tv|chii\.in/)) {
            file = '/dist/bangumi.js'
          }
          return browser.tabs.executeScript({
            file: file
          })
        });
      // gmFetch('https://bgm.tv/character/new', 5 * 1000)
      //   .then(d => console.log('dddddddddddd', d));
      break;
  }
});
