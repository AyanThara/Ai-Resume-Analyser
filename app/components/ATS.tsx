import React from 'react';
import AtsDashboard from './AtsDashboard';
import type { AtsResult } from '~/lib/atsEngine';

interface Suggestion {
  type: "good" | "improve";
  tip: string;
}

interface ATSProps {
  score: number;
  suggestions: Suggestion[];
  atsResult?: AtsResult | null;
}

const ATS: React.FC<ATSProps> = ({ score, suggestions, atsResult }) => {
  return (
    <AtsDashboard
      score={score}
      suggestions={suggestions}
      atsResult={atsResult}
    />
  );
};

export default ATS;

