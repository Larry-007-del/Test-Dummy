import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert, TextInput, StyleSheet, Image, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCourses, generateAttendanceToken } from '../api/client';
import showMessage from '../utils/toast';
import { showToast } from '../utils/toastService';
import { Share } from 'react-native';

export default function StaffScreen() {
  const [token, setToken] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [qrBase64, setQrBase64] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingQR, setIsFetchingQR] = useState(false);

  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem('authToken');
      setToken(t);
      if (t) {
        try {
          const resp = await fetchCourses(t);
          setCourses(resp.data);
        } catch (err) {
          console.error(err);
          showMessage('Could not fetch courses');
        }
      }
    };
    load();
  }, []);

  const genRandom = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const onGenerate = async () => {
    if (!selectedCourseId) return showMessage('Select a course');
    if (isGenerating) return;

    let tok = manualToken || genRandom();
    setIsGenerating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission denied', 'Location permission is required to attach coordinates');
      }
      const loc = await Location.getCurrentPositionAsync({});
      const latitude = loc.coords.latitude;
      const longitude = loc.coords.longitude;

      const resp = await generateAttendanceToken(token, selectedCourseId, tok, latitude, longitude);
      const returnedToken = resp?.data?.token || tok;

      // Show toast with Copy & Share actions
      showToast(`Token ${returnedToken} generated`, {
        actions: [
          { label: 'Copy', onPress: async () => { try { const Clip = await import('expo-clipboard'); await Clip.setStringAsync(returnedToken); showToast('Copied to clipboard'); } catch (e) { console.error(e); showToast('Copy failed'); } } },
          { label: 'Share', onPress: async () => { try { await Share.share({ message: `Attendance token: ${returnedToken}` }); } catch (e) { console.error(e); showToast('Share failed'); } } }
        ]
      });
    } catch (err) {
      console.error(err);
      const status = err?.response?.status;
      if (status === 429) {
        return showMessage('Too many token generation requests. Please wait a minute and try again.');
      }
      showMessage('Could not generate token');
    } finally {
      setTimeout(() => setIsGenerating(false), 10000);
    }
  };

  const onShowQR = async () => {
    if (!selectedCourseId) return showMessage('Select a course');
    if (isFetchingQR) return;

    setIsFetchingQR(true);
    try {
      const resp = await fetch(`${API_BASE || 'http://10.0.2.2:8000/api'}/courses/${selectedCourseId}/generate_attendance_qr/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ as: 'base64' }),
      });
      if (resp.status === 429) {
        return showMessage('Too many QR generation requests. Please wait a minute and try again.');
      }
      const json = await resp.json();
      if (json && json.qr_base64) {
        setQrBase64(json.qr_base64);
        const returnedToken = json.token;
        // Offer quick copy/share for the token
        if (returnedToken) {
          showToast('QR generated', {
            actions: [
              { label: 'Copy', onPress: async () => { try { const Clip = await import('expo-clipboard'); await Clip.setStringAsync(returnedToken); showToast('Copied to clipboard'); } catch (e) { console.error(e); showToast('Copy failed'); } } },
              { label: 'Share', onPress: async () => { try { await Share.share({ message: `Attendance token: ${returnedToken}` }); } catch (e) { console.error(e); showToast('Share failed'); } } }
            ]
          });
        }
      } else {
        showMessage('Could not fetch QR');
      }
    } catch (err) {
      console.error(err);
      showMessage('Could not fetch QR');
    } finally {
      setTimeout(() => setIsFetchingQR(false), 10000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lecturer Actions</Text>
      <FlatList data={courses} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => (
        <View style={styles.courseItem}>
          <Text style={styles.courseText}>{item.name} ({item.course_code})</Text>
          <Button title={selectedCourseId === item.id ? 'Selected' : 'Select'} onPress={() => setSelectedCourseId(item.id)} />
        </View>
      )} />

      <TextInput placeholder="Optional token (6 chars)" style={styles.input} value={manualToken} onChangeText={setManualToken} />
      <Button title={isGenerating ? 'Generating...' : 'Generate Attendance Token (with location)'} onPress={onGenerate} disabled={isGenerating} />
      <View style={{height:12}} />
      <Button title={isFetchingQR ? 'Fetching QR...' : 'Show QR'} onPress={onShowQR} disabled={isFetchingQR} />
      {qrBase64 ? (
        <ScrollView style={{marginTop:16}}>
          <Text style={{marginBottom:8}}>Generated QR</Text>
          <Image source={{uri: qrBase64}} style={{width:250, height:250, alignSelf:'center'}} />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, marginBottom: 12 },
  courseItem: { padding: 8, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseText: { fontSize: 16 },
  input: { borderWidth: 1, padding: 8, marginTop: 16, borderRadius: 4 },
});
