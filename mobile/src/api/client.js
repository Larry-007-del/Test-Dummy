import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://10.0.2.2:8000/api'; // 10.0.2.2 is Android emulator host
export { API_BASE };

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const loginStudent = (username, password, student_id) =>
  api.post('login/student/', { username, password, student_id });

export const loginStaff = (username, password, staff_id) =>
  api.post('login/staff/', { username, password, staff_id });

export const fetchCourses = (token) =>
  api.get('courses/', { headers: { Authorization: `Token ${token}` } });

export const takeAttendance = (token, attendanceToken) =>
  api.post('courses/take_attendance/', { token: attendanceToken }, { headers: { Authorization: `Token ${token}` } });

export const generateAttendanceToken = (token, courseId, tokenValue, latitude, longitude) =>
  api.post(`courses/${courseId}/generate_attendance_token/`, { token: tokenValue, latitude, longitude }, { headers: { Authorization: `Token ${token}` } });

export const postFeedback = (rating, comment, token) => {
  const opts = {};
  if (token) opts.headers = { Authorization: `Token ${token}` };
  return api.post('feedback/', { rating, comment }, opts);
};

export default api;
