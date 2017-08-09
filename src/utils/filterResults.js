function filterresults(items, searchstring, opts) {
  let results = new Fuse(items, opts).search(searchstring);
  if (!results.length) return;
  if (opts.startdate) {
    for (const result of results) {
      if (result.startdate &&
        new date(result.startdate) - new date(opts.startdate) === 0) {
        return result;
      }
    }
  } else {
    return results[0];
  }
}

module.exports = filterresults;
