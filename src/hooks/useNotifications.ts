import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification, NotificationPreferences, Recommendation } from '@/types';
import { supabase } from '@/lib/supabase';
import * as analyticsService from '@/services/analytics.service';
import toast from 'react-hot-toast';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  recommendations: Recommendation[];
  preferences: NotificationPreferences | null;
  loading: boolean;
  loadNotifications: () => Promise<void>;
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<void>;
  pauseNotifications: (minutes: number) => Promise<void>;
  resumeNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

interface UseNotificationsOptions {
  silent?: boolean;
  preferencesOnly?: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  warning_threshold_percent: 80,
  alert_threshold_percent: 100,
  cadence_minutes: 60,
  push_enabled: true,
  sound_enabled: false,
  vibration_enabled: false,
  calendar_enabled: true,
  notifications_paused_until: null,
};

const isPaused = (preferences: NotificationPreferences | null): boolean => {
  if (!preferences?.notifications_paused_until) return false;
  return new Date(preferences.notifications_paused_until).getTime() > Date.now();
};

export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsReturn => {
  const { silent = false, preferencesOnly = false } = options;
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const shownToastIds = useState(() => new Set<string>())[0];
  const reloadTimerRef = useState<{ id: ReturnType<typeof setTimeout> | null }>({ id: null })[0];

  const emitSound = () => {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.03;

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
    } catch (error) {
      console.warn('Не удалось воспроизвести звук уведомления', error);
    }
  };

  const emitBrowserPush = (notification: Notification) => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    const title = notification.type === 'alert' ? 'Критическое превышение бюджета' : 'Предупреждение по бюджету';
    const body = notification.message;

    try {
      // Browser push-like notification (within opened app context).
      new Notification(title, { body });
    } catch (error) {
      console.warn('Не удалось показать браузерное уведомление', error);
    }
  };

  const emitSignals = (notification: Notification, prefs: NotificationPreferences | null) => {
    if (isPaused(prefs)) return;

    if (notification.type === 'alert') {
      toast.error(notification.message, {
        duration: 6000,
        id: notification.id,
      });
    } else {
      toast(notification.message, {
        duration: 5000,
        id: notification.id,
        icon: '⚡',
      });
    }

    if (prefs?.push_enabled) {
      emitBrowserPush(notification);
    }

    if (prefs?.sound_enabled) {
      emitSound();
    }

    if (prefs?.vibration_enabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(notification.type === 'alert' ? [150, 60, 150] : [100]);
    }
  };

  const loadPreferences = useCallback(async (): Promise<NotificationPreferences | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Ошибка загрузки настроек уведомлений:', error);
      return null;
    }

    if (data) {
      setPreferences(data as NotificationPreferences);
      return data as NotificationPreferences;
    }

    const initial = {
      user_id: user.id,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('notification_preferences')
      .upsert(initial, { onConflict: 'user_id' })
      .select('*')
      .maybeSingle();

    if (insertError) {
      console.error('Ошибка инициализации настроек уведомлений:', insertError);
      return null;
    }

    const typedInserted = (inserted as NotificationPreferences) || null;
    setPreferences(typedInserted);
    return typedInserted;
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    if (preferencesOnly) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const prefs = preferences || (await loadPreferences());

      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*, budget:budgets(id, category_id, limit_amount, month, category:categories(id, name, color, icon, type))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (notifError) throw notifError;

      setNotifications(notifData || []);
      setUnreadCount(notifData?.filter((n) => !n.is_read).length || 0);

      const recs = await analyticsService.getRecommendations(user.id);
      setRecommendations(recs);

      const unreadNotifs = notifData?.filter((n) => !n.is_read) || [];
      unreadNotifs.forEach((notification) => {
        if (shownToastIds.has(notification.id)) return;
        if (!silent) {
          emitSignals(notification as Notification, prefs);
        }
        shownToastIds.add(notification.id);
      });
    } catch (error) {
      console.error('Ошибка при загрузке уведомлений:', error);
    } finally {
      setLoadedOnce(true);
      setLoading(false);
    }
  }, [user, preferences, loadPreferences, shownToastIds, silent, preferencesOnly]);

  const updatePreferences = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      if (!user) return;

      try {
        const payload = {
          user_id: user.id,
          ...(preferences || DEFAULT_NOTIFICATION_PREFERENCES),
          ...patch,
        };

        const { data, error } = await supabase
          .from('notification_preferences')
          .upsert(payload, { onConflict: 'user_id' })
          .select('*')
          .single();

        if (error) throw error;

        setPreferences(data as NotificationPreferences);
      } catch (error) {
        console.error('Ошибка обновления настроек уведомлений:', error);
      }
    },
    [user, preferences]
  );

  const pauseNotifications = useCallback(
    async (minutes: number) => {
      const pauseUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      await updatePreferences({ notifications_paused_until: pauseUntil });
    },
    [updatePreferences]
  );

  const resumeNotifications = useCallback(async () => {
    await updatePreferences({ notifications_paused_until: null });
  }, [updatePreferences]);

  const markAsRead = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Ошибка при отметке уведомления:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Ошибка при отметке всех уведомлений:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Ошибка при удалении уведомления:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    const scheduleReload = () => {
      if (reloadTimerRef.id) {
        clearTimeout(reloadTimerRef.id);
      }
      reloadTimerRef.id = setTimeout(() => {
        void loadNotifications();
      }, 250);
    };

    const channel = preferencesOnly
      ? null
      : supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              scheduleReload();
            }
          )
          .subscribe();

    const prefsChannel = supabase
      .channel('notification_preferences')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_preferences',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadPreferences();
        }
      )
      .subscribe();

    return () => {
      if (reloadTimerRef.id) {
        clearTimeout(reloadTimerRef.id);
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
      void supabase.removeChannel(prefsChannel);
    };
  }, [user, loadNotifications, loadPreferences, reloadTimerRef, preferencesOnly]);

  useEffect(() => {
    if (!loadedOnce) return;
    if (!preferences?.push_enabled) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;

    void Notification.requestPermission();
  }, [preferences?.push_enabled, loadedOnce]);

  useEffect(() => {
    void loadPreferences();
    if (!preferencesOnly) {
      void loadNotifications();
    } else {
      setLoading(false);
    }
  }, [user, preferencesOnly]);

  return {
    notifications,
    unreadCount,
    recommendations,
    preferences,
    loading,
    loadNotifications,
    updatePreferences,
    pauseNotifications,
    resumeNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};