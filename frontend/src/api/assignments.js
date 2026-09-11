import client from './client'

export const getAssignmentsByCourse = (courseId) => client.get(`/courses/${courseId}/assignments`)
export const getAssignmentsByCategory = (categoryId) => client.get(`/categories/${categoryId}/assignments`)
export const createAssignment = (data) => client.post('/assignments', data)
export const updateAssignment = (id, data) => client.put(`/assignments/${id}`, data)
export const deleteAssignment = (id) => client.delete(`/assignments/${id}`)
