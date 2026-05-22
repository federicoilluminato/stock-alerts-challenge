import { StyleSheet, Text } from 'react-native';
import { ScreenContainer } from './ScreenContainer';

export const StocksScreen = () => {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Stocks</Text>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
});

