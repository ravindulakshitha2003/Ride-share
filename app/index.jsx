import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const index = () => {
  return (
    <View style={{flex : 1 , alignItems : 'center', justifyContent: 'center'}}>
      <Text>index</Text>
      <Link href={'/publish-ride'}>Preview map / publish ride</Link>
      <Link href={'/login'} > login  </Link>
      <Link href={'/publish-ride'} > publish-ride </Link>
      
      <Link href={'/register'} > register  </Link>
      <Link href={'/profile'} > profile  </Link>
      <Link href={'/Vehicle'} > vehical more details  </Link>
       <Link href={'/OsrmRouteScreen'} > vehical more details 1 </Link>
       <Link href={'/RouteSelectScreen'} > vehical more details2  </Link>
    </View>
  )
}

export default index

const styles = StyleSheet.create({})