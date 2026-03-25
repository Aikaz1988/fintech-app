import React, { useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Plus } from 'lucide-react';
import type { FinancialGoal, GoalFormData } from '@/types';
import { useGoals } from '@/hooks/useGoals';
import { GoalForm } from '@/components/Goals/GoalForm';
import { GoalsList } from '@/components/Goals/GoalsList';

const Goals: React.FC = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const isCompactMobile = useMediaQuery('(max-width:380px)');
  const { goals, loading, error, addGoal, updateGoal, deleteGoal, toggleAchieved } = useGoals();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | undefined>();
  const [formError, setFormError] = useState('');

  const handleSubmit = async (data: GoalFormData) => {
    setFormError('');

    const result = editingGoal
      ? await updateGoal(editingGoal.id, data)
      : await addGoal(data);

    if (!result.success) {
      setFormError(result.error || 'Не удалось сохранить цель');
      return;
    }

    setEditingGoal(undefined);
    setIsFormOpen(false);
  };

  return (
    <Box sx={{ p: { xs: isCompactMobile ? 1.25 : 2, sm: 3, md: 4 }, flexGrow: 1 }} data-cmp="GoalsPage">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: isCompactMobile ? 1 : 1.5, sm: 2 }, mb: { xs: isCompactMobile ? 2 : 4, sm: 4 } }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: isCompactMobile ? '1.35rem' : '1.5rem', sm: '2.5rem' }, lineHeight: 1.2 }}>Финансовые цели</Typography>
          <Typography color="text.secondary" sx={{ fontSize: { xs: isCompactMobile ? '0.82rem' : '0.9rem', sm: '1rem' } }}>Планируйте накопления и отслеживайте прогресс</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={isMobile ? 16 : 18} />}
          size={isMobile ? 'small' : 'medium'}
          sx={{ height: { xs: isCompactMobile ? 24 : 30, sm: 42 }, minHeight: { xs: isCompactMobile ? 24 : 30, sm: 42 }, px: { xs: isCompactMobile ? 0.75 : 1.5, sm: 2 }, py: { xs: 0.1, sm: 1 }, fontSize: { xs: isCompactMobile ? '0.76rem' : '0.82rem', sm: '1rem' }, lineHeight: 1 }}
          onClick={() => {
            setEditingGoal(undefined);
            setFormError('');
            setIsFormOpen(true);
          }}
        >
          Новая цель
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <GoalsList
        goals={goals}
        loading={loading}
        onEdit={(goal) => {
          setEditingGoal(goal);
          setFormError('');
          setIsFormOpen(true);
        }}
        onDelete={(id) => {
          void deleteGoal(id);
        }}
        onToggleAchieved={(goal) => {
          const achieved = !(goal.is_achieved || Number(goal.current_amount) >= Number(goal.target_amount));
          void toggleAchieved(goal.id, achieved);
        }}
      />

      <GoalForm
        open={isFormOpen}
        goal={editingGoal}
        error={formError}
        onSubmit={handleSubmit}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGoal(undefined);
        }}
      />
    </Box>
  );
};

export default Goals;
