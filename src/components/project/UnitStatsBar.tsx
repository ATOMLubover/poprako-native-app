import React from "react";
import "./UnitStatsBar.css";

export type UnitStatsSummary = {
  inboxCount: number;
  outboxCount: number;
  unTranslatedCount: number;
  pendingProofCount: number;
  proovedCount: number;
};

type UnitStatsBarProps = {
  stats: UnitStatsSummary;
};

export const UnitStatsBar: React.FC<UnitStatsBarProps> = ({ stats }) => {
  const { inboxCount, outboxCount, unTranslatedCount, pendingProofCount, proovedCount } = stats;

  return (
    <div
      className="unit-stats-bar"
      aria-label={`框内 ${inboxCount} 框外 ${outboxCount} 未 ${unTranslatedCount} 翻 ${pendingProofCount} 校 ${proovedCount}`}>

      <div className="unit-stats-bar__row">
        <div className="unit-stats-bar__badge stats-badge--pink">
          <span className="unit-stats-bar__text">框内</span>
          <span className="unit-stats-bar__count">{inboxCount}</span>
        </div>
      </div>

      <div className="unit-stats-bar__row">
        <div className="unit-stats-bar__badge stats-badge--yellow">
          <span className="unit-stats-bar__text">框外</span>
          <span className="unit-stats-bar__count">{outboxCount}</span>
        </div>
      </div>

      <div className="unit-stats-bar__hdivider" />

      <div className="unit-stats-bar__row">
        <div className="unit-stats-bar__badge stats-badge--gray">
          <span className="unit-stats-bar__text">未翻</span>
          <span className="unit-stats-bar__count">{unTranslatedCount}</span>
        </div>
      </div>

      <div className="unit-stats-bar__row">
        <div className="unit-stats-bar__badge stats-badge--orange">
          <span className="unit-stats-bar__text">已翻</span>
          <span className="unit-stats-bar__count">{pendingProofCount}</span>
        </div>
      </div>

      <div className="unit-stats-bar__row">
        <div className="unit-stats-bar__badge stats-badge--green">
          <span className="unit-stats-bar__text">已校</span>
          <span className="unit-stats-bar__count">{proovedCount}</span>
        </div>
      </div>
    </div>
  );
};
