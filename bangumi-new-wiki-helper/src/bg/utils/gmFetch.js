import 'whatwg-fetch'

function gmFetchBinary(url, TIMEOUT) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      timeout: TIMEOUT || 10 * 1000,
      url: url,
      overrideMimeType: "text\/plain; charset=x-user-defined",
      onreadystatechange: function(response) {
        if (response.readyState === 4 && response.status === 200) {
          resolve(response.responseText);
        }
      },
      onerror: function(err) {
        reject(err);
      },
      ontimeout: function(err) {
        reject(err);
      }
    });
  });
}

function gmFetch(url, TIMEOUT = 10 * 1000) {
  function _fetch(fetch_promise, TIMEOUT) {
    var abort_fn = null;

    //这是一个可以被reject的promise
    var abort_promise = new Promise(function(resolve, reject) {
      abort_fn = function() {
        reject('abort promise');
      };
    });

    //这里使用Promise.race，以最快 resolve 或 reject 的结果来传入后续绑定的回调
    var abortable_promise = Promise.race([
      fetch_promise,
      abort_promise
    ]);

    setTimeout(function() {
      abort_fn();
    }, TIMEOUT);

    return abortable_promise;
  }

  return _fetch(fetch(url, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'default'
    }), TIMEOUT)
    .then(
      response => response.text(),
      err => console.log('fetch err: ', err)
    );
}

module.exports = {
  gmFetch,
  gmFetchBinary
};
