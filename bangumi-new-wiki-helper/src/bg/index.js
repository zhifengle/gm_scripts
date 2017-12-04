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
  id: "remove-me",
  title: 'test bg',
  contexts: ["all"]
}, onCreated);

browser.menus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "remove-me":
      var makeItGreen = 'document.body.style.border = "5px solid green"';
      var executing = browser.tabs.executeScript({
        code: makeItGreen
      });
      executing.then(onExecuted, onError);
      // var removing = browser.menus.remove(info.menuItemId);
      // removing.then(onRemoved, onError);
      // return browser.tabs.executeScript(tab.id, {
      //   file: "clipboard-helper.js",
      // });
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
