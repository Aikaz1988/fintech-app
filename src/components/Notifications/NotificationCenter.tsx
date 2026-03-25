import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAll, setShowAll] = useState(false);

  const open = Boolean(anchorEl);
  const visible = showAll ? notifications : notifications.slice(0, 12);

  const getCategoryName = (item: any): string => {
    return item.category_name || item.budget?.category_name || item.budget?.category?.name || 'Категория';
  };

  const buildCalendarLink = (item: any): string => {
    const category = getCategoryName(item);
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = `Проверка бюджета: ${category}`;
    const details = item.message;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&details=${encodeURIComponent(details)}&dates=${dt(start)}/${dt(end)}`;
  };

  const recommendation = (item: any): string => {
    const limit = Number(item.limit_amount || item.budget?.limit_amount || 0);
    const spent = Number(item.spent_amount || 0);

    if (limit > 0 && spent > limit) {
      return 'Снизьте траты в этой категории на 10-15% и перенесите неприоритетные покупки.';
    }

    return 'Проверьте оставшийся лимит и запланируйте будущие траты заранее.';
  };

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
        <Badge color="error" badgeContent={unreadCount} max={99}>
          <Bell size={18} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { width: 460, maxWidth: '95vw', p: 1, maxHeight: '80vh' } }}
      >
        <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Уведомления</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button size="small" onClick={() => void markAllAsRead()}>
              Прочитать все
            </Button>
            <IconButton size="small" onClick={() => setAnchorEl(null)} aria-label="close notifications">
              <X size={16} />
            </IconButton>
          </Box>
        </Box>

        {visible.length === 0 ? (
          <MenuItem disabled>Пусто</MenuItem>
        ) : (
          <List dense sx={{ py: 0, maxHeight: 420, overflowY: 'auto' }}>
            {visible.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {!item.is_read && (
                      <Button size="small" onClick={() => void markAsRead(item.id)}>
                        Прочитано
                      </Button>
                    )}
                    {preferences?.calendar_enabled && (
                      <Button
                        size="small"
                        onClick={() => window.open(buildCalendarLink(item), '_blank', 'noopener,noreferrer')}
                      >
                        В календарь
                      </Button>
                    )}
                    <Button size="small" color="error" onClick={() => void deleteNotification(item.id)}>
                      Удалить
                    </Button>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', pr: 18 }}
              >
                <ListItemText
                  primary={
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: item.is_read ? 'text.secondary' : 'text.primary',
                          fontWeight: item.is_read ? 400 : 600,
                        }}
                      >
                        {item.message}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.35 }}>
                        Категория: {getCategoryName(item)}
                        {item.spent_amount != null && item.limit_amount != null
                          ? ` | ${Number(item.spent_amount).toLocaleString('ru-RU')} / ${Number(item.limit_amount).toLocaleString('ru-RU')}`
                          : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.35 }}>
                        {recommendation(item)}
                      </Typography>
                    </Box>
                  }
                  secondary={new Date(item.created_at).toLocaleString('ru-RU')}
                  primaryTypographyProps={{
                    fontSize: 13,
                    color: item.is_read ? 'text.secondary' : 'text.primary',
                    fontWeight: item.is_read ? 400 : 600,
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {notifications.length > 12 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
            <Button size="small" onClick={() => setShowAll((prev) => !prev)}>
              {showAll ? 'Скрыть историю' : `Показать историю (${notifications.length})`}
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};
