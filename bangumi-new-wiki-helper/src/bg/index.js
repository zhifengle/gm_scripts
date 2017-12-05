import 'webextension-polyfill'
import models from '../models'

browser.storage.local.set(models);
browser.storage.local.set({
  currentModel: {
    name: 'getchu',
    descrition: 'Getchu game'
  }
});

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

browser.menus.create({
  id: "bangumi-new-wiki",
  title: 'test bg',
  contexts: ["all"]
}, onCreated);

browser.menus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "bangumi-new-wiki":
      /*
       * browser.tabs.query({ 'active': true, 'lastFocusedWindow': true })
       *   .then(tabs => tabs[0].url)
       *   .then(url => {
       *     return browser.tabs.executeScript({
       *       code: 'var testfff = 1;'
       *     })
       *   });
       */
      browser.tabs.executeScript({
        file: '/dist/content.js'
      });
      break;
    case "bluify":
      borderify(tab.id, blue);
      break;
    case "greenify":
      borderify(tab.id, green);
      break;
    case "check-uncheck":
      updateCheckUncheck();
      break;
    case "open-sidebar":
      console.log("Opening my sidebar");
      break;
    case "tools-menu":
      console.log("Clicked the tools menu item");
      break;
  }
});
