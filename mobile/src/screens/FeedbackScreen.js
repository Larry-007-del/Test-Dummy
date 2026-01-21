import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postFeedback } from '../api/client';
import showMessage from '../utils/toast';

const RatingButton = ({ value, selected, onPress }) => (
  <TouchableOpacity onPress={() => onPress(value)} style={[styles.ratingBtn, selected && styles.ratingBtnSelected]}>
    <Text style={{ fontSize: 18 }}>{value}</Text>
  </TouchableOpacity>
);

export default function FeedbackScreen({ navigation, route }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Prefer token from navigation params, otherwise AsyncStorage
      let token = route.params?.token;
      if (!token) token = await AsyncStorage.getItem('authToken');
      await postFeedback(rating, comment, token);
      showMessage('Thanks for your feedback!');
      setComment('');
      navigation.goBack();
    } catch (err) {
      console.error(err);
      showMessage('Could not submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Send Feedback</Text>
      <Text style={{marginBottom:8}}>How satisfied are you?</Text>
      <View style={styles.row}>
        {[1,2,3,4,5].map(v => (
          <RatingButton key={v} value={v} selected={v === rating} onPress={setRating} />
        ))}
      </View>

      <TextInput
        placeholder="Optional comment"
        value={comment}
        onChangeText={setComment}
        style={styles.input}
        multiline
        numberOfLines={4}
      />

      <Button title={isSubmitting ? 'Sending...' : 'Send'} onPress={submit} disabled={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
  ratingBtn: { padding: 12, marginRight: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  ratingBtnSelected: { backgroundColor: '#007aff', color: '#fff' },
  input: { borderWidth: 1, padding: 8, borderRadius: 4, minHeight: 80, textAlignVertical: 'top' }
});