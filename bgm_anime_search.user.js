// ==UserScript==
// @name        bgm_anime_search
// @namespace   http://bangumi.tv/user/a_little
// @description bangumi anime search by dmhy
// @include     http://bangumi.tv/subject/*
// @include     http://bangumi.tv/index/*
// @include     http://bangumi.tv/music/*
// @include     http://bangumi.tv/subject_search/*
// @exclude     http://bangumi.tv/subject/*/*
// @version     0.1
// @grant       none
// ==/UserScript==

function create_link(link) {
    if (document.getElementById('navMenuNeue').children[0].children[0].className == "focus chl anime" || window.location.href.match("/index/") || window.location.href.match("/subject_search/") || window.location.href.match("/anime/")) {
        var search_icon = document.createElement("a");
        // todo src title 
        search_icon.href = link;
        search_icon.target = "_blank";
        var search_icon_img = document.createElement("img");
        search_icon_img.style.border = "none";
        search_icon_img.style.height = '12px';
        search_icon_img.style.width = "14px";
        search_icon_img.style.marginLeft = "3px";
        search_icon.appendChild(search_icon_img);
        // choose icon;
        switch (/[\/|\.](\w+)\.[org|com|se]/.exec(link)[1]) {
            case 'dmhy':
                search_icon.title = "花园搜索";
                search_icon_img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC60lEQVQ4jaXQa0+bZQDG8X5BiRlGkxlBjWy+0IY4zAZ1iMWtbMMNtboeeHocLRSQbJpMK4c10IKFlkLXgaUwdFHBUqD0+Bzu++8LyifwenO9++XKZTL930ReqsQEhP4A7w48/hMcGXBugWcbbKswkoYDzlOR5/0vED4Ek8lkMj16BdZfagw9K7NQUvH8rmGZr3J3SefrZJNAVrBZ1EEanFYbVFXBi0OVobUWMLgCX8zWeZCsE8objOUlE3uSqT3B9D6M7wge7+sUqjqHqqRU03myK7AstgBrwiC0D+P7BspzA2+mgWdb4NqE4aSOMyVwZ3T8BR1lo0EoVyewLeibF+fAjQUD8/QBQ4tNnGmJkhaYf6rzllKm3XPC8LJOaEtyP6HztnJMp7fMpz82+eQCsK7D+xNl3gtXsa/Bw1WVN/3/0Dld5vrPBl+tGdgWG1wdq9ARrPLxTIUPIif0XnzwZRquRVU6xouMpMCxpvHhZJmhpEZoz8CW0Gh3H9DmKGJdaBB5ZdAbPWEw3gIG1uHd8BHmmRKjOZ3AlsGVH8p0TZ0S2DWwZw06Hx3R/bSGNyeYeFnFviHpf9YCrkUFn8+eoWxLwjs6360KLnlLdE1XGM1KHOsa3yYFvrzAVxD48xLrXJO+iwWOHEQKoGxq+J4b3Jo3aHOd0ferhrIucKcF3iy4sk2sSxVuxVTMkWP6l1uA6wVM5g2cGYkzZWBLQJuvyOBCHX9Wcife5EqkxuVQmUvfF/lsrsrthIYl1gK6o5Lepw2siyqujOTeksFrgSNux1X8mzAwW+MN5ZDXfVWuTjRwZ1WCBbgZk+fA9Thc9pQwPzlmNCewrwrag6dYZjWCW+DOwjdpjftJDSUnmSyohPdg4OKDezn4aKZGT7TC+F+Chxs674xV6PCfcWeljn8XIrswVTAIFwTBvGAkZdC/BKa7K5LRv+FmHLqjAlcehpclPVFBTwy6Zmr0RCXDKXiQBttvYIlB75zEvgP/AdbG74wR2wccAAAAAElFTkSuQmCC";
                break;
            case "popgo":
                search_icon.title = "漫游搜索";
                search_icon_img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAW0lEQVQ4jbWSUQoAIAhDd/9L22/INpdQECTo2zSB36eAuu9zIQONyawgAnTFSSRuY1WsILIFp9rnQBVYrEBS3VmO7TuYHFJ/T19KAckySYBKivcgVV7BnKMC6gD0yblHuqQ0dgAAAABJRU5ErkJggg==";
                break;
            case "camoe":
                search_icon.title = "华盟搜索";
                search_icon_img.src = "data:image/png;base64,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";
                break;
            case "nyaa":
                search_icon.title = "nyaaSearch";
                search_icon_img.src = "data:image/png;base64,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";
                break;
            
        }
        return search_icon;
    }
}

function getText(title) {
//    return title.textContent.replace(/^\s+(.*)\s+$/, '$1');
    return title.children[0].innerHTML;
}

function getChineseTitle(title) {
    return title.children[0].title;
}

try {
    var h1 = document.getElementsByTagName("h1")[0];
    var title = getChineseTitle(h1);
    if (h1 && window.location.href.match("/subject/")) {
        h1.appendChild(create_link("http://share.dmhy.org/topics/list?keyword=" + encodeURIComponent(title)));
        h1.appendChild(create_link("http://share.popgo.org/search.php?title=" + encodeURIComponent(title)));
//        h1.appendChild(create_link("https://camoe.org/search.php?keyword=" + encodeURIComponent(title) + encodeURIComponent("&提交=搜索")));
        h1.appendChild(create_link("https://camoe.org/search.php?keyword=" + encodeURIComponent(title)));
        // todo nyaa convert name to english
        h1.appendChild(create_link("http://www.nyaa.se/?page=search&cats=1_0&filter=2&term=" + encodeURIComponent(getText(h1))));
    }
} catch (e) {
    /* handle error */
}
