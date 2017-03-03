function convertoBase64Image(img) {

  // Create an empty canvas element
  var canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  // Copy the image contents to the canvas
  var ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // Get the data-URL formatted image
  // Firefox supports PNG and JPEG. You could check img.src to guess the
  // original format, but be aware the using "image/jpg" will re-encode the image.
  var dataURL = canvas.toDataURL("image/png");
  return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}

function createScriptTag(astr, func) {
  // astr : the data's key that had storaged;
    chrome.storage.local.get(astr, function(val) {
      var selfInvokeScript = document.createElement("script");
      // string will be take into subject
      alert(val[astr]);
      selfInvokeScript.innerHTML = "(" + func.toString() + ")(" + val[astr] + ");";
      document.body.appendChild(selfInvokeScript);
    });
}
