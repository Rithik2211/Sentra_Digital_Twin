import React, { useEffect, useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import { useStore } from '../store';
import { Brain, Loader2, CheckCircle2, Zap } from 'lucide-react';

const GET_SUPERVISOR_BRIEFING = gql`
  query GetSupervisorBriefing($runId: ID!, $scenario: String!) {
    supervisorBriefing(runId: $runId, scenario: $scenario) {
      runId
      scenario
      briefing
      cached
    }
  }
`;

export const BriefingPanel: React.FC = () => {
  const activeRunId = useStore((state) => state.activeRunId);
  const selectedScenario = useStore((state) => state.selectedScenario);
  const isRunning = useStore((state) => state.isRunning);
  const briefingText = useStore((state) => state.briefing);
  const setBriefingText = useStore((state) => state.setBriefing);
  
  const [typedText, setTypedText] = useState('');
  const [isCached, setIsCached] = useState(false);

  const [fetchBriefing, { loading, data }] = useLazyQuery(GET_SUPERVISOR_BRIEFING, {
    fetchPolicy: 'network-only'
  });

  // Query briefing when simulation starts or scenario changes
  useEffect(() => {
    if (isRunning && activeRunId) {
      fetchBriefing({
        variables: {
          runId: activeRunId,
          scenario: selectedScenario
        }
      });
    } else {
      setTypedText('');
      setBriefingText('');
    }
  }, [isRunning, activeRunId, selectedScenario, fetchBriefing, setBriefingText]);

  // Sync state when data returns
  useEffect(() => {
    if (data?.supervisorBriefing) {
      const fullText = data.supervisorBriefing.briefing;
      setBriefingText(fullText);
      setIsCached(data.supervisorBriefing.cached);
      
      // Typing effect
      let i = 0;
      setTypedText('');
      const interval = setInterval(() => {
        setTypedText((prev) => prev + fullText.charAt(i));
        i++;
        if (i >= fullText.length) {
          clearInterval(interval);
        }
      }, 5); // Typing speed
      
      return () => clearInterval(interval);
    }
  }, [data, setBriefingText]);

  // Custom regex markdown formatter
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Check Headers
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-sm font-bold text-gray-800 mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={idx} className="text-xs font-bold text-gray-700 mt-3 mb-1.5">{line.replace('#### ', '')}</h4>;
      }
      
      // Check bullet items
      if (line.trim().startsWith('- ')) {
        const itemContent = line.trim().replace('- ', '');
        return (
          <li key={idx} className="text-[11px] text-gray-600 ml-4 list-disc mb-1 leading-relaxed">
            {formatBoldAndCode(itemContent)}
          </li>
        );
      }
      
      // Check numbered items
      if (/^\d+\.\s/.test(line.trim())) {
        const itemContent = line.trim().replace(/^\d+\.\s/, '');
        const number = line.match(/^\d+/)![0];
        return (
          <div key={idx} className="flex space-x-2 text-[11px] text-gray-600 mb-1 leading-relaxed ml-2">
            <span className="font-bold text-coral">{number}.</span>
            <span>{formatBoldAndCode(itemContent)}</span>
          </div>
        );
      }

      // Standard text line
      if (line.trim() === '') return <div key={idx} className="h-2" />;
      return <p key={idx} className="text-[11px] text-gray-600 mb-2 leading-relaxed">{formatBoldAndCode(line)}</p>;
    });
  };

  // Format bold text **word** and inline code `code`
  const formatBoldAndCode = (lineStr: string) => {
    // Regex for bold and code
    const parts = lineStr.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-gray-100 text-coral font-mono text-[10px] px-1 py-0.5 rounded border border-gray-200">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="bg-panel-bg flex flex-col h-full overflow-hidden select-none p-5">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-coral shrink-0" />
          <h2 className="text-sm font-bold text-industrial-black uppercase tracking-wider">
            AI Supervisor Briefing
          </h2>
        </div>
        
        {data && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 border ${
            isCached 
              ? 'bg-blue-50 text-blue-600 border-blue-200' 
              : 'bg-green-50 text-green-600 border-green-200'
          }`}>
            {isCached ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-3 h-3 animate-pulse" />}
            <span>{isCached ? 'CACHED (REDIS)' : 'LIVE COGNITIVE GENERATION'}</span>
          </span>
        )}
      </div>

      <div className="flex-1 bg-panel-surface border border-panel-border rounded-lg p-4 overflow-y-auto font-sans">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <Loader2 className="w-8 h-8 text-coral animate-spin" />
            <p className="text-xs text-gray-500 font-semibold animate-pulse">
              Synthesizing sensor telemetry & scenarios...
            </p>
          </div>
        ) : briefingText ? (
          <div className="prose max-w-none text-left">
            {renderFormattedText(typedText || briefingText)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-gray-200 rounded-lg">
            <Brain className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[200px]">
              Awaiting safety twin run. Start a scenario to receive an automated operations brief.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
