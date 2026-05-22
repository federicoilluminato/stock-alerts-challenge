import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from './ScreenContainer';

export const AlertsScreen = () => {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Alerts</Text>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
});

