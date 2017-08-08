function filterResults(items, searchString, opts) {
  let results = new Fuse(items, opts).search(searchString)
  if (!results.length) return
  if (opts.startDate) {
    for (const result of results) {
      if (result.startDate &&
        new Date(result.startDate) - new Date(opts.startDate) === 0) {
        return result
      }
    }
  } else {
    return results[0]
  }
}

module.exports = filterResults;