import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TextInput, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCourses, takeAttendance } from '../api/client';
import showMessage from '../utils/toast';


export default function CoursesScreen({ navigation, route }) {
  const navToken = route.params?.token;
  const [token, setToken] = useState(navToken);
  const [courses, setCourses] = useState([]);
  const [attendanceToken, setAttendanceToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        let t = token;
        if (!t) {
          t = await AsyncStorage.getItem('authToken');
          setToken(t);
        }
        const resp = await fetchCourses(t);
        setCourses(resp.data);
      } catch (err) {
        console.error(err);
        showMessage('Could not fetch courses');
      }
    };
    load();
  }, [token]);

  // Handle scanned token returned from Scan screen
  useEffect(() => {
    if (route?.params?.scannedToken) {
      setAttendanceToken(route.params.scannedToken);
    }
  }, [route?.params?.scannedToken]);

  const onTake = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const resp = await takeAttendance(token, attendanceToken);
      showMessage(resp.data.message || 'Attendance recorded');
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 429) {
        return showMessage('Too many attendance attempts. Please wait a moment and try again.');
      }
      showMessage('Could not take attendance');
    } finally {
      // Prevent immediate repeats: re-enable after short cooldown
      setTimeout(() => setIsSubmitting(false), 10000);
    }
  };

  const onLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Courses</Text>
      <FlatList data={courses} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => (
        <View style={styles.courseItem}>
          <Text style={styles.courseText}>{item.name} ({item.course_code})</Text>
        </View>
      )} />

      <TextInput placeholder="Attendance token" style={styles.input} value={attendanceToken} onChangeText={setAttendanceToken} />
      <Button title={isSubmitting ? 'Please wait...' : 'Submit Token'} onPress={onTake} disabled={isSubmitting} />
      <View style={{height:12}} />
      <Button title={isSubmitting ? 'Please wait...' : 'Scan QR'} onPress={() => navigation.navigate('Scan')} disabled={isSubmitting} />
      <View style={{height:12}} />
      <Button title={isSubmitting ? 'Please wait...' : 'Give Feedback'} onPress={() => navigation.navigate('Feedback', { token })} />
      <View style={{height:12}} />
      <Button title="Lecturer Actions" onPress={() => navigation.navigate('Staff')} />
      <View style={{height:12}} />
      <Button title="Logout" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, marginBottom: 12 },
  courseItem: { padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  courseText: { fontSize: 16 },
  input: { borderWidth: 1, padding: 8, marginTop: 16, borderRadius: 4 },
});
