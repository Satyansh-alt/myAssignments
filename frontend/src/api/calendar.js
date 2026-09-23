import client from './client'

export const getMonthView = (year, month) => client.get('/calendar', { params: { year, month } })
