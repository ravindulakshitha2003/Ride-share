import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'
import { useRouter } from "expo-router";

const index = () => {

  const router = useRouter();

  return (
    <View style={{flex : 1 , alignItems : 'center', justifyContent: 'center'}}>

      <Text>index</Text>
      <Link href={'/login'} > login  </Link>
      <Link href={'/publish-ride'} > publish-ride </Link>
      
      <Link href={'/register'} > register  </Link>
      <Link href={'/profile'} > profile  </Link>
      <Link href={'/Vehicle'} > vehical more details  </Link>
     <Link href={'/notifications'} > notifications  </Link>
     </View>
  )
}

export default index

const styles = StyleSheet.create({
  
})