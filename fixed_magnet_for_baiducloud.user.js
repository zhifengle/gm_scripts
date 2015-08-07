// ==UserScript==
// @name        fixed_magnet_for_baiducloud
// @namespace   https://github.com/22earth
// @include     https://share.dmhy.org/topics/view/*
// @include     http://share.popgo.org/program*
// @version     0.1
// @grant       none
// ==/UserScript==

if (window.location.href.match("popgo") && document.getElementById("si_downseed")) {
    var torrent_hash = document.getElementById("si_downseed").children[0].href.split("=")[1];
    var magnet_node = document.getElementById("si_magnet").children[0];
    magnet_node.href = "magnet:?xt=urn:btih:" + torrent_hash;
}    
if (window.location.href.match("dmhy") && document.getElementById("tabs-1")) {
    var torrent_hash = document.getElementById('tabs-1').children[0].children[1].pathname.replace(/\/(.*)\/(.*)\.torrent/, "$2");
    var magnet_node = document.getElementById("a_magnet");
    magnet_node.href = "magnet:?xt=urn:btih:" + torrent_hash;
}
