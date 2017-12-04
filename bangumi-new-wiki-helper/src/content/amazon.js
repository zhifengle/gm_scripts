import SubjectConfigModel from './SubjectConfigModel.js'

var amazonSubjectModel = new SubjectConfigModel({
  name: 'amazon',
  entrySelector: 'xx',
  targetURL: 'https://www.amazon.co.jp/gp/product/4040694155/'
})
amazonSubjectModel.itemList.push(
  {
    name: '名称',
    selector: '#productTitle',
    keyWord: '',
    // filter: null
  },
  {

  }
)