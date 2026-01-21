import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { registerToastHandler, unregisterToastHandler } from '../utils/toastService';

const { width } = Dimensions.get('window');

export default function ToastHost() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  const [actions, setActions] = useState([]);

  useEffect(() => {
    function handler(msg, options = {}) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setMessage(msg);
      setActions(options.actions || []);
      setVisible(true);
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      const ttl = options.duration || 3000;
      timeoutRef.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setVisible(false);
          setMessage('');
          setActions([]);
        });
      }, ttl);
    }

    registerToastHandler(handler);
    return () => {
      unregisterToastHandler();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [anim]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}
    >
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((a, idx) => (
              <TouchableOpacity key={idx} onPress={() => { try { a.onPress && a.onPress(); } catch (e) { console.error(e); } }} style={styles.actionButton}>
                <Text style={styles.actionText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    maxWidth: width - 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 8,
  },
  text: {
    color: 'white',
  },
  actions: { flexDirection: 'row', marginTop: 8, justifyContent: 'center' },
  actionButton: { marginHorizontal: 6, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6 },
  actionText: { color: '#fff', fontWeight: '600' },
});
