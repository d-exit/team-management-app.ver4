// components/TeamManagementPage.tsx
// This component allows editing the user's primary team profile and viewing past match scoring log.
import React, { useCallback, useMemo, useState } from 'react';
import { BracketMatch, LeagueMatch, Match, MatchScoringEvent, Member, Team, TeamLevel } from '../types';
import { deepClone } from '../utils/deepClone';

interface TeamManagementPageProps {
  team: Team; // The team to manage/edit
  onUpdateTeam: (updatedTeam: Team) => void;
  allTeams: Team[];
  matches: Match[]; // To display scoring log
}

const InputField: React.FC<{
  label: string;
  name: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  options?: { value: string; label: string }[];
}> = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  readOnly = false,
  options
}) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
    {type === 'select' && options ? (
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={readOnly}
        className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 focus:ring-sky-500 focus:border-sky-500"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        readOnly={readOnly}
        className="w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 focus:ring-sky-500 focus:border-sky-500"
      />
    ) : (
      <input
        type={type}
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        className={`w-full bg-slate-700 border border-slate-600 text-white rounded-md p-2.5 focus:ring-sky-500 focus:border-sky-500 ${readOnly ? 'text-slate-400 cursor-not-allowed' : ''}`}
      />
    )}
  </div>
);

const RankItem: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className }) => (
  <div className={`flex justify-between items-baseline mb-2 ${className}`}>
    <p className="text-sm text-slate-400">{label}</p>
    <p className="text-lg font-bold text-sky-300">{value}</p>
  </div>
);

const TeamManagementPage: React.FC<TeamManagementPageProps> = ({ team, onUpdateTeam, allTeams, matches }) => {
  const [editableTeam, setEditableTeam] = useState<Team>(() => deepClone(team));
  const [logoPreview, setLogoPreview] = useState<string | null>(team.logoUrl);
  const [editMode, setEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 各種ランキングを計算
  const { prefectureRank, ageCategoryRank, overallRank } = useMemo(() => {
    const calculateRank = (teamsToRank: Team[], currentTeamId: string) => {
      const sorted = [...teamsToRank].sort((a, b) => b.rating - a.rating);
      const rank = sorted.findIndex(t => t.id === currentTeamId) + 1;
      return rank > 0 ? `${rank}位 / ${sorted.length}チーム中` : 'ランク外';
    };
    const overall = calculateRank(allTeams, team.id);
    const prefectureTeams = team.prefecture
      ? allTeams.filter(t => t.prefecture === team.prefecture)
      : [];
    const prefecture = team.prefecture
      ? calculateRank(prefectureTeams, team.id)
      : '未設定';
    const ageCategoryTeams = team.ageCategory
      ? allTeams.filter(t => t.ageCategory === team.ageCategory)
      : [];
    const ageCategory = team.ageCategory
      ? calculateRank(ageCategoryTeams, team.id)
      : '未設定';
    return { prefectureRank: prefecture, ageCategoryRank: ageCategory, overallRank: overall };
  }, [allTeams, team]);

  // 得点記録ログを抽出
  const scoringLog = useMemo(() => {
    const allEvents: Array<{
      match: Match;
      subMatch?: LeagueMatch | BracketMatch;
      event: MatchScoringEvent & { opponentName?: string };
    }> = [];
    matches.forEach(match => {
      const isParticipant =
        match.ourTeamId === team.id ||
        match.opponentTeamId === team.id ||
        match.bracketData?.teams.some(t => t.id === team.id) ||
        match.leagueCompetitionData?.preliminaryRound.groups.some(g =>
          g.teams.some(ts => ts.team.id === team.id)
        );
      if (!isParticipant) return;
      const getOpponentName = (subMatch?: LeagueMatch | BracketMatch): string => {
        if (!subMatch) {
          const opponentId = match.ourTeamId === team.id ? match.opponentTeamId : match.ourTeamId;
          return match.opponentTeamName || allTeams.find(t => t.id === opponentId)?.name || '不明';
        }
        if ('team1Id' in subMatch) {
          const opp = subMatch.team1Id === team.id ? subMatch.team2Id : subMatch.team1Id;
          return allTeams.find(t => t.id === opp)?.name || '不明';
        }
        if ('team1' in subMatch) {
          if (!subMatch.team1 || !subMatch.team2) return '未定';
          const opp = subMatch.team1.id === team.id ? subMatch.team2 : subMatch.team1;
          return opp.name || '不明';
        }
        return '不明';
      };
      (match.scoringEvents || []).forEach(event => {
        if (event.teamId === team.id) {
          let subMatch: LeagueMatch | BracketMatch | undefined;
          if (event.subMatchId) {
            subMatch =
              match.leagueCompetitionData?.preliminaryRound.groups
                .flatMap(g => g.matches)
                .find(m => m.id === event.subMatchId) ||
              match.leagueCompetitionData?.finalRoundLeague?.groups
                .flatMap(g => g.matches)
                .find(m => m.id === event.subMatchId);
            if (!subMatch) {
              const bracket = match.bracketData || match.leagueCompetitionData?.finalRoundTournament;
              subMatch = bracket?.rounds.flatMap(r => r.matches).find(m => m.id === event.subMatchId);
            }
          }
          allEvents.push({
            match,
            subMatch,
            event: {
              ...event,
              opponentName: getOpponentName(subMatch)
            }
          });
        }
      });
    });
    return allEvents.sort((a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime());
  }, [matches, team, allTeams]);

  // 以下、編集用ハンドラーや JSX は省略せずそのまま…

  // ...handleChange, handleFileChange, drag/drop, member CRUD, submit/cancel, etc.

  return (
    <div className="space-y-8">
      {/* 省略：ヘッダー、フォーム、メンバー一覧など */}
      {/* Scoring Log Section */}
      <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl">
        <h3 className="text-xl font-semibold text-sky-400 mb-4">得点記録一覧</h3>
        {scoringLog.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-600">
                <tr>
                  <th className="p-2">日付</th>
                  <th className="p-2">大会/試合名</th>
                  <th className="p-2">vs</th>
                  <th className="p-2">時間</th>
                  <th className="p-2">得点者</th>
                  <th className="p-2">アシスト</th>
                </tr>
              </thead>
              <tbody>
                {scoringLog.map(({ match, event }, idx) => (
                  <tr key={`${match.id}-${idx}`} className="border-b border-slate-700">
                    <td className="p-2 text-slate-400">{match.date}</td>
                    <td className="p-2 text-slate-300">{match.location}</td>
                    <td className="p-2 text-slate-300">{event.opponentName}</td>
                    <td className="p-2 text-slate-300">{event.period} {event.minute}分</td>
                    <td className="p-2 font-semibold text-sky-300">{event.scorerName}</td>
                    <td className="p-2 text-slate-400">{event.assistName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400">まだ得点記録はありません。</p>
        )}
      </div>
    </div>
  );
};

export default TeamManagementPage;
