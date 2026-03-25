import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Paper, List, ListItem, ListItemIcon, ListItemText, Typography, Box, Divider, Button, Menu, MenuItem } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { LayoutDashboard, Receipt, RefreshCw, PieChart, Wallet, LogOut, UserCircle2, Settings, ChevronDown, TrendingUp, FileText, Target, Landmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationCenter } from '@/components/Notifications/NotificationCenter';
import { useI18n } from '@/i18n';

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ mobile = false, onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isShortViewport = useMediaQuery('(max-height:820px)');
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [accountAnchor, setAccountAnchor] = useState<null | HTMLElement>(null);
  const isCompactSidebar = !mobile && isShortViewport;

  const isAccountMenuOpen = Boolean(accountAnchor);

  const handleLogout = async () => {
    setAccountAnchor(null);
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleOpenSettings = () => {
    setAccountAnchor(null);
    navigate('/settings');
    onNavigate?.();
  };

  const handleOpenProfile = () => {
    setAccountAnchor(null);
    navigate('/profile');
    onNavigate?.();
  };

  // Navigation items definition
  const menuItems = [
    { text: t('nav.home'), Icon: LayoutDashboard, path: '/' },
    { text: t('nav.transactions'), Icon: Receipt, path: '/transactions' },
    { text: t('nav.subscriptions'), Icon: RefreshCw, path: '/subscriptions' },
    { text: t('nav.budgets'), Icon: PieChart, path: '/budgets' },
    { text: t('nav.analytics'), Icon: TrendingUp, path: '/analytics' },
    { text: t('nav.reports'), Icon: FileText, path: '/reports' },
    { text: t('nav.goals'), Icon: Target, path: '/goals' },
    { text: t('nav.banks'), Icon: Landmark, path: '/bank-integration' },
  ];

  return (
    <Paper 
      elevation={0}
      sx={{ 
        width: isCompactSidebar ? 260 : 280,
        height: mobile ? '100%' : '100dvh',
        position: mobile ? 'relative' : 'sticky', 
        top: mobile ? 'auto' : 0,
        backgroundColor: 'rgb(255, 255, 255)',
        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0
      }}
      data-cmp="Sidebar"
    >
      <Box sx={{ p: isCompactSidebar ? 2 : 3, display: 'flex', alignItems: 'center', gap: isCompactSidebar ? 1.5 : 2 }}>
        <Wallet color="rgb(33, 150, 243)" size={isCompactSidebar ? 26 : 32} />
        <Typography variant="h5" color="primary" fontWeight="bold" sx={{ fontSize: isCompactSidebar ? '1.85rem' : '2.0rem', lineHeight: 1.1 }}>
          FinTrack
        </Typography>
      </Box>
      
      <Divider sx={{ mb: isCompactSidebar ? 1 : 2 }} />

      <List sx={{ px: isCompactSidebar ? 1.5 : 2, flexGrow: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem 
              key={item.path}
              component={Link} 
              to={item.path}
              sx={{ 
                mb: isCompactSidebar ? 0.5 : 1,
                py: isCompactSidebar ? 0.45 : 0.8,
                borderRadius: 2,
                color: isActive ? 'rgb(255, 255, 255)' : 'rgb(108, 117, 125)',
                backgroundColor: isActive ? 'rgb(33, 150, 243)' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive ? 'rgb(33, 150, 243)' : 'rgba(33, 150, 243, 0.08)',
                  color: isActive ? 'rgb(255, 255, 255)' : 'rgb(33, 150, 243)',
                }
              }}
              onClick={onNavigate}
            >
              <ListItemIcon sx={{ 
                minWidth: isCompactSidebar ? 34 : 40,
                color: 'inherit'
              }}>
                <item.Icon size={isCompactSidebar ? 20 : 24} />
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ fontWeight: isActive ? 600 : 500, fontSize: isCompactSidebar ? '0.92rem' : '1rem' }} 
              />
            </ListItem>
          );
        })}
      </List>

      <Divider />

      <Box sx={{ p: isCompactSidebar ? 1.5 : 2.5, display: 'flex', flexDirection: 'column', gap: isCompactSidebar ? 1 : 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <NotificationCenter />
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ px: 0.5, fontSize: isCompactSidebar ? '0.66rem' : undefined }}>
          {user?.email || t('nav.userFallback')}
        </Typography>

        <Button
          onClick={(e) => setAccountAnchor(e.currentTarget)}
          variant={location.pathname === '/settings' || location.pathname === '/profile' ? 'contained' : 'outlined'}
          color="primary"
          startIcon={<UserCircle2 size={18} />}
          endIcon={<ChevronDown size={16} />}
          sx={{ justifyContent: 'space-between', textTransform: 'none', minHeight: isCompactSidebar ? 34 : 40, fontSize: isCompactSidebar ? '0.86rem' : '0.95rem' }}
          fullWidth
        >
          {t('nav.account')}
        </Button>

        <Menu
          anchorEl={accountAnchor}
          open={isAccountMenuOpen}
          onClose={() => setAccountAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <MenuItem onClick={handleOpenProfile}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <UserCircle2 size={16} />
              {t('nav.profile')}
            </Box>
          </MenuItem>
          <MenuItem onClick={handleOpenSettings}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Settings size={16} />
              {t('nav.settings')}
            </Box>
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <LogOut size={16} />
              {t('nav.logout')}
            </Box>
          </MenuItem>
        </Menu>

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: isCompactSidebar ? '0.66rem' : undefined }}>
          {t('nav.version')} ({language.toUpperCase()})
        </Typography>
      </Box>
    </Paper>
  );
};

export default Sidebar;
