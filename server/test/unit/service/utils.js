function getAllFuncs(toCheck) {
  let props = [];
  let obj = toCheck;
  do {
    props = props.concat(Object.getOwnPropertyNames(obj));
  } while (obj = Object.getPrototypeOf(obj));

  return props.filter(function(e, i, arr) {
    return typeof toCheck[e] === 'function'
      && !/^__.*__$|constructor|hasOwnProperty|isPrototypeOf|propertyIsEnumerable|toString|valueOf|toLocaleString/.test(e)
  });
}

module.exports = {
  getAllFuncs
}
