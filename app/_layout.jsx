import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/authContext';
import { RouteProvider } from "../context/RouteContext";
import { VehicleProvider } from '../context/VehicleContext';
const _layout = () => {
  return (
     <AuthProvider>
      <RouteProvider>
        <VehicleProvider>
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
     <Stack.Screen  name='ride-details'  />
     <Stack.Screen  name='Rideinfoscreen'  />

    </Stack >
    </VehicleProvider>
    </RouteProvider>
    </AuthProvider>
  )
}

export default _layout

const styles = StyleSheet.create({})