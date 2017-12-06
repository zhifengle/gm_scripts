export default class SubjectConfigModel {
  constructor(obj) {
    this.name = obj.name;
    this.entrySelector = obj.entrySelector;
    this.targetURL = obj.targetURL;
    this.itemList = []
    this.type = 'config'
  }
}
