# UserScripts

> 自用脚本和 userChromejs

## [bangumi_collection_export_tool.user.js](scripts/bangumi_collection_export_tool.user.js?raw=true)

导出 bangumi.tv 或者 bgm.tv 用户的收藏为 csv 文件 (可以用 excel 打开）

在用户的收藏页面，新增一个“导出收藏”按钮。通过点击 “看过” “想看” ，然后点击 “导出收藏”，导出对应的数据。

支持和导出格式相同的 csv 文件的导入

## [migrate_douban_collection_to_bangumi.user.js](scripts/migrate_douban_collection_to_bangumi.user.js?raw=true)

迁移豆瓣动画的收藏到 Bangumi。
迁移 Bangumi 的数据到豆瓣， 只能同步“在看” “看过” “想看”。
一键迁移后，有一个 “导出 xx 动画的收藏同步信息” 的按钮，用来查看原来的收藏信息和导出结果。

![import data on douban movie](screenshots/douban-movie.png 'douban movie')

上图是豆瓣电影主页的。输入框输入个人的 Bangumi 主页地址。
豆瓣的电影主页地址是： https://movie.douban.com/mine

![import data on Bangumi](screenshots/bangumi-home.png 'bangumi home')

在上图的输入框，输入自己豆瓣主页的 URL。 另外还可以选择同步的类型。
然后点击 “导入豆瓣动画收藏”

已经被收藏的条目的评论、标签以及评分不会被覆盖。  
豆瓣上面非日语的电影类型，不会进行迁移同步。  
因为无法区分动画还是日剧，默认搜索类型是动画，所以日剧会同步失败

## [bangumi_anime_score_compare.user.js](scripts/bangumi_anime_score_compare.user.js?raw=true)

在 Bangumi 和 豆瓣上面显示其它网站的动画评分信息

## [qiandao.user.js](scripts/qiandao.user.js?raw=true)

自用签到脚本，目前支持 v2ex、2dj、south-plus、52pojie。

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
