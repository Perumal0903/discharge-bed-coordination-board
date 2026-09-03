import React from 'react';
import { KPICards } from '../components/KPICards.jsx';
import { NextSafeBedCard } from '../components/NextSafeBedCard.jsx';
import { BedStatusBoard } from '../components/BedStatusBoard.jsx';
import { DischargeReadinessBoard } from '../components/DischargeReadinessBoard.jsx';
import { DemoBanner } from '../components/DemoBanner.jsx';

export const CoordinatorDashboard = ({
  data = {},
  onRefresh,
  onSelectBed,
  onSelectPatient,
  onStartCleaning,
  onCompleteCleaning,
  onDischargePatient,
  onMarkReady,
  onToggleBlock,
  onSimulateStale,
  onCreateDischargeOrder,
  onAllocateBed
}) => {
  return (
    <div className="space-y-6">
      {/* Interactive Demo Banner */}
      <DemoBanner onScenarioCompleted={onRefresh} />

      {/* Next Safe Bed Highlight Card */}
      <NextSafeBedCard 
        nextSafeBed={data.nextSafeBed} 
        onAllocate={onAllocateBed}
      />

      {/* KPI Cards */}
      <KPICards kpis={data.kpis} />

      {/* Bed Turnover Board */}
      <BedStatusBoard
        beds={data.beds || []}
        onSelectBed={onSelectBed}
        onSelectPatient={onSelectPatient}
        onStartCleaning={onStartCleaning}
        onCompleteCleaning={onCompleteCleaning}
        onDischargePatient={onDischargePatient}
        onMarkReady={onMarkReady}
        onToggleBlock={onToggleBlock}
        onSimulateStale={onSimulateStale}
      />

      {/* Patient Discharge Readiness Board */}
      <DischargeReadinessBoard
        patients={data.patients || []}
        onSelectPatient={onSelectPatient}
        onCreateDischargeOrder={onCreateDischargeOrder}
      />
    </div>
  );
};
