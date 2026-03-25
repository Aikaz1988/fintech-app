import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { CheckCheck } from 'lucide-react';
import * as analyticsService from '@/services/analytics.service';
import type { Recommendation } from '@/types';

interface RecommendationsListProps {
  userId: string;
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({ userId }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    const data = await analyticsService.getRecommendations(userId);
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadItems();
  }, [userId]);

  const markAsRead = async (id: string) => {
    await analyticsService.markRecommendationAsRead(id, userId);
    await loadItems();
  };

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', p: { xs: isCompactMobile ? 1.25 : 2, sm: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: isCompactMobile ? 1.25 : 2, sm: 2 } }}>
        <Typography variant="h6" sx={{ fontSize: { xs: isCompactMobile ? '1.30rem' : '1.5rem', sm: '1.25rem' } }}>Рекомендации</Typography>
        <Chip label={loading ? 'Загрузка...' : `${items.length} шт.`} size="small" />
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Рекомендации пока отсутствуют</Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {items.map((item) => (
            <ListItem
              key={item.id}
              divider
              secondaryAction={
                !item.is_read ? (
                  <IconButton edge="end" onClick={() => void markAsRead(item.id)}>
                    <CheckCheck size={16} />
                  </IconButton>
                ) : null
              }
            >
              <ListItemText
                primary={item.recommendation_text}
                secondary={item.category ? `Категория: ${item.category}` : 'Общая рекомендация'}
                primaryTypographyProps={{ fontSize: isCompactMobile ? '0.88rem' : isMobile ? '0.95rem' : '1rem' }}
                secondaryTypographyProps={{ fontSize: isCompactMobile ? '0.76rem' : isMobile ? '0.82rem' : '0.875rem' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};
