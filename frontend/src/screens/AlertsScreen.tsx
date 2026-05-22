import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ActivityIndicator, Alert as RNAlert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from './ScreenContainer';
import type { RootStackParamList } from '../navigation/types';
import { deleteAlert, evaluateAlerts, fetchAlerts } from '../api/alertsApi';

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

export const AlertsScreen = ({ navigation }: Props) => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error) => {
      console.log('[delete] Error:', JSON.stringify(error));
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error?.message ?? error.message
        : 'Failed to delete alert. Please try again.';
      RNAlert.alert('Error', message);
    },
  });

  const handleDelete = (id: string, symbol: string) => {
    RNAlert.alert('Delete Alert', `Remove alert for ${symbol}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const hasActiveAlerts = alerts?.some((a) => a.status === 'active');

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate('CreateAlert')}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#60a5fa" style={styles.loader} />
      ) : (
        <>
          {hasActiveAlerts && (
            <Pressable
              style={[styles.checkButton, evaluateMutation.isPending && styles.checkButtonDisabled]}
              onPress={() => evaluateMutation.mutate()}
              disabled={evaluateMutation.isPending}
            >
              {evaluateMutation.isPending ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.checkButtonText}>Check Alerts</Text>
              )}
            </Pressable>
          )}
          {alerts && alerts.length > 0 ? (
            <FlatList
              data={alerts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.alertCard}>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertSymbol}>{item.symbol}</Text>
                    <Text style={styles.alertDetail}>
                      Target: ${item.targetPrice.toFixed(2)}
                    </Text>
                    <Text style={styles.alertStatus}>
                      {item.status === 'triggered' ? 'Triggered' : item.status === 'active' ? 'Active' : item.status}
                    </Text>
                  </View>
                  <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id, item.symbol)} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending ? (
                      <ActivityIndicator color="#f87171" size="small" />
                    ) : (
                      <Text style={styles.deleteButtonText}>X</Text>
                    )}
                  </Pressable>
                </View>
              )}
              contentContainerStyle={styles.list}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No alerts yet.</Text>
              <Text style={styles.emptyHint}>Tap + to create one.</Text>
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#3b3f7a',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  alertCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(30,32,80,0.8)',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  alertInfo: {
    gap: 4,
  },
  alertSymbol: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  alertDetail: {
    color: '#94a3b8',
    fontSize: 14,
  },
  alertStatus: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: '700',
  },
  checkButton: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    marginBottom: 16,
    paddingVertical: 12,
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
  },
  emptyHint: {
    color: '#64748b',
    fontSize: 14,
  },
});
