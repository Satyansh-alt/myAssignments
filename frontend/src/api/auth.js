import client from './client'

export const register = (data) => client.post('/auth/register', data)
export const login = (email, password) => {
  const form = new FormData()
  form.append('username', email)
  form.append('password', password)
  return client.post('/auth/login', form)
}
export const getMe = () => client.get('/auth/me')
export const updateMe = (data) => client.put('/auth/me', data)
