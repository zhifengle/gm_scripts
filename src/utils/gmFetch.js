function gmFetch(url, TIMEOUT) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      timeout: TIMEOUT || 10 * 1000,
      url: url,
      onreadystatechange: function (response) {
        if (response.readyState === 4 && response.status === 200) {
          resolve(response.responseText);
        }
      },
      onerror: function (err) {
        reject(err);
      },
      ontimeout: function (err) {
        reject(err);
      }
    });
  });
}

module.exports = gmFetch;
