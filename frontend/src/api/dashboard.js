import client from './client'

export const getDashboard = (days = 7) => client.get('/dashboard', { params: { days } })
