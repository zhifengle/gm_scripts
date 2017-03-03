var google = {
  fillForm: function(data) {
    // need google api load, to get elements you can use getAllElements()
    // https://developers.google.com/custom-search/docs/element#cse-element
    window.onload = function() {
      var element= google.search.cse.element.getElement("standard0");
      element.execute(data.subjectName);
    };
  }
};

chrome.storage.local.get("subjectData", function(val) {
  var selfInvokeScript = document.createElement("script");
  selfInvokeScript.innerHTML = "(" + google.fillForm.toString() + ")(" + val.subjectData + ");";
  document.body.appendChild(selfInvokeScript);
});
