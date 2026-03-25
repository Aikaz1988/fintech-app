import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Switch, FormControlLabel, Select, MenuItem, Button, Alert, TextField, Stack } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Globe, Building, ShieldCheck, Bell } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useNotifications } from '@/hooks/useNotifications';

const Settings: React.FC = () => {
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { language, setLanguage, t } = useI18n();
  const { preferences, updatePreferences, pauseNotifications, resumeNotifications } = useNotifications({
    silent: true,
    preferencesOnly: true,
  });

  const notificationsPaused = Boolean(
    preferences?.notifications_paused_until &&
      new Date(preferences.notifications_paused_until).getTime() > Date.now()
  );

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="Settings">
      <Box sx={{ mb: { xs: isCompactMobile ? 2 : 4, sm: 4 } }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>{t('pages.settings.title')}</Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>{t('pages.settings.subtitle')}</Typography>
      </Box>

      {/* Regional Settings */}
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: { xs: isCompactMobile ? 1.5 : 2.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isCompactMobile ? 1 : 2, sm: 2 }, mb: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
            <Globe color="rgb(33, 150, 243)" />
            <Typography variant="h6" sx={{ fontSize: { xs: isCompactMobile ? '1.30rem' : '1.5rem', sm: '1.25rem' } }}>{t('pages.settings.regionalTitle')}</Typography>
          </Box>
          <Divider sx={{ mb: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }} />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 0.8 : 1.2, sm: 2 } }}>
              <Box>
                <Typography fontWeight="500" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>{t('pages.settings.languageTitle')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.875rem' } }}>{t('pages.settings.languageSubtitle')}</Typography>
              </Box>
              <Select
                value={language}
                size="small"
                sx={{ width: { xs: '100%', sm: 200 }, '& .MuiSelect-select': { fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '0.95rem' } } }}
                onChange={(e) => setLanguage(e.target.value as 'ru' | 'en')}
              >
                <MenuItem value="ru">{t('pages.settings.languageRu')}</MenuItem>
                <MenuItem value="en">{t('pages.settings.languageEn')}</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 0.8 : 1.2, sm: 2 } }}>
              <Box>
                <Typography fontWeight="500" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>{t('pages.settings.taxTitle')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.875rem' } }}>{t('pages.settings.taxSubtitle')}</Typography>
              </Box>
              <Select value="npd" size="small" sx={{ width: { xs: '100%', sm: 200 }, '& .MuiSelect-select': { fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '0.95rem' } } }}>
                <MenuItem value="npd">Россия - НПД (Самозанятый)</MenuItem>
                <MenuItem value="ip">Россия - ИП (УСН 6%)</MenuItem>
                <MenuItem value="kz">Казахстан - ТОО (Упр)</MenuItem>
              </Select>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Bank Integrations */}
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isCompactMobile ? 1 : 2, sm: 2 }, mb: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
            <Building color="rgb(33, 150, 243)" />
            <Typography variant="h6" sx={{ fontSize: { xs: isCompactMobile ? '1.30rem' : '1.5rem', sm: '1.25rem' } }}>{t('pages.settings.bankTitle')}</Typography>
          </Box>
          <Divider sx={{ mb: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }} />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
            <FormControlLabel 
              control={<Switch defaultChecked color="primary" />} 
              label={
                <Box>
                  <Typography fontWeight="500" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>{t('pages.settings.bankTinkoffTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.875rem' } }}>{t('pages.settings.bankTinkoffSubtitle')}</Typography>
                </Box>
              } 
              sx={{ alignItems: 'flex-start', ml: 0, mr: 0 }}
            />
            <FormControlLabel 
              control={<Switch defaultChecked={false} color="primary" />} 
              label={
                <Box>
                  <Typography fontWeight="500" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>{t('pages.settings.bankBinanceTitle')}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.875rem' } }}>{t('pages.settings.bankBinanceSubtitle')}</Typography>
                </Box>
              } 
              sx={{ alignItems: 'flex-start', ml: 0, mr: 0 }}
            />
            <Button variant="outlined" sx={{ mt: { xs: isCompactMobile ? 1 : 2, sm: 2 }, alignSelf: 'flex-start', height: { xs: isCompactMobile ? 24 : 30, sm: 40 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 40 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.9rem' } }} startIcon={<ShieldCheck size={18} />}>
              {t('pages.settings.connectNewBank')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Notifications Settings */}
      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mt: { xs: isCompactMobile ? 1.5 : 2.5, sm: 4 } }}>
        <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isCompactMobile ? 1 : 2, sm: 2 }, mb: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
            <Bell color="rgb(33, 150, 243)" />
            <Typography variant="h6" sx={{ fontSize: { xs: isCompactMobile ? '1.30rem' : '1.5rem', sm: '1.25rem' } }}>Уведомления о лимитах</Typography>
          </Box>
          <Divider sx={{ mb: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }} />

          <Alert severity={notificationsPaused ? 'warning' : 'info'} sx={{ mb: { xs: isCompactMobile ? 1 : 1.5, sm: 2 } }}>
            {notificationsPaused
              ? `Уведомления временно приостановлены до ${new Date(preferences?.notifications_paused_until || '').toLocaleString('ru-RU')}`
              : 'Здесь настраиваются пороги превышения, периодичность и каналы оповещений.'}
          </Alert>

          <Stack direction="row" spacing={1} sx={{ mb: { xs: isCompactMobile ? 1 : 1.5, sm: 2 }, flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" onClick={() => void pauseNotifications(60)} sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 34 } }}>
              Пауза 1ч
            </Button>
            <Button size="small" variant="outlined" onClick={() => void pauseNotifications(24 * 60)} sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 34 } }}>
              Пауза 24ч
            </Button>
            <Button size="small" variant="text" onClick={() => void resumeNotifications()} sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 34 } }}>
              Возобновить
            </Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: isCompactMobile ? 0.8 : 1, sm: 1.25 } }}>
            <TextField
              size="small"
              type="number"
              label="Порог предупреждения (%)"
              value={preferences?.warning_threshold_percent ?? 80}
              onChange={(e) =>
                void updatePreferences({ warning_threshold_percent: Math.max(1, Math.min(99, Number(e.target.value || 80))) })
              }
            />
            <TextField
              size="small"
              type="number"
              label="Порог критический (%)"
              value={preferences?.alert_threshold_percent ?? 100}
              onChange={(e) =>
                void updatePreferences({ alert_threshold_percent: Math.max(100, Math.min(300, Number(e.target.value || 100))) })
              }
            />
            <TextField
              size="small"
              type="number"
              label="Периодичность отправки (мин)"
              value={preferences?.cadence_minutes ?? 60}
              onChange={(e) =>
                void updatePreferences({ cadence_minutes: Math.max(1, Math.min(1440, Number(e.target.value || 60))) })
              }
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, mt: { xs: isCompactMobile ? 0.8 : 1, sm: 1.25 } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(preferences?.push_enabled)}
                  onChange={(e) => void updatePreferences({ push_enabled: e.target.checked })}
                />
              }
              label="Push-уведомления"
              sx={{ ml: 0, mr: 0 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(preferences?.sound_enabled)}
                  onChange={(e) => void updatePreferences({ sound_enabled: e.target.checked })}
                />
              }
              label="Звуковой сигнал"
              sx={{ ml: 0, mr: 0 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(preferences?.vibration_enabled)}
                  onChange={(e) => void updatePreferences({ vibration_enabled: e.target.checked })}
                />
              }
              label="Вибрация"
              sx={{ ml: 0, mr: 0 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(preferences?.calendar_enabled)}
                  onChange={(e) => void updatePreferences({ calendar_enabled: e.target.checked })}
                />
              }
              label="Интеграция с календарем"
              sx={{ ml: 0, mr: 0 }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;