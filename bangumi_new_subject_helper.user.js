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
// @include     http://www.dmm.co.jp/dc/pcgame/*
// @version     0.1
// @run-at      document-end
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(function () {
  var INFO_DICT_GAME = [
    ["ブランド", "开发", "brand"],
    ["定価", "售价", "price"],
    ["発売日", "发行日期", "releaseDate"],
    ["配信開始日", "发行日期", "releaseDate"],
    ["原画", "原画", "painter"],
    ["音楽", "音乐", "music"],
    ["シナリオ", "剧本", "scenario"],
    ["歌手", "歌手", "singer"],
    ["ジャンル", "游戏类型", "genre"],
  ];

  var FILTER_LIST_GETCHU = ["ブランド","定価","発売日","原画","音楽","シナリオ"];

  function replaceAll (str,mapObj){
    var re = new RegExp(Object.keys(mapObj).join("|"),"gi");

    return str.replace(re, function(matched){
      return mapObj[matched.toLowerCase()];
    });
  }
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
      fillForm2: function (subjectData) {
        if (subjectData.subjectName && document.getElementsByTagName("tbody")) {
          var gamename = document.getElementsByTagName("tbody")[0].children[0].children[1];
          gamename.firstChild.value = subjectData.subjectName;
        }
        if (subjectData.subjectStory) {
          document.getElementById('subject_summary').value = subjectData.subjectStory;
        }
        var adict = {
          "brand": "开发",
          "price": "售价",
          "releaseDate": "发行日期",
          "painter": "原画",
          "music": "音乐",
          "scenario": "剧本",
          "singer": "歌手",
          "genre": "游戏类型",
        };
        var aspan = document.createElement('span');
        aspan.textContent = "填表";
        aspan.className = 'fill-form';
        document.getElementsByTagName("tbody")[0].children[0].children[1].appendChild(aspan);
        // fill infobox
        document.querySelector('.fill-form').addEventListener('click', function() {
          NormaltoWCODE();
          var infobox = document.getElementById('subject_infobox');
          var infobox_game =  ["{{Infobox Game", "|中文名= ", "|别名={", "}", "|平台={", "[PC]", "}", "|游戏类型= ", "|游戏引擎= ", "|游玩人数= 1人", "|发行日期= ", "|售价= ", "|website= ", "|开发= ", "|原画= ", "|剧本= ", "|音乐= ", "}}"];
          var info_list = INFO_DICT_GAME.map(function(arr) {return arr[1];});
          infobox.value = infobox_game.map(function(elem) {
            if (elem.match(/^.*=\s$/)) {
              var name = elem.substring(1, elem.indexOf('='));
              var pos = info_list.indexOf(name);
              if (pos !== - 1 && subjectData[INFO_DICT_GAME[pos][2]])
                return elem + subjectData[INFO_DICT_GAME[pos][2]];
              else
                return elem;
            } else
              return elem;
          });
        }, false);
      },
      fillForm: function (subjectData) {
        if (subjectData.subjectName && document.getElementsByTagName("tbody")) {
          var gamename = document.getElementsByTagName("tbody")[0].children[0].children[1];
          gamename.firstChild.value = subjectData.subjectName;
        }
        setTimeout(function () {
          var inputtext = document.getElementById('infobox_normal').querySelectorAll("[class='inputtext prop']");
          var inputid = document.getElementById('infobox_normal').querySelectorAll("[class='inputtext id']");
          inputtext[1].value = subjectData.genre;
          inputtext[3].value = '1';
          if (subjectData.releaseDate) {
            inputtext[4].value = subjectData.releaseDate;
          }
          if (subjectData.price) {
            inputtext[5].value = subjectData.price;
          }
          if (subjectData.subjectStory) {
            document.getElementById('subject_summary').value = subjectData.subjectStory;
          }
        }, 300); // 1000
        [100,100,100,100].forEach(function(time) {
          setTimeout(addoneprop, time);
        });
        document.querySelector('.fill-form').addEventListener('click', function (evnt) {
//          console.log('hello');
          var inputtext = document.getElementById('infobox_normal').querySelectorAll("[class='inputtext prop']");
          var inputid = document.getElementById('infobox_normal').querySelectorAll("[class='inputtext id']");
          var len = inputtext.length;
          console.log(len);
          if (len > 8) {
            if (subjectData.music) {
              inputid[len-2].value = '音乐';
              inputtext[len-2].value = subjectData.music;
            }
            if (subjectData.scenario) {
              inputid[len-3].value = '剧本';
              inputtext[len-3].value = subjectData.scenario;
            }
            if (subjectData.painter) {
              inputid[len-4].value = '原画';
              inputtext[len-4].value = subjectData.painter;
            }
            if (subjectData.brand) {
              inputid[len-5].value = '开发';
              inputtext[len-5].value = subjectData.brand;
            }
          }
        });
        setTimeout(function (){document.getElementById("showrobot").click();},300);
      },
      enhanceSearch: function(APIs) {
        $c({
          self: document.querySelector('#headerSearch .inner'),
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
          self: document.querySelector('#headerSearch .inner'),
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
      createTable: function(infoObj) {

      }
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
    getchu: { 
      isGamepage: function () {
        if (document.getElementsByClassName('genretab current').length && document.getElementsByClassName('genretab current')[0].textContent.match("ゲーム")) {
          return true;
        }
      },
      softtitle: function() {
        return document.getElementById("soft-title");
      },
      getSubjectInfo: function() {
        var basicInfo = {};
        //        basicInfo.subjectUrl = window.location.href;
        // subject name
        basicInfo.subjectName = document.getElementById('soft-title').textContent.split('\n')[1].replace(/\s.*?版.*|新.*/,'');

      if (document.getElementsByTagName("table").length) {
        var infoTable = document.getElementsByTagName("table")[2].getElementsByTagName('tr');
        // separately deal brand price and release date
        basicInfo.brand = infoTable[0].textContent.split('\n')[0].split('：')[1];
        basicInfo.price = infoTable[1].textContent.split('：')[1];
        basicInfo.releaseDate = infoTable[2].textContent.trim().split("\n")[1];
        //        var re = new RegExp(Object.keys(INFO_DICT_GAME).join("|"),"gi");
        var info_list = INFO_DICT_GAME.map(function(arr) {return arr[0];});
        for (var i = 3, len = infoTable.length; i < len; i += 1) {
          var alist = infoTable[i].textContent.split('：');
          if (info_list.indexOf(alist[0]) !== -1) {
            basicInfo[INFO_DICT_GAME[info_list.indexOf(alist[0])][2]] = alist[1];
          }
        }

      }
      var story = document.querySelectorAll("div.tabletitle");
      var subjectStory = "";
      for (var j = 0; j < story.length; j += 1) {
        if (story[j].textContent.match(/ストーリー/)) {
          subjectStory = story[j].nextElementSibling.textContent.replace(/^\s*[\r\n]/gm,'');
          break;
        } else if(story[j].textContent.match(/商品紹介/)) {
          subjectStory = story[j].nextElementSibling.textContent.replace(/^\s*[\r\n]/gm,'');
          break;
        }
      }
      basicInfo.subjectStory = subjectStory;
      console.log(basicInfo);

      return basicInfo;
      },
//      getInfoTable: function() {
//        var infoTable = document.getElementsByTagName("table")[2].querySelectorAll('tr');
//        var filtlist = ['ブランド', '原画', 'シナリオ'];
//        return replaceAll(document.getElementsByTagName("table")[2].innerHTML, {"<a":"<span","<\/a>":"<\/span>"});

//      },
      storeData: function () {
        GM_setValue("subjectData", JSON.stringify(this.getSubjectInfo()));
      },
      handleEvent: function (event) {
        var searchtext = document.getElementById('soft-title').textContent.split('\n')[1].replace(/\s.*版.*|新.*/,'');
      if (event.target.className === 'search-subject') {
        event.target.href = "https://www.google.com/search?q=" + encodeURIComponent(searchtext) + " site:bangumi.tv";
      }
      },
      registerEvent: function () {
        document.querySelector('.search-subject').addEventListener('mouseover', this.handleEvent, false);
      },
    },
    erogamescape: {
      isGamepage: function () {
        if (window.location.search.match('game')) {
          return true;
        }
      },
      softtitle: function () {
        return document.getElementById("soft-title");
      },
      getSubjectInfo: function() {
        var info = {};
        var title = this.softtitle().children;
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
        console.log(info);
        return info;
      },
      storeData: function() {
        GM_setValue("subjectData", JSON.stringify(this.getSubjectInfo()));
      },
    },

    dmm: {
      isGamepage: function () {
        if (window.location.pathname.match('pcgame')) {
          return true;
        }
      },
      softtitle: function () {
        return document.getElementById('title');
      },
      getSubjectInfo: function () {
        var info = {}, infoTable, re;
        info.subjectName = this.softtitle().textContent.trim().replace(/\b.*?版.*|新.*/, '');
      if (document.querySelectorAll('.float-l.mg-b20').length > 1) {
        infoTable = document.querySelectorAll('.float-l.mg-b20')[1].getElementsByTagName('tr');
        //          re = new RegExp(Object.keys(INFO_DICT_GAME).join("|"),"gmi");
        var info_list = [];
        INFO_DICT_GAME.forEach(function(arr) {
          info_list.push(arr[0]);
        });
        for (var i = 0; i < infoTable.length; i += 1) {
          var alist = infoTable[i].textContent.split('：').map(String.trim);
          if (info_list.indexOf(alist[0]) !== -1) {
            basicInfo[INFO_DICT_GAME[info_list.indexOf(alist[0])][2]] = alist[1];
          }
        }
      }
      info.subjectStory = document.querySelector('.mg-b20.lh4').textContent.replace(/[\s].*特集.*/,'');
      return info;
      },
      storeData: function () {
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
        '.new-subject,.search-subject,.fill-form{color: rgb(0, 180, 30) !important;margin-left: 4px !important;}',
        '.new-subject:hover,.search-subject:hover,.fill-form:hover{color:red !important;cursor:pointer;}',
      ].join(''));
    }
  };

  var init = function () {
    var url = document.location.href;
    if (url.match(/bangumi|chii|bgm/)) {
      sites.bangumi.enhanceSearch();
      sites.bangumi.registerEvent();
    }
    //    dbsites.dmm.getSubjectInfo();
    for (var site in dbsites) {
      if (url.match(site) && dbsites[site].isGamepage()) {
        addStyle();
        addNode(dbsites[site].softtitle());
        console.log('addNode success');
        dbsites[site].storeData();
        console.log('storeData success');

        //        if (window.stop && dbsites[site].registerEvent) {
        //          dbsites[site].registerEvent();
        //        }
//        console.log(GM_getValue("subjectData"));
      }
    }

    // fillform for bangumi and google site search
    if (url.match(/google|new_subject/)) {
      for (var asite in sites) {
        if (url.match(asite)) {
          if (url.match(/new_subject\/4/)) {
            addStyle();
            $c({
              self: document.getElementsByTagName("tbody")[0].children[0].children[1],
              append: [{
                tag: 'span',
                prop: {
                  className: 'fill-form',
                  textContent: '填表',
                }
              }]
            });
          }
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
    if (url.match(/person/)) {
      addStyle([
        '.a-table{border:1px solid red;float:left;margin-top:20px;width:340px;}',
        '.a-table span:hover{color:red;cursor:pointer;}',
        '.a-table span{color:rgb(0,180,30);}',
      ].join(''));
      var createTable = function (obj) {
        var html = '';
        var html1 = '<td style="width:100px;" align="right" valign="top">';
        var html2 = '<td style="width:auto;" align="top">';
        var adict = {
          "brand": "开发",
          "painter": "原画",
          "music": "音乐",
          "scenario": "剧本",
          "singer": "歌手",
        };
        for (var prop in obj) {
          if (adict[prop]) {
            html += '<tr>' + html1 + adict[prop] + '：</td>';
            var td2;
            if (obj[prop].match('、')) {
              td2 = obj[prop].split('、').map(function(item) {
                return '<span>' + item + '</span>';
              }).join('、');
            } else if(obj[prop].match(',')) {
              td2 = obj[prop].split(',').map(function(item) {
                return '<span>' + item + '</span>';
              }).join(',');
            } 
            else {
              td2 = '<span>' + obj[prop] + '</span>';
            }
            html += html2 + td2 + '</td></tr>';
          }
        }
        return html;
      };
      // if in person page
      if (document.getElementById("columnCrtRelatedA")) {
        console.log('begin createTable');
        $c({
          self: document.getElementById("columnCrtRelatedA"),
          append: [{
            tag: "table",
            prop: {
              className: "a-table",
              innerHTML: createTable(JSON.parse(GM_getValue("subjectData"))),
            },
          }],
        });

      }
      // new subject page
      if (document.getElementById("columnInSubjectB")) {
        $c({
          self: document.getElementById("columnInSubjectB"),
          append: [{
            tag: "table",
            prop: {
              class: "a-table",
              innerHTML: GM_getValue("subjectInfoTable"),
            },
          }],
        });
      }
      console.log(document.querySelector('.a-table span'));
      var span = document.getElementsByClassName('a-table')[0].getElementsByTagName('span');
      for (var k = 0; k < span.length; k += 1) {
        span[k].addEventListener('click', function(event) {
          document.getElementById('subjectName').value = event.target.textContent.replace(/\(.*\)/,'');
          window.setTimeout(function() {
            document.getElementById('findSubject').click();
          }, 300);
        }, false);
      }
    }
  };


  init();
})();
