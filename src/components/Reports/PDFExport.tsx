import React from 'react';
import { Button } from '@mui/material';
import { FileText } from 'lucide-react';

interface PDFExportProps {
  onExport: () => void;
  disabled?: boolean;
}

export const PDFExport: React.FC<PDFExportProps> = ({ onExport, disabled = false }) => {
  return (
    <Button
      variant="outlined"
      color="secondary"
      startIcon={<FileText size={18} />}
      onClick={onExport}
      disabled={disabled}
      size="small"
      sx={{ minHeight: 30 }}
    >
      PDF
    </Button>
  );
};
