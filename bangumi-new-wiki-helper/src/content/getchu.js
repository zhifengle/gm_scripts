import SubjectConfigModel from './SubjectConfigModel.js'
import ItemConfigModel from './ItemConfigModel.js'

var getchuSubjectModel = new SubjectConfigModel({
  name: 'getchu',
  entrySelector: 'xx',
  targetURL: 'xx'
})
getchuSubjectModel.itemList.push(
  {
    name: '名称',
    selector: '#soft-title',
    keyWord: ''
  },
  {
    name: '开发',
    selector: '',
    keyWord: 'ブランド'
  },
  {
    name: '音乐',
    selector: '',
    keyWord: '音楽'
  },
  {
    name: '剧本',
    selector: '',
    keyWord: 'シナリオ'
  },
  {
    name: '主题歌演出',
    selector: '',
    keyWord: 'アーティスト'
  },
  {
    name: '主题歌作词',
    selector: '',
    keyWord: '作詞'
  },
  {
    name: '主题歌作曲',
    selector: '',
    keyWord: '作曲'
  }
)