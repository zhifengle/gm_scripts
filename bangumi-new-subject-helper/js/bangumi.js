var SEARCH = {
  init: function() {
    SEARCH.addIcon();
    this.registerEvent();
  },
  creadIcon: function(prop, imgsrc) {
    var icon = $('<a>');
    var img = $('<img>');
    img.attr('src', imgsrc);
    if (typeof prop === "object") {
      icon.attr(prop);
    }
    return icon.append(img);
  },
  addIcon: function() {
    this.creadIcon({href:"",target:"_blank",class:'search-baidu'}, chrome.extension.getURL("image/Baidu.png")).insertBefore($('#headerSearch .search'));
    this.creadIcon({href:"https://cse.google.com/cse/home?cx=008561732579436191137:pumvqkbpt6w", target:"_blank", class:'search-google'}, chrome.extension.getURL("image/Google.png")).insertBefore($('#headerSearch .search'));
  },
  registerEvent: function() {
    $('.search-baidu').mouseover(function() {
      if ($('#search_text').val()) {
      $(this).attr('href',"http://www.baidu.com/s?&ie=UTF-8&oe=UTF-8&cl=3&rn=100&wd=%20%20" + encodeURIComponent($("#search_text").val()) + " site:bangumi.tv");
      }
    });
    $('.search-google').mouseover(function() {
      if ($('#search_text').val()) {
        chrome.storage.local.set({"subjectData": JSON.stringify({subjectName:$('#search_text').val()})});
      }
    });
  },
};


var bangumi = {
  fillForm: function(data) {
    var pNode = $('.settings .inputtext').eq(0);
    if (data.subjectName && pNode) {
      pNode.val(data.subjectName);
    }
    if (data.subjectStory) {
      $('#subject_summary').val(data.subjectStory);
    }
    setTimeout(function (){$('#showrobot').click();},300);
    $('.fill-form').click(function() {
      window.NormaltoWCODE();
      setTimeout(function() {
        if ($('#subject_infobox')) {
          var infobox = ["{{Infobox Game", "|中文名=", "|平台={", "[PC]", "}", "|游玩人数=1"];
          var infodict = {
            "ブランド": "开发",
            "原画": "原画",
            "音楽": "音乐",
            "シナリオ": "剧本",
            "アーティスト": "主题歌演出",
            "作詞": "主题歌作词",
            "作曲": "主题歌作曲",
            "発売日": "发行日期",
            "ジャンル": "游戏类型",
            "定価": "售价",
          };
          for (var prop in infodict) {
            if (data[prop]) {
              infobox.push("|item=".replace("item", infodict[prop]) + data[prop]);
            }
          }
          infobox.push("}}");
          $('#subject_infobox').val(infobox.join('\n'));
        }
      }, 1000);
    });
  },
  fillFormCharacter: function(data) {
    var pNode = $('.settings .inputtext').eq(0);
    if (data.characterName && pNode) {
      pNode.val(data.characterName);
    }
    if (data.characterIntro) {
      $('#crt_summary').val(data.characterIntro);
    }
    setTimeout(function (){$('#showrobot').click();},300);
    $('.fill-form').click(function() {
      var $text = $('.inputtext.prop');
      $text.eq(4).val(data['日文名']);
      if (data.hiraganaName)
        $text.eq(5).val(data.hiraganaName);
      var alist = ['性别', '生日', '血型', '身高', '体重', 'BWH', '引用来源'];
      var inputtext = $text.filter(':gt(7)');
      alist.forEach(function(element, index) {
        if (data[element]) {
          inputtext.eq(index).val(data[element]);
        }
      });
    });
  },
  addNode: function() {
    $('<span>').attr({class:'fill-form'}).text('填表').insertAfter($('.settings .alarm').eq(0));
  },
  newSubject: function() {
    bangumi.addNode();
    chrome.storage.local.get("subjectData", function(val) {
      var selfInvokeScript = document.createElement("script");
      selfInvokeScript.innerHTML = "(" + bangumi.fillForm.toString() + ")(" + val.subjectData + ");";
      document.body.appendChild(selfInvokeScript);
    });
  },
  createTable: function(data) {
    var html = '';
    // first td
    var html1 = '<td style="width:100px;" align="right" valign="top">';
    // second td
    var html2 = '<td style="width:auto;" align="top">';
    var filterDict = {
      "subjectName": "游戏",
      "ブランド": "开发",
      "原画": "原画",
      "音楽": "音乐",
      "シナリオ": "剧本",
      "アーティスト": "主题歌演出",
      "作詞": "主题歌作词",
      "作曲": "主题歌作曲",
      "cv": "声优"
    };
    for (var prop in data) {
      if (filterDict[prop]) {
        html += '<tr>' + html1 + filterDict[prop] + '：</td>';
        var td2;
        if (data[prop].match('、')) {
          td2 = data[prop].split('、').map(function(item) {
            return '<span>' + item + '</span>';
          }).join('、');
        } else if(data[prop].match(',')) {
          td2 = data[prop].split(',').map(function(item) {
            return '<span>' + item + '</span>';
          }).join(',');
        } 
        else {
          td2 = '<span>' + data[prop] + '</span>';
        }
        html += html2 + td2 + '</td></tr>';
      }
    }
    return html;
  },
  addRelated: function() {
    chrome.storage.local.get("subjectData", function(val) {
      $('#columnCrtRelatedA').append($('<table>').addClass('a-table').html(bangumi.createTable(JSON.parse(val.subjectData))));
      $('.a-table span').each(function(index, element) {
        $(this).click(function() {
          var searchtext = $(this).text().replace(/\(.*\)/,'');
          console.log(searchtext);
          $('#subjectName').val(searchtext);
          window.setTimeout(function() {
            $('#findSubject').click();
          }, 300);
        });
      });
    });
  },
  newCharacter: function() {
    bangumi.addNode();
    chrome.storage.local.get("charaData", function(val) {
      var selfInvokeScript = document.createElement("script");
      selfInvokeScript.innerHTML = "(" + bangumi.fillFormCharacter.toString() + ")(" + val.charaData + ");";
      document.body.appendChild(selfInvokeScript);
    });
  }
};
/*
   var selectlist = {
1001: "开发",
1004: "剧本",
1013: "原画",
1006: "音乐",
}
*/

