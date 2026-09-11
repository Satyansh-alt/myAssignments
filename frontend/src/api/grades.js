import client from './client'

export const getGradesForCourse = (courseId) => client.get(`/grades/course/${courseId}`)
export const getGradeSummary = () => client.get('/grades/summary')
