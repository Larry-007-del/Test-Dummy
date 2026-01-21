import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginStudent, loginStaff } from '../api/client';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState('student'); // 'student' or 'staff'

  const onLogin = async () => {
    try {
      let resp;
      if (role === 'student') {
        resp = await loginStudent(username, password, studentId);
      } else {
        resp = await loginStaff(username, password, staffId);
      }
      const token = resp.data.token;
      await AsyncStorage.setItem('authToken', token);
      navigation.replace('Courses');
    } catch (err) {
      console.error(err);
      Alert.alert('Login failed', 'Check your credentials');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{role === 'student' ? 'Student Login' : 'Staff Login'}</Text>
      <View style={{flexDirection:'row', justifyContent:'center', marginBottom:12}}>
        <TouchableOpacity onPress={() => setRole('student')} style={{marginHorizontal:10}}>
          <Text style={{fontWeight: role === 'student' ? 'bold' : 'normal'}}>Student</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setRole('staff')} style={{marginHorizontal:10}}>
          <Text style={{fontWeight: role === 'staff' ? 'bold' : 'normal'}}>Staff</Text>
        </TouchableOpacity>
      </View>
      <TextInput placeholder="Username" style={styles.input} value={username} onChangeText={setUsername} />
      <TextInput placeholder="Password" style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
      {role === 'student' ? (
        <TextInput placeholder="Student ID" style={styles.input} value={studentId} onChangeText={setStudentId} />
      ) : (
        <TextInput placeholder="Staff ID" style={styles.input} value={staffId} onChangeText={setStaffId} />
      )}
      <Button title="Login" onPress={onLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 16 },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, padding: 8, marginBottom: 12, borderRadius: 4 },
});
