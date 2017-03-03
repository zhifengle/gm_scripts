// ==UserScript==
// @include        chrome://browser/content/browser.xul
// ==/UserScript==
var bilidan = {
  init: function()
  {
    this.mItem = document.createElement("menuitem");
    this.mItem.setAttribute("label", "bilidan");
    this.mItem.setAttribute("accesskey", "B");
    this.mItem.setAttribute("hidden", "true");
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", function() { bilidan.onPopupShowing(this); }, false);
  },

  onPopupShowing: function(aPopup)
  {
    aPopup.insertBefore(this.mItem, document.getElementById("context-sep-" + ((gContextMenu.onLink)?"open":"stop")));
    this.mItem.setAttribute("oncommand", "bilidan.launch(" + ((gContextMenu.onLink)?"gContextMenu.linkURI":"gBrowser.currentURI") + ");");
    if (content.location.href.match(/bilibili/) && gContextMenu.onLink) {
      this.mItem.removeAttribute('hidden');
    } else {
      this.mItem.setAttribute('hidden', true);
    }
  },

  launch: function(aURI, aApp)
  {
    var exe = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
    exe.initWithPath("/usr/bin/python3");
    var process = Components.classes['@mozilla.org/process/util;1'].createInstance(Components.interfaces.nsIProcess);
    process.init(exe);
    try {
      var hostname = "http://www.bilibili.com/";
      var ios = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
      var uri = ios.newURI(hostname, null, null);

      var cookieSvc =
        Components.classes["@mozilla.org/cookieService;1"]
        .getService(Components.interfaces.nsICookieService);
      var cookie = cookieSvc.getCookieString(uri, null);
      //var file = Components.classes["@mozilla.org/file/directory_service;1"].
          //getService(Components.interfaces.nsIProperties).
          //get("Home", Components.interfaces.nsIFile);
      //var parameters = [file.path + "/github/BiliDan/bilidan.py", 
      var parameters = [this.getBilidanFile(), 
          "--cookie='"+ cookie + "'",
          aURI.spec];
          process.run(false, parameters,parameters.length);

    }
    catch (errorInfo) {
      alert(errorInfo);
    }
  },
  getBilidanFile: function () {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    var prefs = Services.prefs.getBranch("userChromeJS.bilidan.");
    try {
      var file = prefs.getComplexValue("path", Components.interfaces.nsILocalFile);
      if (file.exists() && file.path.match('bilidan')) return file.path;
      else {
        alert("选择文件有错误或者bilidan.py文件不存在");
        prefs.setCharPref("path", '');
        this.getBilidanFile();
      }
    }

    catch (e) {
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(window, "请选择bilidan.py文件", nsIFilePicker.modeOpen);
      fp.appendFilter("All Files" ,"*.py");

      var res = fp.show();
      if (res != nsIFilePicker.returnCancel){
        prefs.setComplexValue("path", Components.interfaces.nsIFile, fp.file);
        return fp.file.path;
      }
    }
  }
};

bilidan.init();
