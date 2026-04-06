import React from "react";
import { View } from "react-native";

// This screen is never rendered — the tab press is intercepted in _layout.tsx
// to open the PDF in the browser instead of navigating here.
export default function QuickReferenceScreen() {
  return <View />;
}
