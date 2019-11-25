const datefns = require('date-fns')

const today = datefns.format(new Date(), 'yyyy-MM-dd')
console.log(datefns.isBefore(new Date('2019-11-26'), new Date(today)))
console.log(datefns.isAfter(new Date('2019-11-26'), new Date(today)))
console.log(datefns.compareAsc(new Date('2019-11-26'), new Date(today)))
