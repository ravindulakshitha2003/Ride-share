import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/authContext';
const _layout = () => {
  return (
     <AuthProvider>
    <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen  name='index' screenOptions={{
        headerStyle: {
          backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        }
    }} />
    <Stack.Screen  name='(auth)'  />
     <Stack.Screen  name='(dashbord)'  />

    </Stack >
    </AuthProvider>
  )
}

export default _layout

const styles = StyleSheet.create({})