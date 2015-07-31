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
        //        todo: get cookie 
//        var cookie = document.cookie;
        var parameters = ["/home/kun/github/BiliDan/bilidan.py", 
            "--cookie='fts=1531478501961; sid=67d5dkl0; PLHistory=b4mU%7Cn mgB; DedeID=2638404; fts=1531480666323; uTZ=-480; _cnt_dyn=0; DedeUserID=510598; DedeUserID__ckMd5=85d001f85ac64442; SESSDATA=d80a7f28%2C1438773954%2C2e97ddcf; _cnt_pm=0; _cnt_notify=26; LIVE_LOGIN_DATA=1d724d1856d05b67f8586980e43da0f065be91db; LIVE_LOGIN_DATA__ckMd5=9bd67486efbd023b; popunder=yes; popundr=yes; setover18=1'",
            aURI.spec];
        process.run(false, parameters,parameters.length);
    },
};

bilidan.init();
