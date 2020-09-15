# UserScripts

> 自用脚本和 userChromejs

## [migrate_douban_collection_to_bangumi.js](scripts/migrate_douban_collection_to_bangumi.user.js?raw=true)

迁移豆瓣收藏到 Bangumi

## DEPRECATED

### [bt_search_for_bgm.user.js](scripts/bt_search_for_bgm.user.js?raw=true)

#### bangumi 辅助搜索

为 bangumi 界面添加 bt 搜索图标
方便在查阅条目的时候，搜索资源
默认开启三个搜索引擎： [dmhy](https://share.dmhy.org/ 'dmhy') [Download Search](http://search.jayxon.com/ 'google') [cilizhushou](http://www.cilizhushou.com/ 'cilizhushou')
可以根据需要添加搜索引擎
或者注释 searchEngineLists 里相关项

### [bilidan.uc.js](scripts/bilidan.uc.js?raw=true)

Linux 下向火狐添加右键菜单，调用[bilidan.py](https://github.com/m13253/BiliDan) 和[MPV](https://github.com/mpv-player/mpv)播放 bilibili.com 视频

### [fixed_magnet_for_baiducloud.user.js](scripts/fixed_magnet_for_baiducloud.user.js?raw=true)

修改 dmhy（花园），popgo（漫游）磁力链接以便于百度云离线，对于百度云服务器没有的资源不能使用该方法离线。

点击 Magnet 链接后面的文字：“百度云”，可以自动辅助点击离线下载。

### [bangumi_new_subject_helper.user.js](scripts/bangumi_new_subject_helper.user.js?raw=true)

本脚本不再维护推荐使用我写的 [Bangumi 条目创建助手](https://github.com/22earth/bangumi-new-wiki-helper)

浏览 getchu 和批评空间时，辅助创建游戏条目，减少复制粘贴的操作。
关键游戏条目时创建一个表格，点击表格可以辅助搜索。
为 bangumi 右上角增加 google 和 baidu 站内搜的功能。

### [nyaa_magnet_modify.user.js](scripts/nyaa_magnet_modify.user.js?raw=true)

替换 nyaa base32 编码磁力链接为 base16
