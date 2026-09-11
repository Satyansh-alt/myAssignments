import client from './client'

export const getCategories = (courseId) => client.get(`/courses/${courseId}/categories`)
export const createCategory = (courseId, data) => client.post(`/courses/${courseId}/categories`, data)
export const updateCategory = (id, data) => client.put(`/categories/${id}`, data)
export const deleteCategory = (id) => client.delete(`/categories/${id}`)
