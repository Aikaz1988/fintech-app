import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { CheckCircle2, PauseCircle, PlayCircle, RotateCcw, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useI18n } from '@/i18n';
import type { Subscription, SubscriptionAction } from '@/types';

const statusChipColor = (status: Subscription['status']) => {
  if (status === 'active') return 'success';
  if (status === 'paused') return 'warning';
  return 'default';
};

const insightSeverity = (severity: 'low' | 'medium' | 'high'): 'info' | 'warning' | 'error' => {
  if (severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  return 'info';
};

const Subscriptions: React.FC = () => {
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { user } = useAuth();
  const { t, language } = useI18n();
  const {
    subscriptions,
    insights,
    summary,
    loading,
    error,
    actionLoadingId,
    runAction,
    refresh,
  } = useSubscriptions();

  const locale = language === 'en' ? 'en-US' : 'ru-RU';

  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  const date = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const usageLabels: Record<Subscription['usage_state'], string> = {
    active: t('pages.subscriptions.usageState.active'),
    rarely_used: t('pages.subscriptions.usageState.rarelyUsed'),
    unused: t('pages.subscriptions.usageState.unused'),
  };

  const statusLabels: Record<Subscription['status'], string> = {
    active: t('pages.subscriptions.status.active'),
    paused: t('pages.subscriptions.status.paused'),
    cancelled: t('pages.subscriptions.status.cancelled'),
  };

  const categoryLabels: Record<Subscription['category'], string> = {
    video: t('pages.subscriptions.categories.video'),
    music: t('pages.subscriptions.categories.music'),
    education: t('pages.subscriptions.categories.education'),
    cloud: t('pages.subscriptions.categories.cloud'),
    gaming: t('pages.subscriptions.categories.gaming'),
    other: t('pages.subscriptions.categories.other'),
  };

  const run = async (subscriptionId: string, action: SubscriptionAction) => {
    await runAction(subscriptionId, action);
  };

  if (!user) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="warning">{t('pages.subscriptions.authRequired')}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, display: 'grid', gap: { xs: isCompactMobile ? 1.5 : 2.5, sm: 2.5 } }} data-cmp="Subscriptions">
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 }, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>
            {t('pages.subscriptions.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>
            {t('pages.subscriptions.subtitle')}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => void refresh()} startIcon={<RotateCcw size={16} />} sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 36 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 2 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '0.9rem' } }}>
          {t('pages.subscriptions.refresh')}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2 } }}>
          <Typography variant="body2" color="text.secondary">{t('pages.subscriptions.summary.activeCount')}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.35rem', sm: '1.5rem' } }}>{summary.active_count}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2 } }}>
          <Typography variant="body2" color="text.secondary">{t('pages.subscriptions.summary.monthlyPayments')}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.35rem', sm: '1.5rem' } }}>{money.format(summary.monthly_total)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2 } }}>
          <Typography variant="body2" color="text.secondary">{t('pages.subscriptions.summary.annualProjection')}</Typography>
          <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.35rem', sm: '1.5rem' } }}>{money.format(summary.projected_annual_spend)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 2 }, bgcolor: 'rgba(46, 125, 50, 0.08)' }}>
          <Typography variant="body2" color="text.secondary">{t('pages.subscriptions.summary.monthlySavings')}</Typography>
          <Typography variant="h5" fontWeight={700} color="success.main" sx={{ fontSize: { xs: isCompactMobile ? '1.15rem' : '1.35rem', sm: '1.5rem' } }}>
            {money.format(summary.potential_monthly_savings)}
          </Typography>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 1.5, sm: 2 } }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>
          {t('pages.subscriptions.recommendationSectionTitle')}
        </Typography>
        {!insights.length ? (
          <Alert severity="success">{t('pages.subscriptions.recommendationEmpty')}</Alert>
        ) : (
          <Stack spacing={1.25}>
            {insights.map((insight) => (
              <Alert key={insight.id} severity={insightSeverity(insight.severity)}>
                <Typography fontWeight={600}>{insight.title}</Typography>
                <Typography variant="body2">{insight.description}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {t('pages.subscriptions.potentialSavingsPrefix')} {money.format(insight.potential_monthly_savings)} {t('pages.subscriptions.potentialSavingsSuffix')}
                </Typography>
              </Alert>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.25 : 1.5, sm: 2 } }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>
          {t('pages.subscriptions.subscriptionsSectionTitle')}
        </Typography>

        {loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
        ) : !subscriptions.length ? (
          <Alert severity="info">{t('pages.subscriptions.subscriptionsEmpty')}</Alert>
        ) : (
          <Stack spacing={1.5}>
            {subscriptions.map((subscription) => {
              const isActionLoading = actionLoadingId === subscription.id;

              return (
                <Paper key={subscription.id} variant="outlined" sx={{ p: { xs: isCompactMobile ? 1.1 : 1.5, sm: 1.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography fontWeight={700}>{subscription.service_name}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.75 }}>
                        <Chip label={statusLabels[subscription.status]} color={statusChipColor(subscription.status)} size="small" />
                        <Chip label={usageLabels[subscription.usage_state]} size="small" />
                        <Chip label={`${t('pages.subscriptions.categoryPrefix')} ${categoryLabels[subscription.category]}`} variant="outlined" size="small" />
                      </Stack>
                    </Box>

                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography fontWeight={700}>
                        {money.format(subscription.price)}
                        {subscription.billing_period === 'monthly'
                          ? t('pages.subscriptions.perMonth')
                          : t('pages.subscriptions.perYear')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subscription.last_used_at
                          ? `${t('pages.subscriptions.lastUsageLabel')} ${date.format(new Date(subscription.last_used_at))}`
                          : t('pages.subscriptions.noUsageMarks')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {subscription.status === 'cancelled'
                          ? t('pages.subscriptions.chargeStopped')
                          : `${t('pages.subscriptions.nextChargeLabel')} ${date.format(new Date(subscription.next_charge_date))}`}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 }, flexWrap: 'wrap', rowGap: 1 }}>
                    {subscription.status !== 'cancelled' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircle2 size={15} />}
                        onClick={() => void run(subscription.id, 'mark_used')}
                        disabled={isActionLoading}
                        sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 32 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.8rem', sm: '0.8125rem' } }}
                      >
                        {t('pages.subscriptions.actions.markUsed')}
                      </Button>
                    )}

                    {subscription.status === 'active' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PauseCircle size={15} />}
                        onClick={() => void run(subscription.id, 'pause')}
                        disabled={isActionLoading}
                        sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 32 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.8rem', sm: '0.8125rem' } }}
                      >
                        {t('pages.subscriptions.actions.pause')}
                      </Button>
                    )}

                    {subscription.status === 'paused' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PlayCircle size={15} />}
                        onClick={() => void run(subscription.id, 'resume')}
                        disabled={isActionLoading}
                        sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 32 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.8rem', sm: '0.8125rem' } }}
                      >
                        {t('pages.subscriptions.actions.resume')}
                      </Button>
                    )}

                    {subscription.status !== 'cancelled' && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<XCircle size={15} />}
                        onClick={() => void run(subscription.id, 'cancel')}
                        disabled={isActionLoading}
                        sx={{ minHeight: { xs: isCompactMobile ? 24 : 30, sm: 32 }, px: { xs: isCompactMobile ? 0.75 : 1.25, sm: 1.5 }, fontSize: { xs: isCompactMobile ? '0.72rem' : '0.8rem', sm: '0.8125rem' } }}
                      >
                        {t('pages.subscriptions.actions.cancel')}
                      </Button>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default Subscriptions;