import React from 'react';
import AtsDashboard from './AtsDashboard';
import type { AtsResult } from '~/lib/atsEngine';

import type { AtsComparisonInfo } from './AtsDashboard';

interface Suggestion {
  type: "good" | "improve";
  tip: string;
}

interface ATSProps {
  score: number;
  suggestions: Suggestion[];
  atsResult?: AtsResult | null;
  comparison?: AtsComparisonInfo | null;
  onResetToOriginal?: () => void;
}

const ATS: React.FC<ATSProps> = ({
  score,
  suggestions,
  atsResult,
  comparison,
  onResetToOriginal,
}) => {
  return (
    <AtsDashboard
      score={score}
      suggestions={suggestions}
      atsResult={atsResult}
      comparison={comparison}
      onResetToOriginal={onResetToOriginal}
    />
  );
};

export default ATS;

