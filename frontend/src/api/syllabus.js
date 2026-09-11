import client from './client'

export const parseSyllabusText = (courseId, text) =>
  client.post('/syllabus/parse-text', { course_id: courseId, text })

export const parseSyllabusPdf = (courseId, file) => {
  const form = new FormData()
  form.append('course_id', courseId)
  form.append('file', file)
  return client.post('/syllabus/parse-pdf', form)
}

export const applyCategories = (courseId, categories) =>
  client.post('/syllabus/apply', { course_id: courseId, categories })

export const parseAssignmentsText = (courseId, text) =>
  client.post('/syllabus/parse-assignments-text', { course_id: courseId, text })

export const parseAssignmentsPdf = (courseId, file) => {
  const form = new FormData()
  form.append('course_id', courseId)
  form.append('file', file)
  return client.post('/syllabus/parse-assignments-pdf', form)
}

export const applyAssignments = (courseId, assignments) =>
  client.post('/syllabus/apply-assignments', { course_id: courseId, assignments })
