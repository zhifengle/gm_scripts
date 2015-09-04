SEARCH.init();
var re = new RegExp(['getchu', 'new_subject','add_related', 'character\/new'].join('|'));
var page = document.location.href.match(re);

if (page) {
  switch (page[0]) {
    case 'new_subject':
      bangumi.newSubject();
    break;
    case 'add_related':
      bangumi.addRelated();
      break;
    case 'character\/new':
      bangumi.newCharacter();
//      createScriptTag('charaData', bangumi.fillFormCharacter.call(bangumi));
      break;
  }

}

