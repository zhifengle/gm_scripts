import browser from 'webextension-polyfill'
import models from '../models'
import { gmFetch } from './utils/gmFetch'
import { fetchBangumiDataBySearch } from './utils/searchBangumiSubject'

browser.storage.local.set(models);
browser.storage.local.set({
  currentModel: {
    name: 'amazon_jp',
    descrition: 'Getchu game'
  }
});


function handleMessage(request, sender, sendResponse) {
  console.log(request.subjectInfo);
  // fetchBangumiDataBySearch(subjectInfo, 1).then(d => console.log(d));
  gmFetch('https://www.baidu.com', 5 * 1000)
    .then(d => console.log('dddddddddddd', d));
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
      // browser.tabs.query({ 'active': true, 'lastFocusedWindow': true })
      //   .then(tabs => tabs[0].url)
      //   .then(url => {
      //     return browser.tabs.executeScript({
      //       code: 'var testfff = 1;'
      //     })
      //   });
      browser.tabs.executeScript({
        file: '/dist/content.js'
      });
      // gmFetch('https://bgm.tv/character/new', 5 * 1000)
      //   .then(d => console.log('dddddddddddd', d));
      break;
  }
});
