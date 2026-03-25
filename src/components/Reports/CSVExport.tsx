import React from 'react';
import { Button } from '@mui/material';
import { FileSpreadsheet } from 'lucide-react';

interface CSVExportProps {
  onExport: () => void;
  disabled?: boolean;
}

export const CSVExport: React.FC<CSVExportProps> = ({ onExport, disabled = false }) => {
  return (
    <Button
      variant="outlined"
      color="primary"
      startIcon={<FileSpreadsheet size={18} />}
      onClick={onExport}
      disabled={disabled}
      size="small"
      sx={{ minHeight: 30 }}
    >
      CSV
    </Button>
  );
};
