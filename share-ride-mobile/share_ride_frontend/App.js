
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PublishRideScreen from "./src/screens/PublishRideScreen";
import MapPickerScreen from "./src/screens/MapPickerScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="PublishRide">
        <Stack.Screen
          name="PublishRide"
          component={PublishRideScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MapPicker"
          component={MapPickerScreen}
          options={{
            title: "Choose Location",
            headerTintColor: "#5B4BDB",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
