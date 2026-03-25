import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, Divider, Chip } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { UserCircle2, Mail, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Profile: React.FC = () => {
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { user } = useAuth();

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="Profile">
      <Box sx={{ mb: { xs: isCompactMobile ? 2 : 4, sm: 4 } }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>Профиль</Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>Информация об аккаунте</Typography>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', maxWidth: 720 }}>
        <CardContent sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 }, mb: { xs: isCompactMobile ? 1.5 : 2.5, sm: 3 } }}>
            <Avatar sx={{ width: { xs: isCompactMobile ? 44 : 50, sm: 56 }, height: { xs: isCompactMobile ? 44 : 50, sm: 56 }, bgcolor: 'primary.main' }}>
              <UserCircle2 size={isCompactMobile ? 22 : 26} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '1.25rem' } }}>
                {user?.user_metadata?.full_name || 'Пользователь'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.74rem' : '0.8rem', sm: '0.875rem' } }}>
                ID: {user?.id || '—'}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 } }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: isCompactMobile ? 1 : 1.6, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 } }}>
              <Mail size={isCompactMobile ? 16 : 18} />
              <Typography variant="body1" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>{user?.email || 'Email не указан'}</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isCompactMobile ? 1 : 1.5, sm: 1.5 }, flexWrap: 'wrap' }}>
              <KeyRound size={isCompactMobile ? 16 : 18} />
              <Typography variant="body1" sx={{ fontSize: { xs: isCompactMobile ? '0.9rem' : '1rem', sm: '1rem' } }}>Статус email:</Typography>
              <Chip
                size="small"
                color={user?.email_confirmed_at ? 'success' : 'warning'}
                label={user?.email_confirmed_at ? 'Подтвержден' : 'Не подтвержден'}
                sx={{ minHeight: { xs: isCompactMobile ? 20 : 24, sm: 24 }, '& .MuiChip-label': { fontSize: { xs: isCompactMobile ? '0.66rem' : '0.72rem', sm: '0.75rem' }, px: { xs: isCompactMobile ? 0.5 : 0.75, sm: 1 } } }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;
