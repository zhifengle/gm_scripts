// ==UserScript==
// @name        bangumi new subject helper
// @namespace   https://github.com/22earth
// @description assist create new subject
// @include     http://www.getchu.com/soft.phtml?id=*
// @include     /^https?://(bangumi|bgm|chii)\.(tv|in)/.*$/
// @include     http://bangumi.tv/subject/*/add_related/person
// @include     http://bangumi.tv/subject/*/edit_detail
// @include     https://cse.google.com/cse/home?cx=008561732579436191137:pumvqkbpt6w
// @include     http://erogamescape.ddo.jp/~ap2/ero/toukei_kaiseki/*
// @version     0.1
// @run-at      document-end
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(function () {
  var INFO_DICT_GAME = {
    "ブランド": ["开发", "brand"],
    "定価": ["售价", "price"],
    "発売日": ["发行日期", "releaseDate"],
    "原画": ["原画", "painter"],
    "音楽": ["音乐", "music"],
    "シナリオ": ["剧本", "scenario"],
    "歌手": ["歌手", "singer"],
  };

  var FILTER_LIST_GETCHU = ["ブランド","定価","発売日","原画","音楽","シナリオ"];

  var replaceAll = function(str,mapObj){
    var re = new RegExp(Object.keys(mapObj).join("|"),"gi");

    return str.replace(re, function(matched){
      return mapObj[matched.toLowerCase()];
    });
  };
  // this function copy from a script named "挊"
  var $c = function(arg) {
    'use strict';
    var node = null;
    if (typeof arg === 'object') {
      if (arg.clone) {
        node = arg.clone.cloneNode(true);
      }
      else if (arg.self) {
        node = arg.self;
      }
      else if (arg.tag) {
        node = document.createElement(arg.tag);
      }
      if (node) {
        if (arg.prop) {
          for (var attr in arg.prop) {
            if (attr === 'css') {
              node.setAttribute('style', arg.prop[attr]);
            }
            else if (attr === 'className') {
              node.className = arg.prop[attr];
            }
            else if (attr === 'textContent' || attr === 'innerHTML') {
              node[attr] = arg.prop[attr];
            }
            else {
              node.setAttribute(attr, arg.prop[attr]);
            }
          }
        }
        if (arg.event) {
          node.addEventListener(arg.event.type, arg.event.listener, false);
        }
        if (arg.append) {
          for (var index = 0; index < arg.append.length; index++) {
            if (arg.append[index] instanceof HTMLElement) {
              node.appendChild(arg.append[index]);
            }
            else { //object
              node.appendChild($c(arg.append[index]));
            }
          }
        }
      }

      /*if (arg.funcs) {
        for (var f in arg.funcs) {
        f();
        }
        }*/
    }
    return node;
  };

  var sites = {
    bangumi: {
      fillForm: function (subjectData) {
        if (subjectData.subjectName && document.getElementsByTagName("tbody")) {
          var gamename = document.getElementsByTagName("tbody")[0].children[0].children[1];
          gamename.firstChild.value = subjectData.subjectName;
        }
        setTimeout(function () {
          var inputtext = document.getElementById('infobox_normal').querySelectorAll("[class='inputtext prop']");
          inputtext[4].value = subjectData.releaseDate;
          inputtext[5].value = subjectData.price;
          document.getElementById('subject_summary').value = subjectData.subjectStory;
        }, 1000);
        setTimeout(function (){document.getElementById("showrobot").click();},300);
      },
      enhanceSearch: function(APIs) {
        $c({
          self: document.querySelector('.inner'),
          append: [
            {
              tag: 'a',
              prop: {
                href: 'https://cse.google.com/cse/home?cx=008561732579436191137:pumvqkbpt6w',
                target: '_blank',
                class: 'search-icon',
              }
            }
          ],
        });
        $c({
          self: document.querySelector('.search-icon'),
          append: [
            {
              tag: 'img',
              prop: {
                src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA/0lEQVQ4jZWTvcqDMBiF30vIHXR1dXXp4urqakeXdu9VdPCjH1RwEBwEoWKhcy6g3dur6FaqxpwutT8axRw4BHLO84ZAQtTRfX1Gd08nHy1NgofKWvA3hPkOozDYhmEWcMz+0PN893EvDzjYhpE0tlwa/5DBCVoKTpDGlpM0Q0gz1INfkmYIaqwIjRUBAO7r89sqdfPGikDCjiHsuFcWx+sPII7XfseOQcJJIJxEeYJq/c6Fk4BqN0XtpoP3HLoOANRuCqq8DJWXDZbGVHkZqPRzlH4OcbhoweJwQennoMey4OWqQNetVFnrx7LgdFvsmWrIFPi22DPl824HTPkvT9sRgk1EfrMcAAAAAElFTkSuQmCC',
                style: 'display:inline-block;border:none;height:16px;width:16px;margin-left:2px',
              },
            }
          ],
        });
        $c({
          self: document.querySelector('.inner'),
          append: [
            {
              tag: 'a',
              prop: {
                href: '',
                target: '_blank',
                class: 'search-baidu',
              }
            }
          ],
        });
        $c({
          self: document.querySelector('.search-baidu'),
          append: [
            {
              tag: 'img',
              prop: {
                src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAGFBMVEX///8+Nt8iGNthW+Xg3/mYlO3Fw/XV0/ihMmmuAAAAZElEQVQI12MQhAIGAQYwYAQy2MNZHMAMZmVHERCDhVk4UQzEcDYIZw1zADKCxBkYnE2AjEQzZ5NANSCDNURIGSzC4KykZJIAZLALKSkpO4CklIAgAcYIABloaBooDJSCWQp3BgCSZA0vSebFIAAAAABJRU5ErkJggg==',
                style: 'display:inline-block;border:none;height:16px;width:16px;margin-left:2px',
              },
            }
          ],
        });
      },
      handleEvent: function(event) {
        searchtext = document.getElementById('search_text');
        if (searchtext.value) {
//          alert(searchtext.value);
          if (event.target.className === "search-icon") {
            GM_setValue('subjectData', JSON.stringify({subjectName: searchtext.value}));
          } else if (event.target.className === "search-baidu") {
              var text = searchtext.value + " site:" + window.location.hostname;
              event.target.href = "http://www.baidu.com/s?&ie=UTF-8&oe=UTF-8&cl=3&rn=100&wd=%20%20" + encodeURIComponent(text);
          }
        }
        else {
//          document.querySelector('.search-icon').addEventListener('click', function(event) { event.preventDefault(); }, false);
//          document.querySelector('.search-baidu').addEventListener('click', function(event) { event.preventDefault(); }, true);
        }
      },
      registerEvent: function() {
        document.querySelector('.search-icon').addEventListener('mouseover', this.handleEvent, false);
        document.querySelector('.search-baidu').addEventListener('mouseover', this.handleEvent, true);
      },
    },
    google: {
      fillForm: function(data) {
        // need google api load, to get elements you can use getAllElements()
        // https://developers.google.com/custom-search/docs/element#cse-element
        window.onload = function() {
          var element= google.search.cse.element.getElement("standard0");
          element.execute(data.subjectName);
        };
      },
    },
  };

  var addNode = function(pNode) {
    $c({
      self: pNode,
      append: [{
        tag: 'a',
        prop: {
          className: 'new-subject',
          target: '_blank',
          textContent: "新建条目",
          href: "http://bangumi.tv/new_subject/4",
        }
      },
      {
        tag: 'a',
        prop: {
          className: 'search-subject',
          target: '_blank',
          textContent: '搜索条目',
          href: 'https://cse.google.com/cse/home?cx=008561732579436191137:pumvqkbpt6w',
        }
      }],
    });

  };

  var dbsites = {
    getchu: { // getchu has imported jquery
      softtitle: function() {
        return document.getElementById("soft-title");
      },
      getSubjectInfo: function() {
        var basicInfo = {};
        basicInfo.subjectUrl = window.location.href;
        // subject name
        basicInfo.subjectName = document.getElementById("soft-title").textContent.split('\n')[1].replace(/\s.*版.*/,'');

      if (document.getElementsByTagName("table")) {
        var infoTable = document.getElementsByTagName("table")[2].getElementsByTagName('tr');
        // separately deal brand price and release date
        basicInfo.brand = infoTable[0].textContent.split('\n')[0].split('：')[1];
        basicInfo.price = infoTable[1].textContent.split('：')[1];
        basicInfo.releaseDate = infoTable[2].textContent.trim().split("\n")[1];
        var re = new RegExp(Object.keys(INFO_DICT_GAME).join("|"),"gi");
        for (var i = 3, len = infoTable.length; i < len; i += 1) {
          var alist = infoTable[i].textContent.split('：');
          if (alist[0].match(re)) {
            basicInfo[INFO_DICT_GAME[alist[0]][1]] = alist[1];
          }
        }

      }
      var story = document.querySelectorAll("div.tabletitle");
      var subjectStory = "";
      for (var j = 0; j < story.length; j += 1) {
        if (story[j].textContent.match(/ストーリー|商品紹介/)) {
          subjectStory = story[j].nextElementSibling.textContent.replace(/^\s*[\r\n]/gm,'');
          break;
        }
      }
      basicInfo.subjectStory = subjectStory;

      return basicInfo;
      },
        //        return replaceAll(document.getElementsByTagName("table")[2].innerHTML, {"<a":"<span","<\/a>":"<\/span>"});
      storeData: function () {
        GM_setValue("subjectData", JSON.stringify(this.getSubjectInfo()));
        //        GM_setValue("subjectInfoTable", getInfoTable());
        console.log(GM_getValue("subjectData"));
      }
    },
    erogamescape: {
      softtitle: function() {
        return document.getElementById("soft-title");
      },
      getSubjectInfo: function() {
        var info = {};
        var title = softtitle().children;
        info.subjectName = title[0].textContent;
        info.brand = title[1].textContent.replace(/\(.*\)/, '');
        info.releaseDate = title[2].textContent.replace(/-/g,'/');
        if (document.getElementById('genga')) {
        info.painter = document.querySelector('#genga td').textContent;
        }
        if (document.getElementById('shinario')) {
        info.scenario = document.querySelector('#shinario td').textContent;
        }
        if (document.getElementById('ongaku')) {
          info.music = document.querySelector('#ongaku td').textContent;
        }
        if (document.getElementById('kasyu')) {
          info.singer = document.querySelector('#kasyu td').textContent;
        }
        return info;
      },
      storeData: function() {
        GM_setValue("subjectData", JSON.stringify(this.getSubjectInfo()));
      },
    },
  };


  var addStyle = function (css) {
    if (css) {
      GM_addStyle(css);
    }
    else {
      GM_addStyle([
        '.new-subject,.search-subject{color: rgb(0, 180, 30) !important;margin-left: 4px;}',
        '.new-subject:hover,.search-subject:hover{color:red !important;}',
      ].join(''));
    }
  };

  var init = function () {
    var url = document.location.href;
    if (url.match(/bangumi|chii|bgm/)) {
      sites.bangumi.enhanceSearch();
      sites.bangumi.registerEvent();
    }
    for (var site in dbsites) {
      if (document.location.href.match(site) && document.getElementById('soft-title')) {
        /*
           for (var prop in dbsites[site]) {
           if (typeof dbsites[site][prop] === "function") {
           dbsites[site][prop]();
           }
           }
           */
        addStyle();
        addNode(document.getElementById('soft-title'));
        dbsites[site].storeData();
        console.log("It's ok here");
        console.log(GM_getValue("subjectData"));
        //      console.log(GM_getValue("subjectInfoTable"));
      }
    }

    // fillform for bangumi and google site search
    if (document.location.href.match(/google|new_subject/)) {
      for (var asite in sites) {
        if (document.location.href.match(asite)) {
          $c({
            self: document.body,
            append: [{
              tag: "script",
              prop: {
                innerHTML: "(" + sites[asite].fillForm.toString() + ")(" + GM_getValue("subjectData") + ");",
              },
            }]
          });

        }
      }
    }

    // add infotable
    if (document.location.href.match(/person|new_subject/)) {
      addStyle([
        '.a-table{border:1px solid red;float:left;margin-top:20px;width:340px;}',
        '.a-table span:hover{color:red;cursor:pointer;}',
        '.a-table span{color:rgb(0,180,30);}',
      ].join(''));
      // if in person page
      $c({
        self: document.getElementById("columnCrtRelatedA"),
        append: [{
          tag: "table",
          prop: {
            class: "a-table",
            innerHTML: GM_getValue("subjectInfoTable"),
          },
        }],
      });
      // new subject page
      $c({
        self: document.getElementById("columnInSubjectB"),
        append: [{
          tag: "table",
          prop: {
            class: "a-table",
            // innerHTML: JSON.parse(GM_getValue("subjectData")).infoTable,
            innerHTML: GM_getValue("subjectInfoTable"),
          },
        }],
      });
    }

  };

  init();

})();
