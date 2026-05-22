import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

export const ScreenContainer = ({ children }: PropsWithChildren) => {
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(14,16,52,1.0)',
  },
});

