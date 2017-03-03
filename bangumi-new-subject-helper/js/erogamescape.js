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


var erogamescape = {
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
    info['ブランド'] = title[1].textContent.replace(/\(.*\)/, '');
    info['発売日'] = title[2].textContent.replace(/-/g,'/');
    if (document.getElementById('genga')) {
      info['原画'] = document.querySelector('#genga td').textContent;
    }
    if (document.getElementById('shinario')) {
      info['シナリオ'] = document.querySelector('#shinario td').textContent;
    }
    if (document.getElementById('ongaku')) {
      info['音楽'] = document.querySelector('#ongaku td').textContent;
    }
    if (document.getElementById('kasyu')) {
      info['アーティスト'] = document.querySelector('#kasyu td').textContent;
    }
    chrome.storage.local.set({
      'subjectData': JSON.stringify(info)
    });
    chrome.storage.local.get('subjectData', function(val) {
      console.log(val.subjectData);
    });
    return info;
  },
};

if (erogamescape.isGamepage()) {
  addNode(erogamescape.softtitle());
  erogamescape.getSubjectInfo();
}
