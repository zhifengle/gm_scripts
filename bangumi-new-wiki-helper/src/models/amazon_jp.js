import SubjectConfigModel from './SubjectConfigModel.js'

var amazonSubjectModel = new SubjectConfigModel({
  name: 'amazon',
  descrition: '日亚图书',
  entrySelector: 'xx',
  targetURL: 'https://www.amazon.co.jp/gp/product/4040694155/'
})
amazonSubjectModel.itemList.push(
  {
    name: '名称',
    selector: '#productTitle',
    keyWord: '',
    // filter: null
  }, {
    name: 'ISBN',
    selector: '#detail_bullets_id .bucket .content',
    subSelector: 'li',
    keyWord: 'ISBN-10:'
  }, {
    name: '发售日',
    selector: '#detail_bullets_id .bucket .content',
    subSelector: 'li',
    keyWord: '発売日：'
  }, {
    name: '作者',
    selector: '.author .contributorNameID'
  }, {
    name: '出版社',
    selector: '#detail_bullets_id .bucket .content',
    subSelector: 'li',
    keyWord: '出版社'
  }, {
    name: '页数',
    selector: '#detail_bullets_id .bucket .content',
    subSelector: 'li',
    keyWord: 'コミック:'
  }
)
export default amazonSubjectModel;
