import browser from 'webextension-polyfill';
import models from '../models';
import { fetchBangumiDataBySearch } from './utils/searchBangumiSubject';

// browser.storage.local.clear()
browser.storage.local.set(models);
browser.storage.local.set({
  currentConfig: 'amazon_jp_book',
  searchSubject: true,
  newSubjectType: 1,
  bangumiDomain: 'bgm.tv'
});


function handleMessage(request, sender, sendResponse) {
  var notificationID = 'bangumi-new-wiki-helper-notice';
  browser.storage.local.get()
    .then(obj => {
      let newSubjectType = obj.newSubjectType;
      if (obj.searchSubject) {
        return fetchBangumiDataBySearch(request.subjectInfo, newSubjectType);
      }
      browser.tabs.create({
        url: `https://bgm.tv/new_subject/${newSubjectType}`
      });
    })
    .then((d) => {
      if (d) {
        console.log('ddddddd', d);
        browser.tabs.create({
          url: d.subjectURL
        });
      }
    })
    .catch((r) => {
      console.log('err:', r);
    });
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
  };
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
Called when there was an error.
We'll just log the error here.
*/
function onError(error) {
  console.log(`Error: ${error}`);
}

browser.contextMenus.create({
  id: "bangumi-new-wiki",
  title: 'Bangumi new subject',
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
          var file = '/dist/content.js';
          if (url.match(/bgm\.tv|bangumi\.tv|chii\.in/)) {
            file = '/dist/bangumi.js';
          }
          return browser.tabs.executeScript({
            file: file
          });
        });
      break;
  }
});
