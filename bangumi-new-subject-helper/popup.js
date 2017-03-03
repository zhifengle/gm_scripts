$(init());

function init() {
  // show storage
  chrome.storage.local.getBytesInUse( null, function(BytesInUse) {
    $('#usage').text(BytesInUse/1000 + 'kb');
  });
  $('#clear').on('click', function() {
    chrome.storage.local.clear(function() {
      $('#usage').text('0kb');
      alert('已清空条目缓存');
    });
  });
}
