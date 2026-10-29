import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const index = () => {
  return (
    <View style={{flex : 1 , alignItems : 'center', justifyContent: 'center'}}>
      <Text>index</Text>
      <Link href={'/login'} > login  </Link>
      
      <Link href={'/register'} > register  </Link>
      <Link href={'/profile'} > profile  </Link>
    </View>
  )
}

export default index

const styles = StyleSheet.create({})