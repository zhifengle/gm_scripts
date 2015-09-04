var subjectData = "";
var adict = [
  {
    "定価": "售价",
    "発売日": "发行日期",
    "ジャンル": "游戏类型",
  },
  {
    "ブランド": "开发",
    "原画": "原画",
    "音楽": "音乐",
    "シナリオ": "剧本",
    "アーティスト": "主题歌演出",
    "作詞": "主题歌作词",
    "作曲": "主题歌作曲",
  }
];

var getchu = {
  isGamepage: function () {
    if ($('.genretab.current').length && $('.genretab.current'))
    return true;
  },
  getSubjectInfo: function () {
    var info = {
    };
    info.subjectName = $('#soft-title').text().split('\n') [1].replace(/\s.*?版.*|新.*/, '');
    var $infoTable = $('#soft_table table').eq(0).find('tr');
    $infoTable.each(function (index, element) {
      var alist;
      if (index === 0) {
        alist = element.textContent.split('\n')[0].split('：');
      }
      if (index === 2) {
        alist = element.textContent.replace(/\s*/g, '').split('：');
      }
      if (!alist) {
        alist = element.textContent.split('：');
      }
      if (index > 8 && alist[0].match(/作詞\/作曲/)) {
        var templist1 = alist[0].split('/');
        var templist2 = alist[1].split('／');
        info[templist1[0]] = templist2[0];
        info[templist1[1]] = templist2[1];
      }
      if (!adict[0].hasOwnProperty(alist[0]) && !adict[1].hasOwnProperty(alist[0])) {
        return;
      }
      if (alist.length) {
        info[alist[0]] = alist[1];
      }
    });
    $('div.tabletitle:lt(2)').each(function (index, element) {
      if (index === 0 && element.textContent.match(/商品紹介/)) {
        info.subjectStory = $(this).next().text().replace(/^\s*[\r\n]/gm, '');
      }
      if (element.textContent.match(/ストーリー/)) {
        info.subjectStory = $(this).next().text().replace(/^\s*[\r\n]/gm, '');
      }
    });
    var cvlist = [];
    $('.chara-name').each(function(index, element) {
      if (element.textContent.match("CV")) {
        cvlist.push(element.textContent.replace(/.*CV：|新建角色/g, ''));
      }
    });
    info.cv = cvlist.join(',');
    var astr = JSON.stringify(info);
    chrome.storage.local.set({
      'subjectData': astr
    });
    return info;
  },
  addNode: function () {
    $('#soft-title').append($('<a>').attr({
      class: 'new-subject',
      target: '_blank',
      href: 'http://bangumi.tv/new_subject/4',
    }).text('新建条目'));
    $('#soft-title').append($('<a>').attr({
      class: 'search-subject',
      target: '_blank',
      href: 'https://cse.google.com/cse/home?cx=008561732579436191137:pumvqkbpt6w',
    }).text('搜索条目'));
    $('h2.chara-name').append($('<a>').attr({
      class: 'new-character',
      target: '_blank',
      href: 'http://bangumi.tv/character/new',
    }).text('新建角色'));
  },
  registerEvent: function() {
    $('.new-character').click(function(event) {
      // first click is to storage information
      event.preventDefault();
      var charaData = {};
      var name = $(this).prev().text();
      charaData.characterName = name.replace(/\s/,'');
      charaData['日文名'] = name;
      var $p = $(this).parent().parent().parent();
      var intro = $p.next('dd');
      charaData.characterIntro = intro.text();
      var node = intro.children().eq(0);
      // remove flag g to improve ability
      var templist = node.text().match(/1.*cm|B.*W.*H\d\d|\d{1,2}月\d{1,2}日|\w型/);
      if (templist) {
        templist = node.text().match(/1.*cm|B.*W.*H\d\d|\d{1,2}月\d{1,2}日|\w型/g);
        charaData['身高'] = templist[0];
        charaData.BWH = templist[1];
        charaData['生日'] = templist[2];
        charaData['血型'] = templist[3];
//        charaData.characterIntro = introtext.replace(/.*\n/,'');
      }
      // get hiragana name, cv
      var charatext = $p.text();
      if (charatext.match(/（(.*)）/))
        charaData.hiraganaName = charatext.match(/（(.*)）/)[1];
      if (charatext.match("CV")) {
        charaData.cv = charatext.replace(/.*CV：|新建角色/g, '');
      }
      chrome.storage.local.set({charaData: JSON.stringify(charaData)}, function() {
        console.log(JSON.stringify(charaData));
        alert('角色信息已存储,请再次点击');
      });
      $(this).unbind('click');
      // bind second click's event
      $(this).click(function() {
//        alert($(this).text());
      });
    });
  }
};

if (getchu.isGamepage()) {
  getchu.addNode();
  getchu.registerEvent();
  getchu.getSubjectInfo();
}
//chrome.storage.local.get("subjectData", function(val) {
//  alert(val.subjectData);
//});
