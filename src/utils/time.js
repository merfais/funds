const moment = require('moment')

function addLeftZero(d) {
  if (d < 10) return '0' + d
  return d
}


function calc(type, date, count, unit) {
  let [year, month, day] = date.split('-')
  year = Number(year)
  month = Number(month)
  day = Number(day)
  const a = type === 'add' ? count : (-1 * count)
  if (unit === 'M') {
    month = month + a
  } else if (unit === 'd') {
    day = day + a
  }
  if (day > 31) {
    month += 1
    day = 1
  } else if (day < 1) {
    month -= 1
    day = 31
  }
  if (month > 12) {
    year += 1
    month = 1
  } else if (month < 1) {
    year -= 1
    month = 12
  }
  return `${year}-${addLeftZero(month)}-${addLeftZero(day)}`
}

function add(date, count, unit) {
  return calc('add', date, count, unit)
}

function subtract(date, count, unit) {
  return calc('subtract', data, count, unit)
}

function isBefore(left, right) {
  return Number(left.replace(/-/g, '')) < Number(right.replace(/-/g, ''))
}

function isSameOrBefore(left, right) {
  return Number(left.replace(/-/g, '')) <= Number(right.replace(/-/g, ''))
}

function isAfter(left, right) {
  return Number(left.replace(/-/g, '')) > Number(right.replace(/-/g, ''))
}

function isSameOrAfter(left, right) {
  return Number(left.replace(/-/g, '')) >= Number(right.replace(/-/g, ''))
}

function findValidForward(date) {
  while(!moment(date).isValid) {
    date = add(date, 1, 'd')
  }
  return date
}

module.exports = {
  addLeftZero,
  add,
  subtract,
  isBefore,
  isSameOrBefore,
  isAfter,
  isSameOrAfter,
  findValidForward,
}
